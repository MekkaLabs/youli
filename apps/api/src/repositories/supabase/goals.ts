import type { Goal } from '@youli/shared';
import { supabase, hasSupabase } from '../../db/supabase';
import { readDb, writeDb } from '../local-db';

const PROFILE_ID = process.env.YOULI_PROFILE_ID || '';

function rowToGoal(r: any): Goal {
  return { id: r.id, objectiveId: r.objective_id || 'o1', title: r.title, progress: r.progress, dueDate: r.due_date };
}

export async function listGoals(): Promise<Goal[]> {
  if (!hasSupabase() || !PROFILE_ID) return readDb().goals;
  const { data, error } = await supabase!.from('goals').select('*').eq('profile_id', PROFILE_ID).order('created_at', { ascending: false });
  if (error) { console.error('[goals] list:', error.message); return readDb().goals; }
  return (data ?? []).map(rowToGoal);
}

export async function createGoal(payload: Omit<Goal, 'id'>): Promise<Goal> {
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    const goal: Goal = { id: `g-${Date.now()}`, ...payload };
    db.goals.push(goal);
    writeDb(db);
    return goal;
  }
  const { data, error } = await supabase!
    .from('goals')
    .insert({ profile_id: PROFILE_ID, title: payload.title, progress: payload.progress ?? 0 })
    .select().single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function updateGoalProgress(id: string, progress: number): Promise<Goal> {
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    const g = db.goals.find(g => g.id === id);
    if (g) { g.progress = progress; writeDb(db); return g; }
    throw new Error('Goal not found');
  }
  const { data, error } = await supabase!
    .from('goals').update({ progress }).eq('id', id).eq('profile_id', PROFILE_ID).select().single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function deleteGoal(id: string): Promise<void> {
  if (!id) return;
  if (!hasSupabase() || !PROFILE_ID) {
    const db = readDb();
    db.goals = db.goals.filter((goal) => goal.id !== id);
    writeDb(db);
    return;
  }
  const { error } = await supabase!
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('profile_id', PROFILE_ID);
  if (error) throw new Error(error.message);
}
