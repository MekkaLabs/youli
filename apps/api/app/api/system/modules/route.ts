import { NextResponse } from 'next/server';
import { readDb, writeDb } from '../../../../src/repositories/local-db';

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
  const db = readDb();
  const activeModules =
    Array.isArray(db.profile.activeModules) && db.profile.activeModules.length > 0
      ? db.profile.activeModules
      : DEFAULT_MODULES;
  return NextResponse.json({ activeModules });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { activeModules?: string[] };
  const db = readDb();
  db.profile.activeModules = Array.isArray(body.activeModules) ? body.activeModules : db.profile.activeModules || [];
  writeDb(db);
  return NextResponse.json({ activeModules: db.profile.activeModules });
}
