/**
 * useFinance — hook de finanças com persistência AsyncStorage
 * Gerencia: transações, categorias, saldo, resumo mensal, insights do Adam Smith
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category: string;
  date: string; // ISO 'YYYY-MM-DD'
  emoji: string;
}

export interface CategorySummary {
  name: string;
  emoji: string;
  color: string;
  total: number;
  percent: number;
  count: number;
}

export interface MonthlySummary {
  month: string; // 'Jan', 'Fev', ...
  income: number;
  expenses: number;
  balance: number;
}

const STORAGE_KEY = '@youli:finance';

const CATEGORY_META: Record<string, { emoji: string; color: string }> = {
  alimentação:    { emoji: '🍽️', color: '#D97706' },
  transporte:     { emoji: '🚗', color: '#0891B2' },
  moradia:        { emoji: '🏠', color: '#7C3AED' },
  saúde:          { emoji: '💊', color: '#059669' },
  lazer:          { emoji: '🎮', color: '#EC4899' },
  educação:       { emoji: '📚', color: '#6366F1' },
  vestuário:      { emoji: '👕', color: '#F59E0B' },
  tecnologia:     { emoji: '💻', color: '#3B82F6' },
  investimentos:  { emoji: '📈', color: '#10B981' },
  salário:        { emoji: '💼', color: '#059669' },
  freelance:      { emoji: '🧠', color: '#8B5CF6' },
  outros:         { emoji: '📦', color: '#6B7280' },
};

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function randomDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

// Transações de demo realistas
const DEFAULT_TRANSACTIONS: Transaction[] = [
  // Receitas
  { id: 't1',  type: 'income',  amount: 8500,  description: 'Salário',                  category: 'salário',      emoji: '💼', date: randomDate(1)  },
  { id: 't2',  type: 'income',  amount: 1200,  description: 'Freelance UI Design',      category: 'freelance',    emoji: '🧠', date: randomDate(5)  },
  { id: 't3',  type: 'income',  amount: 450,   description: 'Dividendos ETF',           category: 'investimentos',emoji: '📈', date: randomDate(12) },
  // Despesas — este mês
  { id: 't4',  type: 'expense', amount: 1800,  description: 'Aluguel',                  category: 'moradia',      emoji: '🏠', date: randomDate(1)  },
  { id: 't5',  type: 'expense', amount: 387,   description: 'Supermercado',             category: 'alimentação',  emoji: '🛒', date: randomDate(2)  },
  { id: 't6',  type: 'expense', amount: 89,    description: 'Uber',                     category: 'transporte',   emoji: '🚗', date: randomDate(3)  },
  { id: 't7',  type: 'expense', amount: 55,    description: 'iFood',                    category: 'alimentação',  emoji: '🍔', date: randomDate(4)  },
  { id: 't8',  type: 'expense', amount: 120,   description: 'Farmácia',                 category: 'saúde',        emoji: '💊', date: randomDate(5)  },
  { id: 't9',  type: 'expense', amount: 200,   description: 'Netflix + Spotify + Prime',category: 'lazer',        emoji: '🎮', date: randomDate(6)  },
  { id: 't10', type: 'expense', amount: 149,   description: 'Curso Udemy',              category: 'educação',     emoji: '📚', date: randomDate(7)  },
  { id: 't11', type: 'expense', amount: 230,   description: 'Combustível',              category: 'transporte',   emoji: '⛽', date: randomDate(8)  },
  { id: 't12', type: 'expense', amount: 180,   description: 'Restaurante',              category: 'alimentação',  emoji: '🍽️', date: randomDate(9)  },
  { id: 't13', type: 'expense', amount: 350,   description: 'Academia + suplemento',   category: 'saúde',        emoji: '💪', date: randomDate(10) },
  { id: 't14', type: 'expense', amount: 95,    description: 'Roupa nova',               category: 'vestuário',    emoji: '👕', date: randomDate(14) },
  { id: 't15', type: 'expense', amount: 1500,  description: 'Reserva emergência',       category: 'investimentos',emoji: '🏦', date: randomDate(15) },
  // Mês anterior
  { id: 't16', type: 'income',  amount: 8500,  description: 'Salário',                  category: 'salário',      emoji: '💼', date: randomDate(32) },
  { id: 't17', type: 'expense', amount: 1800,  description: 'Aluguel',                  category: 'moradia',      emoji: '🏠', date: randomDate(32) },
  { id: 't18', type: 'expense', amount: 420,   description: 'Supermercado',             category: 'alimentação',  emoji: '🛒', date: randomDate(35) },
  { id: 't19', type: 'expense', amount: 310,   description: 'Combustível',              category: 'transporte',   emoji: '⛽', date: randomDate(38) },
  { id: 't20', type: 'income',  amount: 800,   description: 'Bico consultoria',         category: 'freelance',    emoji: '🧠', date: randomDate(40) },
  { id: 't21', type: 'expense', amount: 195,   description: 'Jantar aniversário',       category: 'alimentação',  emoji: '🎂', date: randomDate(42) },
  { id: 't22', type: 'expense', amount: 1500,  description: 'Reserva emergência',       category: 'investimentos',emoji: '🏦', date: randomDate(45) },
  // 2 meses atrás
  { id: 't23', type: 'income',  amount: 8500,  description: 'Salário',                  category: 'salário',      emoji: '💼', date: randomDate(62) },
  { id: 't24', type: 'expense', amount: 1800,  description: 'Aluguel',                  category: 'moradia',      emoji: '🏠', date: randomDate(62) },
  { id: 't25', type: 'expense', amount: 550,   description: 'Supermercado',             category: 'alimentação',  emoji: '🛒', date: randomDate(65) },
  { id: 't26', type: 'expense', amount: 289,   description: 'Transporte',               category: 'transporte',   emoji: '🚗', date: randomDate(68) },
  { id: 't27', type: 'expense', amount: 1500,  description: 'Reserva emergência',       category: 'investimentos',emoji: '🏦', date: randomDate(72) },
  { id: 't28', type: 'income',  amount: 950,   description: 'Freelance',                category: 'freelance',    emoji: '🧠', date: randomDate(74) },
];

function getMonthKey(dateISO: string): string {
  return dateISO.slice(0, 7); // 'YYYY-MM'
}

function currentMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

function money(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

export function useFinance() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setTransactions(JSON.parse(raw)); }
        catch { setTransactions(DEFAULT_TRANSACTIONS); }
      } else {
        setTransactions(DEFAULT_TRANSACTIONS);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TRANSACTIONS));
      }
      setLoading(false);
    });
  }, []);

  // ─── Transações do mês corrente ───────────────────────
  const thisMonth = useMemo(() => {
    const key = currentMonthKey();
    return transactions.filter(t => t.date.startsWith(key));
  }, [transactions]);

  // ─── Resumo do mês ────────────────────────────────────
  const monthlySummary = useMemo(() => {
    const income = thisMonth.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      income,
      expenses,
      balance: income - expenses,
      savingsRate: income > 0 ? Math.round(((income - expenses) / income) * 100) : 0,
    };
  }, [thisMonth]);

  // ─── Gastos por categoria (donut) ────────────────────
  const categoryBreakdown = useMemo((): CategorySummary[] => {
    const expenseMap: Record<string, number> = {};
    const countMap: Record<string, number> = {};
    thisMonth.filter(t => t.type === 'expense').forEach(t => {
      expenseMap[t.category] = (expenseMap[t.category] ?? 0) + t.amount;
      countMap[t.category] = (countMap[t.category] ?? 0) + 1;
    });
    const totalExpenses = Object.values(expenseMap).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(expenseMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, total]) => ({
        name,
        emoji: CATEGORY_META[name]?.emoji ?? '📦',
        color: CATEGORY_META[name]?.color ?? '#6B7280',
        total,
        percent: Math.round((total / totalExpenses) * 100),
        count: countMap[name] ?? 0,
      }));
  }, [thisMonth]);

  // ─── Histórico dos últimos 6 meses (barra) ───────────
  const monthlyHistory = useMemo((): MonthlySummary[] => {
    const history: MonthlySummary[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      const monthTx = transactions.filter(t => t.date.startsWith(key));
      const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      history.push({
        month: MONTH_NAMES[d.getMonth()],
        income,
        expenses,
        balance: income - expenses,
      });
    }
    return history;
  }, [transactions]);

  // ─── Saldo total (estimado) ───────────────────────────
  const totalBalance = useMemo(() => {
    return transactions.reduce((s, t) =>
      t.type === 'income' ? s + t.amount : s - t.amount, 0);
  }, [transactions]);

  // ─── Adicionar transação ──────────────────────────────
  const addTransaction = useCallback((tx: Omit<Transaction, 'id'>) => {
    const newTx: Transaction = { ...tx, id: Date.now().toString() };
    setTransactions(prev => {
      const updated = [newTx, ...prev];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // ─── Insight do Adam Smith ────────────────────────────
  const adamInsight = useMemo((): string => {
    const { income, expenses, savingsRate } = monthlySummary;
    if (savingsRate >= 30) return `Taxa de poupança de ${savingsRate}% — você está criando riqueza, não apenas gerenciando dinheiro.`;
    if (savingsRate >= 15) return `${savingsRate}% guardado este mês. Adam Smith diria: a poupança é o capital de amanhã.`;
    if (savingsRate >= 0) return `Taxa de poupança baixa: ${savingsRate}%. Pequenos cortes agora criam grandes liberdades no futuro.`;
    return `Gastos acima da renda este mês. É hora de revisar onde o dinheiro está indo.`;
  }, [monthlySummary]);

  return {
    transactions,
    thisMonth,
    loading,
    monthlySummary,
    categoryBreakdown,
    monthlyHistory,
    totalBalance,
    adamInsight,
    addTransaction,
    money,
    CATEGORY_META,
  };
}
