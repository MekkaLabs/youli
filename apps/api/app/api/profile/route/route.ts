import { NextResponse } from 'next/server';
import type { UserProfile } from '@youli/shared';
import { readDb, writeDb } from '../../../../src/repositories/local-db';

export async function GET() {
  return NextResponse.json(readDb().profile);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<UserProfile>;
  const db = readDb();
  db.profile = { ...db.profile, ...body };
  writeDb(db);
  return NextResponse.json(db.profile);
}
