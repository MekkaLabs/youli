import { NextResponse } from 'next/server';
import { readDb } from '../../../../src/repositories/local-db';

export async function GET() {
  return NextResponse.json(readDb().connections);
}
