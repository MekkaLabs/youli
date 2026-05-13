import { NextResponse } from 'next/server';
import { AioxOrchestrator } from '@youli/orchestrator';

const orchestrator = new AioxOrchestrator();

export async function GET() {
  return NextResponse.json({ health: orchestrator.health(), squads: orchestrator.loadSquads() });
}
