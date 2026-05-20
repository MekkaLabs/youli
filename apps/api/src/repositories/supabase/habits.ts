import type { Habit } from '@youli/shared';
import { supabase, hasSupabase } from '../../db/supabase';
import { readDb, writeDb } from '../local-db';

interface HabitRow {
  id: string;
  title: string;
  frequency: Habit['frequency'];
  streak: number;
  goal_id?: string | null;
  last_done?: string | null;
}

function rowToHabit(r: HabitRow): Habit {
  return { id: r.id, title: r.title, frequency: r.frequency, streak: r.streak, goalId: r.goal_id ?? undefined };
}

export async function listHabits(userId: string): Promise<Habit[]> {
  if (!hasSupabase() || !userId) return readDb(userId).habits;
  const { data, error } = await supabase!.from('habits').select('*').eq('profile_id', userId).order('streak', { ascending: false });
  if (error) { console.error('[habits] list:', error.message); return readDb(userId).habits; }
  return (data ?? []).map(rowToHabit);
}

export async function createHabit(userId: string, payload: Omit<Habit, 'id'>): Promise<Habit> {
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    const habit: Habit = { id: `h-${Date.now()}`, ...payload };
    db.habits.push(habit);
    writeDb(userId, db);
    return habit;
  }
  const { data, error } = await supabase!
    .from('habits')
    .insert({ profile_id: userId, title: payload.title, frequency: payload.frequency, streak: payload.streak ?? 0 })
    .select().single();
  if (error) throw new Error(error.message);
  return rowToHabit(data);
}

export async function checkinHabit(userId: string, id: string): Promise<Habit> {
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    const h = db.habits.find(h => h.id === id);
    if (h) { h.streak++; writeDb(userId, db); return h; }
    throw new Error('Habit not found');
  }
  // Registra log e incrementa streak (read-then-write: o streak depende do valor atual)
  const today = new Date().toISOString().split('T')[0];
  await supabase!.from('habit_logs').upsert({ habit_id: id, profile_id: userId, done_at: today });
  const { data: cur } = await supabase!.from('habits').select('*').eq('id', id).single();
  const { data, error } = await supabase!
    .from('habits')
    .update({ streak: (cur?.streak ?? 0) + 1, last_done: today })
    .eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return rowToHabit(data);
}

export async function deleteHabit(userId: string, id: string): Promise<void> {
  if (!id) return;
  if (!hasSupabase() || !userId) {
    const db = readDb(userId);
    db.habits = db.habits.filter((habit) => habit.id !== id);
    writeDb(userId, db);
    return;
  }
  const { error } = await supabase!
    .from('habits')
    .delete()
    .eq('id', id)
    .eq('profile_id', userId);
  if (error) throw new Error(error.message);
}
