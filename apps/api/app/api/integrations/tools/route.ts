import { NextRequest, NextResponse } from 'next/server';
import { IntegrationToolName, runIntegrationTool } from '@/services/integrations/integration-tools';

const VALID_TOOLS: IntegrationToolName[] = [
  'calendar.getEvents',
  'finance.getSummary',
  'fitness.getActivities',
];

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const tool = body?.tool as IntegrationToolName | undefined;
  if (!tool || !VALID_TOOLS.includes(tool)) {
    return NextResponse.json({ error: 'tool invalido' }, { status: 400 });
  }
  return NextResponse.json(runIntegrationTool(tool));
}

