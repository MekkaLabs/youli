import { NextResponse } from 'next/server';
import { AioxOrchestrator } from '@youli/orchestrator';
import type { DashboardState } from '@youli/shared';
import { getOpenFinanceSummary } from '../../../../src/services/open-finance';
import { listTasks, listInsights } from '../../../../src/repositories/store';
import { listCalendarEvents } from '../../../../src/repositories/life-stream';
import { requireAuth } from '@/lib/http';

const orchestrator = new AioxOrchestrator();

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const userId = auth.user.id;

  const [tasks, insights, events, finance] = await Promise.all([
    listTasks(userId),
    listInsights(userId),
    Promise.resolve(listCalendarEvents(userId)),
    getOpenFinanceSummary(userId)
  ]);

  const topTasks = tasks
    .filter((t) => t.status !== 'done')
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  const progressBase = tasks.length ? Math.round((tasks.filter((t) => t.status === 'done').length / tasks.length) * 100) : 0;

  const dashboard: DashboardState = {
    dayFocus: topTasks[0]?.title || 'Definir foco principal do dia',
    topTasks,
    events: events.slice(0, 6),
    progress: progressBase,
    insights: insights.slice(0, 5),
    energy: 'high'
  };

  return NextResponse.json({
    dashboard,
    finance,
    routing: orchestrator.routeInvisibleSquad('planner'),
    orchestration: orchestrator.dispatchIntent('daily operating loop')
  });
}
