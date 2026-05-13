import { randomUUID } from 'node:crypto';
import type { DailyInsight, Goal, Habit, MemoryRecord, Task } from '@youli/shared';
import { hasSupabase, supabase } from '../db/supabase';
import { readDb, writeDb } from './local-db';

export async function listTasks(): Promise<Task[]> {
  if (!hasSupabase || !supabase) return readDb().tasks;
  const { data, error } = await supabase.from('tasks').select('*').order('priority', { ascending: false });
  if (error) return readDb().tasks;
  return data.map(mapTask);
}

export async function createTask(task: Task): Promise<Task> {
  const withId = { ...task, id: task.id || randomUUID() };
  if (!hasSupabase || !supabase) {
    const db = readDb();
    db.tasks.unshift(withId);
    writeDb(db);
    return withId;
  }
  const payload = {
    id: withId.id,
    goal_id: withId.goalId ?? null,
    objective_id: withId.objectiveId ?? null,
    habit_id: withId.habitId ?? null,
    title: withId.title,
    next_step: withId.nextStep ?? null,
    status: withId.status,
    priority: withId.priority
  };
  const { data, error } = await supabase.from('tasks').insert(payload).select('*').single();
  if (error || !data) {
    const db = readDb(); db.tasks.unshift(withId); writeDb(db);
    return withId;
  }
  return mapTask(data);
}

export async function listGoals(): Promise<Goal[]> {
  if (!hasSupabase || !supabase) return readDb().goals;
  const { data, error } = await supabase.from('goals').select('*');
  if (error) return readDb().goals;
  return data.map((x) => ({ id: x.id, objectiveId: x.objective_id, title: x.title, dueDate: x.due_date || undefined, progress: x.progress }));
}

export async function createGoal(goal: Goal): Promise<Goal> {
  const withId = { ...goal, id: goal.id || randomUUID() };
  if (!hasSupabase || !supabase) {
    const db = readDb(); db.goals.unshift(withId); writeDb(db);
    return withId;
  }
  const payload = { id: withId.id, objective_id: withId.objectiveId, title: withId.title, due_date: withId.dueDate ?? null, progress: withId.progress };
  const { data, error } = await supabase.from('goals').insert(payload).select('*').single();
  if (error || !data) {
    const db = readDb(); db.goals.unshift(withId); writeDb(db);
    return withId;
  }
  return { id: data.id, objectiveId: data.objective_id, title: data.title, dueDate: data.due_date || undefined, progress: data.progress };
}

export async function listHabits(): Promise<Habit[]> {
  if (!hasSupabase || !supabase) return readDb().habits;
  const { data, error } = await supabase.from('habits').select('*');
  if (error) return readDb().habits;
  return data.map((x) => ({ id: x.id, goalId: x.goal_id || undefined, title: x.title, frequency: x.frequency, streak: x.streak }));
}

export async function createHabit(habit: Habit): Promise<Habit> {
  const withId = { ...habit, id: habit.id || randomUUID() };
  if (!hasSupabase || !supabase) {
    const db = readDb(); db.habits.unshift(withId); writeDb(db);
    return withId;
  }
  const payload = { id: withId.id, goal_id: withId.goalId ?? null, title: withId.title, frequency: withId.frequency, streak: withId.streak };
  const { data, error } = await supabase.from('habits').insert(payload).select('*').single();
  if (error || !data) {
    const db = readDb(); db.habits.unshift(withId); writeDb(db);
    return withId;
  }
  return { id: data.id, goalId: data.goal_id || undefined, title: data.title, frequency: data.frequency, streak: data.streak };
}

export async function listInsights(): Promise<DailyInsight[]> {
  if (!hasSupabase || !supabase) return readDb().insights;
  const { data, error } = await supabase.from('daily_insights').select('*').order('created_at', { ascending: false }).limit(10);
  if (error) return readDb().insights;
  return data.map((x) => ({ id: x.id, createdAt: x.created_at, summary: x.summary, actions: x.actions || [], energy: x.energy }));
}

export async function createInsight(insight: DailyInsight): Promise<DailyInsight> {
  const withId = { ...insight, id: insight.id || randomUUID() };
  if (!hasSupabase || !supabase) {
    const db = readDb(); db.insights.unshift(withId); writeDb(db);
    return withId;
  }
  const payload = { id: withId.id, summary: withId.summary, actions: withId.actions, energy: withId.energy, created_at: withId.createdAt };
  const { data, error } = await supabase.from('daily_insights').insert(payload).select('*').single();
  if (error || !data) {
    const db = readDb(); db.insights.unshift(withId); writeDb(db);
    return withId;
  }
  return { id: data.id, createdAt: data.created_at, summary: data.summary, actions: data.actions || [], energy: data.energy };
}

export async function addMemory(record: MemoryRecord): Promise<void> {
  if (!hasSupabase || !supabase) {
    const db = readDb(); db.memory.unshift(record); writeDb(db); return;
  }
  await supabase.from('memory_records').insert({ id: record.id, user_id: record.userId, type: record.type, text: record.text, embedding: record.embedding ?? null, score: record.score ?? null, created_at: record.createdAt });
}

function mapTask(x: any): Task {
  return { id: x.id, goalId: x.goal_id || undefined, objectiveId: x.objective_id || undefined, habitId: x.habit_id || undefined, title: x.title, nextStep: x.next_step || undefined, status: x.status, priority: x.priority };
}
