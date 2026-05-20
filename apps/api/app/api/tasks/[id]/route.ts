import { NextRequest, NextResponse } from 'next/server';
import { deleteTask, updateTask } from '../../../../src/repositories/supabase/tasks';
import { requireAuth } from '@/lib/http';

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = await req.json().catch(() => ({}));
  const params = await context.params;
  const task = await updateTask(auth.user.id, params.id, body);
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const params = await context.params;
  await deleteTask(auth.user.id, params.id);
  return NextResponse.json({ success: true, id: params.id });
}
