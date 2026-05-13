import { NextResponse } from 'next/server';
import { connectOpenFinance } from '../../../../src/services/open-finance';

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { institutionCode?: string };
  const connection = await connectOpenFinance(body.institutionCode || 'mock-bank');
  return NextResponse.json(connection);
}
