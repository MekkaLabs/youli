/**
 * useVisionBoard — objetivos de longo prazo (1, 3, 5 anos)
 */
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@youli:vision_board';

export type Horizon = '1y' | '3y' | '5y';

export interface VisionItem {
  id: string;
  horizon: Horizon;
  area: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  linkedGoalIds?: string[];
  createdAt: string;
}

const DEFAULTS: VisionItem[] = [
  { id: 'v1', horizon: '1y', area: 'Carreira',    title: 'Lançar meu primeiro produto SaaS', icon: '🚀', color: '#7C3AED', createdAt: new Date().toISOString() },
  { id: 'v2', horizon: '1y', area: 'Saúde',       title: 'Correr 10km sem parar', icon: '🏃', color: '#059669', createdAt: new Date().toISOString() },
  { id: 'v3', horizon: '3y', area: 'Financeiro',  title: 'Liberdade financeira — renda passiva > gastos', icon: '💰', color: '#D97706', createdAt: new Date().toISOString() },
  { id: 'v4', horizon: '3y', area: 'Impacto',     title: 'Impactar 10.000 pessoas com Youli', icon: '🌍', color: '#0EA5E9', createdAt: new Date().toISOString() },
  { id: 'v5', horizon: '5y', area: 'Legado',      title: 'Construir empresa gerando empregos e impacto', icon: '👑', color: '#DC2626', createdAt: new Date().toISOString() },
];

function genId() { return `vision_${Date.now()}_${Math.random().toString(36).slice(2,6)}`; }

export function useVisionBoard() {
  const [items, setItems] = useState<VisionItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then(raw => {
      if (raw) setItems(JSON.parse(raw));
      else { setItems(DEFAULTS); AsyncStorage.setItem(KEY, JSON.stringify(DEFAULTS)); }
    });
  }, []);

  const persist = useCallback((updated: VisionItem[]) => {
    setItems(updated);
    AsyncStorage.setItem(KEY, JSON.stringify(updated));
  }, []);

  const addItem = useCallback((item: Omit<VisionItem, 'id' | 'createdAt'>) => {
    persist([...items, { ...item, id: genId(), createdAt: new Date().toISOString() }]);
  }, [items, persist]);

  const deleteItem = useCallback((id: string) => {
    persist(items.filter(i => i.id !== id));
  }, [items, persist]);

  const byHorizon = (h: Horizon) => items.filter(i => i.horizon === h);

  return { items, addItem, deleteItem, byHorizon };
}
