import { NextResponse } from 'next/server';
import { readDb, resetDb } from '../../../../src/repositories/local-db';

export async function GET() {
  return NextResponse.json(readDb());
}

export async function POST() {
  return NextResponse.json(resetDb());
}
