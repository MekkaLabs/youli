import type { Goal } from '@youli/shared';
import { supabase, hasSupabase } from '../../db/supabase';
import { readDb, writeDb } from '../local-db';

function rowToGoal(r: any): Goal {
  return { id: r.id, objectiveId: r.objective_id || 'o1', title: r.title, progress: r.progress, dueDate: r.due_date };
}

export async function listGoals(userId: string): Promise<Goal[]> {
  if (!hasSupabase() || !userId) return readDb(userId).goals;
  const { data, error } = await supabase!.from('goals').select('*').eq('profile_id', userId).order('created_at', { ascending: false });
  if (error) { console.error('[goals] list:', error.message); return readDb(userId).goals; }
  return (data ?? []).map(rowToGoal);
}

export async function createGoal(userId: string, payload: Omit<Goal, 'id'>): Promise<Goal> {
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    const goal: Goal = { id: `g-${Date.now()}`, ...payload };
    db.goals.push(goal);
    writeDb(userId, db);
    return goal;
  }
  const { data, error } = await supabase!
    .from('goals')
    .insert({ profile_id: userId, title: payload.title, progress: payload.progress ?? 0 })
    .select().single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function updateGoalProgress(userId: string, id: string, progress: number): Promise<Goal> {
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    const g = db.goals.find(g => g.id === id);
    if (g) { g.progress = progress; writeDb(userId, db); return g; }
    throw new Error('Goal not found');
  }
  const { data, error } = await supabase!
    .from('goals').update({ progress }).eq('id', id).eq('profile_id', userId).select().single();
  if (error) throw new Error(error.message);
  return rowToGoal(data);
}

export async function deleteGoal(userId: string, id: string): Promise<void> {
  if (!id) return;
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    db.goals = db.goals.filter((goal) => goal.id !== id);
    writeDb(userId, db);
    return;
  }
  const { error } = await supabase!
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('profile_id', userId);
  if (error) throw new Error(error.message);
}
