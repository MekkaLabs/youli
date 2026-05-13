import type {
  CalendarEvent,
  FinancialAccount,
  FinancialSummary,
  FinancialTransaction,
  FitnessActivity,
  OpenFinanceConnection
} from '@youli/shared';

export interface CalendarAdapter {
  getTodayEvents(userId: string): Promise<CalendarEvent[]>;
}

export class MockCalendarAdapter implements CalendarAdapter {
  async getTodayEvents(_userId: string): Promise<CalendarEvent[]> {
    const now = new Date();
    return [
      { id: 'cal-1', source: 'mock', title: 'Deep Work', startsAt: now.toISOString(), endsAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString() }
    ];
  }
}

export interface FitnessAdapter {
  getRecentActivities(userId: string): Promise<FitnessActivity[]>;
}

export class MockStravaAdapter implements FitnessAdapter {
  async getRecentActivities(_userId: string): Promise<FitnessActivity[]> {
    return [
      { id: 'fit-1', source: 'mock', type: 'Run', durationMin: 42, intensity: 'high', startedAt: new Date(Date.now() - 86_400_000).toISOString() }
    ];
  }
}

export interface OpenFinanceAdapter {
  connectInstitution(institutionCode: string): Promise<OpenFinanceConnection>;
  getAccounts(userId: string): Promise<FinancialAccount[]>;
  getTransactions(userId: string): Promise<FinancialTransaction[]>;
  getSummary(userId: string): Promise<FinancialSummary>;
}

export type OpenFinanceProvider = 'mock' | 'pluggy' | 'belvo';

export class MockOpenFinanceAdapter implements OpenFinanceAdapter {
  async connectInstitution(_institutionCode: string): Promise<OpenFinanceConnection> {
    return {
      id: 'of-conn-1',
      provider: 'mock',
      status: 'connected',
      consentExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    };
  }

  async getAccounts(_userId: string): Promise<FinancialAccount[]> {
    return [
      { id: 'acc-1', institution: 'Nubank', type: 'checking', balance: 8420.5, currency: 'BRL', lastUpdatedAt: new Date().toISOString() },
      { id: 'acc-2', institution: 'Itaú', type: 'savings', balance: 12500, currency: 'BRL', lastUpdatedAt: new Date().toISOString() },
      { id: 'acc-3', institution: 'Inter', type: 'credit', balance: -2100.25, currency: 'BRL', lastUpdatedAt: new Date().toISOString() }
    ];
  }

  async getTransactions(_userId: string): Promise<FinancialTransaction[]> {
    return [
      { id: 'tx-1', accountId: 'acc-1', description: 'Supermercado', amount: -320.4, category: 'Alimentação', occurredAt: new Date().toISOString() },
      { id: 'tx-2', accountId: 'acc-1', description: 'Salário', amount: 9500, category: 'Renda', occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
      { id: 'tx-3', accountId: 'acc-2', description: 'Investimento automático', amount: -1000, category: 'Investimentos', occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() }
    ];
  }

  async getSummary(userId: string): Promise<FinancialSummary> {
    const accounts = await this.getAccounts(userId);
    const tx = await this.getTransactions(userId);
    const monthlyIncome = tx.filter((x) => x.amount > 0).reduce((a, b) => a + b.amount, 0);
    const monthlyExpenses = tx.filter((x) => x.amount < 0).reduce((a, b) => a + Math.abs(b.amount), 0);
    const creditUsed = Math.abs(accounts.filter((a) => a.type === 'credit').reduce((acc, cur) => acc + Math.min(cur.balance, 0), 0));
    const totalBalance = accounts.reduce((acc, cur) => acc + cur.balance, 0);

    return { totalBalance, monthlyIncome, monthlyExpenses, creditUsed, accounts };
  }
}

export class PluggyOpenFinanceAdapter implements OpenFinanceAdapter {
  constructor(private readonly clientId: string, private readonly clientSecret: string) {}

  async connectInstitution(institutionCode: string): Promise<OpenFinanceConnection> {
    // TODO: Implementar fluxo real Pluggy Connect Token + Item OAuth.
    return {
      id: `pluggy-${institutionCode}-${Date.now()}`,
      provider: 'mock',
      status: 'pending',
      consentExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
  }

  async getAccounts(userId: string): Promise<FinancialAccount[]> {
    return new MockOpenFinanceAdapter().getAccounts(userId);
  }

  async getTransactions(userId: string): Promise<FinancialTransaction[]> {
    return new MockOpenFinanceAdapter().getTransactions(userId);
  }

  async getSummary(userId: string): Promise<FinancialSummary> {
    return new MockOpenFinanceAdapter().getSummary(userId);
  }
}

export class BelvoOpenFinanceAdapter implements OpenFinanceAdapter {
  constructor(private readonly secretId: string, private readonly secretPassword: string) {}

  async connectInstitution(institutionCode: string): Promise<OpenFinanceConnection> {
    // TODO: Implementar fluxo real Belvo Widget/Link + consentimento.
    return {
      id: `belvo-${institutionCode}-${Date.now()}`,
      provider: 'mock',
      status: 'pending',
      consentExpiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
  }

  async getAccounts(userId: string): Promise<FinancialAccount[]> {
    return new MockOpenFinanceAdapter().getAccounts(userId);
  }

  async getTransactions(userId: string): Promise<FinancialTransaction[]> {
    return new MockOpenFinanceAdapter().getTransactions(userId);
  }

  async getSummary(userId: string): Promise<FinancialSummary> {
    return new MockOpenFinanceAdapter().getSummary(userId);
  }
}

export function createOpenFinanceAdapter(provider: OpenFinanceProvider): OpenFinanceAdapter {
  if (provider === 'pluggy') {
    const clientId = process.env.PLUGGY_CLIENT_ID;
    const clientSecret = process.env.PLUGGY_CLIENT_SECRET;
    if (clientId && clientSecret) {
      return new PluggyOpenFinanceAdapter(clientId, clientSecret);
    }
  }

  if (provider === 'belvo') {
    const secretId = process.env.BELVO_SECRET_ID;
    const secretPassword = process.env.BELVO_SECRET_PASSWORD;
    if (secretId && secretPassword) {
      return new BelvoOpenFinanceAdapter(secretId, secretPassword);
    }
  }

  return new MockOpenFinanceAdapter();
}
