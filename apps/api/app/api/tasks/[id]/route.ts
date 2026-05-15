import { NextRequest, NextResponse } from 'next/server';
import { deleteTask, updateTask } from '../../../../src/repositories/supabase/tasks';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const body = await req.json().catch(() => ({}));
  const params = await context.params;
  const task = await updateTask(params.id, body);
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  await deleteTask(params.id);
  return NextResponse.json({ success: true, id: params.id });
}
