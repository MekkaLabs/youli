import { NextResponse } from 'next/server';
import { getOpenFinanceAccounts } from '../../../../src/services/open-finance';

export async function GET() {
  const accounts = await getOpenFinanceAccounts('u1');
  return NextResponse.json(accounts);
}
