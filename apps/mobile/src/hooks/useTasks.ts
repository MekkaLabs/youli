/**
 * useTasks — CRUD de tarefas com AsyncStorage + API sync
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const TASKS_KEY = '@youli:tasks';

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

export function useTasks() {
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega do AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(TASKS_KEY).then(raw => {
      if (raw) setTasks(JSON.parse(raw));
    });
  }, []);

  const persist = useCallback((updated: LocalTask[]) => {
    setTasks(updated);
    AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
  }, []);

  const createTask = useCallback((data: Omit<LocalTask, 'id' | 'createdAt' | 'xpReward'>) => {
    const task: LocalTask = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      xpReward: xpForPriority(data.priority),
    };
    persist([task, ...tasks]);
    return task;
  }, [tasks, persist]);

  const updateTask = useCallback((id: string, patch: Partial<LocalTask>) => {
    persist(tasks.map(t => t.id === id ? { ...t, ...patch } : t));
  }, [tasks, persist]);

  const deleteTask = useCallback((id: string) => {
    persist(tasks.filter(t => t.id !== id));
  }, [tasks, persist]);

  const completeTask = useCallback((id: string) => {
    persist(tasks.map(t =>
      t.id === id
        ? { ...t, status: 'done' as const, completedAt: new Date().toISOString() }
        : t
    ));
  }, [tasks, persist]);

  const moveTask = useCallback((id: string, status: TaskStatus) => {
    persist(tasks.map(t =>
      t.id === id
        ? { ...t, status, ...(status === 'done' ? { completedAt: new Date().toISOString() } : {}) }
        : t
    ));
  }, [tasks, persist]);

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

  return { tasks, loading, counts, todayTasks, createTask, updateTask, deleteTask, completeTask, moveTask };
}
