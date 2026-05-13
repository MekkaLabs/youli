/**
 * GET /api/copilot/agents
 * Lista todos os agentes especializados com seus metadados públicos
 */

import { NextResponse } from 'next/server';
import { getAllAgents } from '@/services/agents/agent-definitions';

export async function GET() {
  const agents = getAllAgents().map(({ systemPrompt: _, ...pub }) => pub);
  return NextResponse.json({ agents, total: agents.length });
}
