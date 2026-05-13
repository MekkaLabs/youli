import { createOpenFinanceAdapter } from '@youli/integrations';

const provider = (process.env.OPEN_FINANCE_PROVIDER || 'mock') as 'mock' | 'pluggy' | 'belvo';
const adapter = createOpenFinanceAdapter(provider);

export function getOpenFinanceProvider() {
  return provider;
}

export async function connectOpenFinance(institutionCode: string) {
  return adapter.connectInstitution(institutionCode);
}

export async function getOpenFinanceSummary(userId: string) {
  return adapter.getSummary(userId);
}

export async function getOpenFinanceAccounts(userId: string) {
  return adapter.getAccounts(userId);
}

export async function getOpenFinanceTransactions(userId: string) {
  return adapter.getTransactions(userId);
}
