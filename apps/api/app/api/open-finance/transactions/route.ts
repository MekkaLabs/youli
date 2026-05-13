import { NextResponse } from 'next/server';
import { getOpenFinanceTransactions } from '../../../../src/services/open-finance';

export async function GET() {
  const transactions = await getOpenFinanceTransactions('u1');
  return NextResponse.json(transactions);
}
