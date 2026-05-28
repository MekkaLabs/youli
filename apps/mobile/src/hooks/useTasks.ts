/**
 * useTasks — CRUD de tarefas com AsyncStorage + API sync
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';

import { ApiTaskSchema, type ApiTask } from '../types/api-schemas';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3002';
const TASKS_KEY = '@youli:tasks';
const SYNC_INTERVAL_MS = 20000;

export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface LocalTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;       // ISO
  estimatedMinutes?: number;
  tags?: string[];
  completedAt?: string;   // ISO
  createdAt: string;      // ISO
  xpReward: number;
}

function generateId() { return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }

function xpForPriority(p: TaskPriority): number {
  return { low: 5, medium: 15, high: 30, critical: 50 }[p];
}

function normalizePriority(input: unknown): TaskPriority {
  if (typeof input === 'string' && ['low', 'medium', 'high', 'critical'].includes(input)) {
    return input as TaskPriority;
  }
  const n = typeof input === 'number' ? input : 3;
  if (n >= 5) return 'critical';
  if (n >= 4) return 'high';
  if (n >= 3) return 'medium';
  return 'low';
}

function toApiPriority(priority: TaskPriority): number {
  return { low: 2, medium: 3, high: 4, critical: 5 }[priority];
}

function fromApiTask(raw: unknown): LocalTask {
  const parsed = ApiTaskSchema.safeParse(raw);
  const t: ApiTask = parsed.success ? parsed.data : ({ id: generateId(), title: 'Nova tarefa' } as ApiTask);
  const priority = normalizePriority(t.priority);
  return {
    id: t.id || generateId(),
    title: t.title || 'Nova tarefa',
    description: t.nextStep ?? t.description ?? undefined,
    status: (t.status === 'doing' || t.status === 'done' ? t.status : 'todo') as TaskStatus,
    priority,
    createdAt: t.createdAt ?? new Date().toISOString(),
    xpReward: xpForPriority(priority),
    completedAt: t.status === 'done' ? new Date().toISOString() : undefined,
  };
}

export function useTasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const isSyncingRef = useRef(false);

  const saveLocal = useCallback(async (updated: LocalTask[]) => {
    setTasks(updated);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
  }, []);

  const syncFromApi = useCallback(async () => {
    if (isSyncingRef.current) return null;
    isSyncingRef.current = true;
    setSyncing(true);
    setSyncError(null);
    const res = await fetch(`${API_BASE}/api/tasks/route`).catch(() => null);
    if (!res?.ok) {
      setSyncError('offline');
      setSyncing(false);
      isSyncingRef.current = false;
      return null;
    }
    const json = await res.json().catch(() => []);
    const list = Array.isArray(json) ? json : (json?.tasks ?? []);
    const mapped = list.map(fromApiTask);
    await saveLocal(mapped);
    setLastSyncAt(new Date().toISOString());
    setSyncing(false);
    isSyncingRef.current = false;
    return mapped;
  }, [saveLocal]);

  const loadFromStorage = useCallback(async () => {
    setLoading(true);
    const fromApi = await syncFromApi();
    if (fromApi) {
      setLoading(false);
      return;
    }
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    if (raw) setTasks(JSON.parse(raw));
    if (!lastSyncAt) setSyncError('offline');
    setLoading(false);
  }, [syncFromApi, lastSyncAt]);

  // Carrega do AsyncStorage + sincroniza entre abas/telas
  useEffect(() => {
    loadFromStorage();
    const timer = setInterval(loadFromStorage, SYNC_INTERVAL_MS);
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        loadFromStorage();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [loadFromStorage]);

  const createTask = useCallback((data: Omit<LocalTask, 'id' | 'createdAt' | 'xpReward'>) => {
    const task: LocalTask = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      xpReward: xpForPriority(data.priority),
    };
    const updated = [task, ...tasks];
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: task.title,
        nextStep: task.description,
        status: task.status,
        priority: toApiPriority(task.priority),
      }),
    }).then(() => syncFromApi()).catch(() => null);
    return task;
  }, [tasks, saveLocal, syncFromApi]);

  const restoreTask = useCallback((task: LocalTask) => {
    const restored: LocalTask = {
      ...task,
      id: task.id || generateId(),
      createdAt: task.createdAt || new Date().toISOString(),
      xpReward: task.xpReward || xpForPriority(task.priority),
    };
    const updated = [restored, ...tasks.filter((t) => t.id !== restored.id)];
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/route`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: restored.title,
        nextStep: restored.description,
        status: restored.status,
        priority: toApiPriority(restored.priority),
      }),
    }).then(() => syncFromApi()).catch(() => null);
  }, [tasks, saveLocal, syncFromApi]);

  const updateTask = useCallback((id: string, patch: Partial<LocalTask>) => {
    const updated = tasks.map(t => t.id === id ? { ...t, ...patch } : t);
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: patch.title,
        status: patch.status,
        priority: patch.priority ? toApiPriority(patch.priority) : undefined,
        nextStep: patch.description,
      }),
    }).then(() => syncFromApi()).catch(() => null);
  }, [tasks, saveLocal, syncFromApi]);

  const deleteTask = useCallback((id: string) => {
    const updated = tasks.filter(t => t.id !== id);
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/${id}`, { method: 'DELETE' }).catch(() => null);
  }, [tasks, saveLocal]);

  const completeTask = useCallback((id: string) => {
    const updated = tasks.map(t =>
      t.id === id
        ? { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
        : t
    );
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    }).then(() => syncFromApi()).catch(() => null);
  }, [tasks, saveLocal, syncFromApi]);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    const updated = tasks.map(t =>
      t.id === id
        ? { ...t, status, ...(status === 'done' ? { completedAt: new Date().toISOString() } : {}) }
        : t
    );
    saveLocal(updated);
    fetch(`${API_BASE}/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then(() => syncFromApi()).catch(() => null);
  }, [tasks, saveLocal, syncFromApi]);

  const counts = {
    todo: tasks.filter(t => t.status === 'todo').length,
    doing: tasks.filter(t => t.status === 'doing').length,
    done: tasks.filter(t => t.status === 'done').length,
    total: tasks.length,
  };

  const todayTasks = tasks.filter(t => {
    if (t.status === 'done') return false;
    if (!t.dueDate) return t.status === 'doing';
    const due = new Date(t.dueDate).toDateString();
    return due === new Date().toDateString();
  });

  return {
    tasks,
    loading,
    syncing,
    syncError,
    lastSyncAt,
    counts,
    todayTasks,
    createTask,
    restoreTask,
    updateTask,
    deleteTask,
    completeTask,
    moveTask,
    refresh: loadFromStorage
  };
}
