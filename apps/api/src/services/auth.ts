import { cookies } from 'next/headers';
import { readDb } from '../repositories/local-db';

const COOKIE_NAME = 'youli_session';

export async function validateCredentials(email: string, password: string) {
  const db = readDb();
  const ok = db.profile.email === email && db.profile.provisionalPassword === password;
  return ok ? { id: db.profile.id, name: db.profile.name, role: db.profile.role } : null;
}

export function getSessionCookieName() {
  return COOKIE_NAME;
}

export async function getCurrentUserFromCookie() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const [userId, role] = token.split(':');
  if (!userId) return null;

  const db = readDb();
  if (db.profile.id !== userId) return null;

  return { id: db.profile.id, name: db.profile.name, email: db.profile.email, role: role || db.profile.role };
}
