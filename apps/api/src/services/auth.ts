import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { cookies, headers } from 'next/headers';

const COOKIE_NAME = 'youli_session';
const USERS_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'users.json');

/** TTL da sessão (30 dias) em segundos. */
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  avatar?: string | null;
  createdAt: string;
}

interface StoredUser extends AuthUser {
  password: string;
}

// ──────────────────────────────────────────────
// SEGREDO DE SESSÃO
// ──────────────────────────────────────────────

/**
 * Segredo usado para assinar tokens (HMAC) e derivar nada além disso.
 * Em produção é OBRIGATÓRIO definir YOULI_SESSION_SECRET. Em dev caímos
 * num default inseguro com aviso, para não travar o fluxo local.
 */
function getSessionSecret(): string {
  const fromEnv = process.env.YOULI_SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('YOULI_SESSION_SECRET ausente ou curto demais em produção.');
  }
  // eslint-disable-next-line no-console
  console.warn('[auth] YOULI_SESSION_SECRET não definido — usando segredo de DEV (inseguro).');
  return 'youli-dev-insecure-session-secret-change-me';
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

// ──────────────────────────────────────────────
// HASH DE SENHA (scrypt, sem deps externas)
// ──────────────────────────────────────────────

const HASH_PREFIX = 'scrypt$';

export function hashPassword(plain: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(plain, salt, 64);
  return `${HASH_PREFIX}${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Verifica a senha. Suporta o formato legado (texto plano) para não quebrar
 * os usuários já gravados — nesse caso o caller pode fazer upgrade no login.
 */
export function verifyPassword(plain: string, stored: string): boolean {
  if (stored.startsWith(HASH_PREFIX)) {
    const [, saltHex, hashHex] = stored.split('$');
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(plain, salt, expected.length);
    return derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
  }
  // Legado: comparação de texto plano em tempo constante.
  const a = Buffer.from(plain);
  const b = Buffer.from(stored);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function isLegacyPlaintext(stored: string): boolean {
  return !stored.startsWith(HASH_PREFIX);
}

// ──────────────────────────────────────────────
// TOKEN DE SESSÃO ASSINADO (HMAC-SHA256)
// ──────────────────────────────────────────────

interface SessionPayload {
  sub: string;            // userId
  role: 'admin' | 'user';
  iat: number;            // issued-at (epoch s)
  exp: number;            // expiração (epoch s)
}

function hmac(data: string): string {
  return crypto.createHmac('sha256', getSessionSecret()).update(data).digest('base64url');
}

/** Cria um token assinado `<payloadB64>.<sig>` para o usuário. */
export function signSession(user: Pick<AuthUser, 'id' | 'role'>): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: SessionPayload = {
    sub: user.id,
    role: user.role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${hmac(payloadB64)}`;
}

/** Verifica assinatura + expiração. Retorna o payload ou null. */
export function verifySession(token: string): SessionPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  if (!payloadB64 || !sig) return null;

  const expectedSig = hmac(payloadB64);
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.sub) return null;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getSessionTtlSeconds(): number {
  return SESSION_TTL_SECONDS;
}

function readUsers(): StoredUser[] {
  if (!fs.existsSync(USERS_PATH)) {
    const defaults: StoredUser[] = [
      {
        id: 'user-gusta-001',
        name: 'Gustavo Vicente',
        email: 'gustav0.v1c3nt3@gmail.com',
        password: hashPassword('youli2024'),
        role: 'admin',
        avatar: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'user-amiga-002',
        name: 'Convidada',
        email: 'amiga@youli.app',
        password: hashPassword('youli2024'),
        role: 'user',
        avatar: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    fs.mkdirSync(path.dirname(USERS_PATH), { recursive: true });
    fs.writeFileSync(USERS_PATH, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8')) as StoredUser[];
}

function writeUsers(users: StoredUser[]) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

export function getAllUsers(): AuthUser[] {
  return readUsers().map(({ password: _p, ...u }) => u);
}

export async function validateCredentials(email: string, password: string): Promise<AuthUser | null> {
  const users = readUsers();
  const idx = users.findIndex((u) => u.email.toLowerCase() === email.toLowerCase());
  if (idx === -1) return null;

  const user = users[idx];
  if (!verifyPassword(password, user.password)) return null;

  // Upgrade transparente: se a senha estava em texto plano (legado), rehasheia.
  if (isLegacyPlaintext(user.password)) {
    users[idx] = { ...user, password: hashPassword(password) };
    writeUsers(users);
  }

  const { password: _p, ...safeUser } = user;
  return safeUser;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

/**
 * Resolve o token de sessão da request, aceitando DOIS transportes:
 *  1. Cookie `youli_session` (browser, web — enviado automaticamente)
 *  2. Header `Authorization: Bearer <userId:role>` (mobile/React Native)
 *
 * O mobile guarda o token no AsyncStorage e o envia via Bearer; sem este
 * fallback, dependeríamos do cookie-jar nativo do iOS (frágil). Em ambos
 * os casos o token tem o mesmo formato: `<userId>:<role>`.
 */
async function resolveSessionToken(): Promise<string | null> {
  // 1) Cookie
  const jar = await cookies();
  const cookieToken = jar.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  // 2) Authorization: Bearer
  const hdrs = await headers();
  const authz = hdrs.get('authorization');
  if (authz && /^bearer\s+/i.test(authz)) {
    const token = authz.replace(/^bearer\s+/i, '').trim();
    if (token) return token;
  }

  return null;
}

/**
 * Retorna o usuário autenticado (cookie OU Bearer). Nome mantido por
 * compatibilidade com os imports existentes, mas agora não depende só do cookie.
 */
export async function getCurrentUserFromCookie(): Promise<AuthUser | null> {
  const token = await resolveSessionToken();
  if (!token) return null;

  const payload = verifySession(token);
  if (!payload) return null;

  const users = readUsers();
  const user = users.find((u) => u.id === payload.sub);
  if (!user) return null;

  // A role de autorização vem SEMPRE do store (fonte de verdade), nunca do token.
  const { password: _p, ...safeUser } = user;
  return safeUser;
}

/** Alias semântico — preferir este nome em código novo. */
export const getCurrentUser = getCurrentUserFromCookie;

export const MIN_PASSWORD_LENGTH = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Conta quantos usuários têm role 'admin'. */
export function countAdmins(): number {
  return readUsers().filter((u) => u.role === 'admin').length;
}

function validateEmail(email: string): string | null {
  if (!EMAIL_REGEX.test(email)) return 'Email inválido.';
  return null;
}

function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH} caracteres.`;
  }
  return null;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}): Promise<AuthUser | { error: string }> {
  const name = data.name?.trim() ?? '';
  const email = data.email?.trim() ?? '';
  if (!name) return { error: 'Nome é obrigatório.' };
  const emailErr = validateEmail(email);
  if (emailErr) return { error: emailErr };
  const passErr = validatePassword(data.password ?? '');
  if (passErr) return { error: passErr };

  const users = readUsers();
  const exists = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return { error: 'Email já cadastrado.' };

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name,
    email,
    password: hashPassword(data.password),
    role: data.role || 'user',
    avatar: null,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);

  const { password: _p, ...safeUser } = newUser;
  return safeUser;
}

export async function updateUser(
  userId: string,
  updates: Partial<Pick<StoredUser, 'name' | 'email' | 'password' | 'role' | 'avatar'>>
): Promise<AuthUser | { error: string }> {
  const users = readUsers();
  const idx = users.findIndex((u) => u.id === userId);
  if (idx === -1) return { error: 'Usuário não encontrado.' };

  // Validações de campo
  if (updates.email !== undefined) {
    const emailErr = validateEmail(updates.email.trim());
    if (emailErr) return { error: emailErr };
    const dup = users.find(
      (u) => u.id !== userId && u.email.toLowerCase() === updates.email!.trim().toLowerCase(),
    );
    if (dup) return { error: 'Email já cadastrado por outro usuário.' };
  }
  // Senha só validada se foi fornecida (vazia = manter atual)
  if (updates.password !== undefined && updates.password !== '') {
    const passErr = validatePassword(updates.password);
    if (passErr) return { error: passErr };
  }

  // Proteção: não permitir rebaixar o ÚLTIMO admin para 'user'
  if (updates.role === 'user' && users[idx].role === 'admin' && countAdmins() <= 1) {
    return { error: 'Não é possível rebaixar o último admin do sistema.' };
  }

  // Aplica updates (ignora password vazio para não apagar a atual)
  const cleaned: typeof updates = { ...updates };
  if (cleaned.password === '' || cleaned.password === undefined) {
    delete cleaned.password;
  } else {
    cleaned.password = hashPassword(cleaned.password);
  }
  if (cleaned.name !== undefined) cleaned.name = cleaned.name.trim();
  if (cleaned.email !== undefined) cleaned.email = cleaned.email.trim();

  users[idx] = { ...users[idx], ...cleaned };
  writeUsers(users);
  const { password: _p, ...safeUser } = users[idx];
  return safeUser;
}

export async function deleteUser(userId: string): Promise<boolean | { error: string }> {
  const users = readUsers();
  const target = users.find((u) => u.id === userId);
  if (!target) return false;

  // Proteção: não permitir deletar o último admin
  if (target.role === 'admin' && countAdmins() <= 1) {
    return { error: 'Não é possível remover o último admin do sistema.' };
  }

  const filtered = users.filter((u) => u.id !== userId);
  writeUsers(filtered);
  return true;
}
