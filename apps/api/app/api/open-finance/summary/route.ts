import { NextResponse } from 'next/server';
import { getOpenFinanceProvider, getOpenFinanceSummary } from '../../../../src/services/open-finance';

export async function GET() {
  const summary = await getOpenFinanceSummary('u1');
  return NextResponse.json({ provider: getOpenFinanceProvider(), summary });
}
