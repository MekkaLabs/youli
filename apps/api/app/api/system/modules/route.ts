import { NextResponse } from 'next/server';
import { readDb, writeDb } from '../../../../src/repositories/local-db';

export async function GET() {
  const db = readDb();
  return NextResponse.json({ activeModules: db.profile.activeModules || [] });
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { activeModules?: string[] };
  const db = readDb();
  db.profile.activeModules = Array.isArray(body.activeModules) ? body.activeModules : db.profile.activeModules || [];
  writeDb(db);
  return NextResponse.json({ activeModules: db.profile.activeModules });
}
