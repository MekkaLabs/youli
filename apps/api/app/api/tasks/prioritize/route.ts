import { NextResponse } from 'next/server';
import type { Task } from '@youli/shared';
import { prioritizeTask } from '../../../../src/services/ai-prioritizer';
import { requireAuth } from '../../../../src/lib/http';

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const task = (await req.json()) as Task;
  const prioritized = await prioritizeTask(task);
  return NextResponse.json(prioritized);
}
