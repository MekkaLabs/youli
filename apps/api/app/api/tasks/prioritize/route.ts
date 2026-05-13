import { NextResponse } from 'next/server';
import type { Task } from '@youli/shared';
import { prioritizeTask } from '../../../../src/services/ai-prioritizer';

export async function POST(req: Request) {
  const task = (await req.json()) as Task;
  const prioritized = await prioritizeTask(task);
  return NextResponse.json(prioritized);
}
