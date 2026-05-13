import type { Task } from '@youli/shared';
import { supabase, hasSupabase } from '../../db/supabase';
import { readDb, writeDb } from '../local-db';

const PROFILE_ID = process.env.YOULI_PROFILE_ID || '';

// ── Helpers de conversão ─────────────────────────────────────────────────────
function rowToTask(r: any): Task {
  return {
    id: r.id,
    title: r.title,
    nextStep: r.next_step,
    status: r.status,
    priority: r.priority,
    goalId: r.goal_id,
    habitId: r.habit_id,
  };
}

// ── Listagem ─────────────────────────────────────────────────────────────────
export async function listTasks(): Promise<Task[]> {
  if (!hasSupabase() || !PROFILE_ID) return readDb().tasks;

  const { data, error } = await supabase!
    .from('tasks')
    .select('*')
    .eq('profile_id', PROFILE_ID)
    .order('priority', { ascending: false });

  if (error) { console.error('[tasks] list:', error.message); return readDb().tasks; }
  return (data ?? []).map(rowToTask);
}

// ── Criação ──────────────────────────────────────────────────────────────────
export async function createTask(payload: Omit<Task, 'id'>): Promise<Task> {
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    const task: Task = { id: `t-${Date.now()}`, ...payload };
    db.tasks.push(task);
    writeDb(db);
    return task;
  }

  const { data, error } = await supabase!
    .from('tasks')
    .insert({
      profile_id: PROFILE_ID,
      title: payload.title,
      next_step: payload.nextStep,
      status: payload.status ?? 'todo',
      priority: payload.priority ?? 3,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTask(data);
}

// ── Atualização ──────────────────────────────────────────────────────────────
export async function updateTask(id: string, patch: Partial<Task>): Promise<Task> {
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    const idx = db.tasks.findIndex(t => t.id === id);
    if (idx >= 0) { db.tasks[idx] = { ...db.tasks[idx], ...patch }; writeDb(db); return db.tasks[idx]; }
    throw new Error('Task not found');
  }

  const { data, error } = await supabase!
    .from('tasks')
    .update({
      ...(patch.title && { title: patch.title }),
      ...(patch.status && { status: patch.status }),
      ...(patch.priority && { priority: patch.priority }),
      ...(patch.nextStep !== undefined && { next_step: patch.nextStep }),
    })
    .eq('id', id)
    .eq('profile_id', PROFILE_ID)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToTask(data);
}

// ── Remoção ──────────────────────────────────────────────────────────────────
export async function deleteTask(id: string): Promise<void> {
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    db.tasks = db.tasks.filter(t => t.id !== id);
    writeDb(db);
    return;
  }
  await supabase!.from('tasks').delete().eq('id', id).eq('profile_id', PROFILE_ID);
}
