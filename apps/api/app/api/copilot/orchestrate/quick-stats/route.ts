import { NextResponse } from 'next/server';
import { getTraceMetrics } from '@/services/agents/orchestrator-observability';
import { getFunctionMetrics } from '@/services/kernel/function-observability';
import { listApprovals } from '@/services/agents/approval-queue';

export async function GET() {
  return NextResponse.json({
    orchestration: getTraceMetrics(),
    functions: getFunctionMetrics(400),
    approvals: {
      pending: listApprovals('pending').length,
      approved: listApprovals('approved').length,
      rejected: listApprovals('rejected').length,
    }
  });
}

