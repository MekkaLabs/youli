import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';

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

export async function getCurrentUserFromCookie(): Promise<AuthUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [userId] = token.split(':');
  if (!userId) return null;

  const users = readUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  const { password: _p, ...safeUser } = user;
  return safeUser;
}

export async function createUser(data: {
  name: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
}): Promise<AuthUser | { error: string }> {
  const users = readUsers();
  const exists = users.find((u) => u.email.toLowerCase() === data.email.toLowerCase());
  if (exists) return { error: 'Email já cadastrado.' };

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: data.name,
    email: data.email,
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
  users[idx] = { ...users[idx], ...updates };
  writeUsers(users);
  const { password: _p, ...safeUser } = users[idx];
  return safeUser;
}

export async function deleteUser(userId: string): Promise<boolean> {
  const users = readUsers();
  const filtered = users.filter((u) => u.id !== userId);
  if (filtered.length === users.length) return false;
  writeUsers(filtered);
  return true;
}
