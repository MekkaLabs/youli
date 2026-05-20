import { NextResponse } from 'next/server';
import { readDb } from '../../../../src/repositories/local-db';
import { requireAuth } from '@/lib/http';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  return NextResponse.json(readDb(auth.user.id).connections);
}
