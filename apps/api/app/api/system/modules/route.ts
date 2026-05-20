import { NextResponse } from 'next/server';
import { readDb, writeDb } from '../../../../src/repositories/local-db';
import { requireAuth } from '@/lib/http';

const DEFAULT_MODULES = [
  'overview',
  'tarefas',
  'metas',
  'habitos',
  'calendario',
  'insights',
  'fitness',
  'financeiro',
  'perfil',
  'memoria',
  'orquestracao'
];

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const db = readDb(auth.user.id);
  const activeModules =
    Array.isArray(db.profile.activeModules) && db.profile.activeModules.length > 0
      ? db.profile.activeModules
      : DEFAULT_MODULES;
  return NextResponse.json({ activeModules });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = (await req.json().catch(() => ({}))) as { activeModules?: string[] };
  const db = readDb(auth.user.id);
  db.profile.activeModules = Array.isArray(body.activeModules) ? body.activeModules : db.profile.activeModules || [];
  writeDb(auth.user.id, db);
  return NextResponse.json({ activeModules: db.profile.activeModules });
}
