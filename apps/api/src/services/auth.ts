import fs from 'node:fs';
import path from 'node:path';
import { cookies, headers } from 'next/headers';

const COOKIE_NAME = 'youli_session';
const USERS_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'users.json');

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

function readUsers(): StoredUser[] {
  if (!fs.existsSync(USERS_PATH)) {
    const defaults: StoredUser[] = [
      {
        id: 'user-gusta-001',
        name: 'Gustavo Vicente',
        email: 'gustav0.v1c3nt3@gmail.com',
        password: 'youli2024',
        role: 'admin',
        avatar: null,
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'user-amiga-002',
        name: 'Convidada',
        email: 'amiga@youli.app',
        password: 'youli2024',
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
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!user) return null;
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

  const [userId] = token.split(':');
  if (!userId) return null;

  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

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
    password: data.password,
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
  if (cleaned.password === '') delete cleaned.password;
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
