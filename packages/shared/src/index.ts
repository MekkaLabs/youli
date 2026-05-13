export type EnergyLevel = 'low' | 'medium' | 'high';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role?: string;
  age?: number;
  avatarUrl?: string;
  provisionalPassword?: string;
  timezone: string;
  objectives: string[];
  routine: string[];
  preferences: string[];
  projects: string[];
  lifeAreas: string[];
  behaviorPatterns: string[];
  energyProfile: EnergyLevel;
  persistentContext: string[];
  integrations?: {
    strava: 'connected' | 'disconnected';
    openFinance: 'connected' | 'disconnected';
    calendar: 'connected' | 'disconnected';
    nativeCalendar: 'connected' | 'disconnected';
  };
  activeModules?: string[];
}

export interface LifeArea { id: string; userId: string; name: string; description?: string; }
export interface Vision { id: string; userId: string; title: string; description: string; }
export interface Objective { id: string; visionId: string; title: string; status: 'active' | 'paused' | 'done'; }
export interface Goal { id: string; objectiveId: string; title: string; dueDate?: string; progress: number; }
export interface Task { id: string; goalId?: string; objectiveId?: string; habitId?: string; title: string; nextStep?: string; status: 'todo' | 'doing' | 'done'; priority: 1 | 2 | 3 | 4 | 5; }
export interface Habit { id: string; goalId?: string; title: string; frequency: 'daily' | 'weekly'; streak: number; }
export interface CalendarEvent { id: string; source: 'google' | 'apple' | 'native' | 'mock'; title: string; startsAt: string; endsAt: string; }
export interface FitnessActivity { id: string; source: 'strava' | 'mock'; type: string; durationMin: number; intensity: EnergyLevel; startedAt: string; }
export interface DailyInsight { id: string; createdAt: string; summary: string; actions: string[]; energy: EnergyLevel; }
export interface MemoryRecord { id: string; userId: string; type: 'fact' | 'pattern' | 'event' | 'preference'; text: string; embedding?: number[]; score?: number; createdAt: string; }
export interface AgentWorkflow { id: string; squad: string; name: string; trigger: string; }
export interface SquadExecution { id: string; workflowId: string; status: 'queued' | 'running' | 'done' | 'error'; startedAt: string; finishedAt?: string; }
export interface IntegrationAccount { id: string; provider: 'google' | 'apple' | 'strava'; status: 'connected' | 'mock' | 'disconnected'; externalUserId?: string; }
export interface PersonalConnection { id: string; provider: 'strava' | 'open_finance' | 'google_calendar' | 'native_calendar'; status: 'connected' | 'disconnected'; syncedAt?: string; }

export interface FinancialAccount {
  id: string;
  institution: string;
  type: 'checking' | 'savings' | 'credit';
  balance: number;
  currency: 'BRL';
  lastUpdatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  accountId: string;
  description: string;
  amount: number;
  category: string;
  occurredAt: string;
}

export interface OpenFinanceConnection {
  id: string;
  provider: 'pluggy' | 'belvo' | 'mock';
  status: 'connected' | 'pending' | 'disconnected';
  consentExpiresAt?: string;
}

export interface FinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  creditUsed: number;
  accounts: FinancialAccount[];
}

export interface DashboardState {
  dayFocus: string;
  topTasks: Task[];
  events: CalendarEvent[];
  progress: number;
  insights: DailyInsight[];
  energy: EnergyLevel;
}
