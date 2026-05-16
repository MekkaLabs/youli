import { NextResponse } from 'next/server';
import { getTraceMetrics, listTraces } from '@/services/agents/orchestrator-observability';

export async function GET() {
  return NextResponse.json({
    metrics: getTraceMetrics(),
    recentTraces: listTraces(20),
  });
}

