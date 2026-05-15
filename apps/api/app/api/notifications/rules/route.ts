/**
 * GET /api/notifications/rules
 * Retorna regras ativas de notificação inteligente
 *
 * POST /api/notifications/evaluate
 * Avalia dados do usuário e retorna quais notificações disparar
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface NotificationRule {
  id: string;
  type: 'habit_streak_risk' | 'goal_deadline' | 'finance_anomaly' | 'inactivity' | 'milestone_near' | 'savings_drop' | 'habit_chain';
  agent: string;
  agentEmoji: string;
  color: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  condition: string;   // descrição legível da condição
  enabled: boolean;
  cooldownHours: number; // mínimo de horas entre disparos do mesmo tipo
}

const RULES: NotificationRule[] = [
  {
    id: 'habit_streak_risk',
    type: 'habit_streak_risk',
    agent: 'Aristóteles',
    agentEmoji: '🏛️',
    color: '#059669',
    priority: 'high',
    condition: 'Hábito com streak ≥ 3 dias não completado até 20h',
    enabled: true,
    cooldownHours: 24,
  },
  {
    id: 'goal_deadline',
    type: 'goal_deadline',
    agent: 'Alexandre',
    agentEmoji: '⚔️',
    color: '#DC2626',
    priority: 'critical',
    condition: 'Meta com deadline em ≤ 7 dias e progresso < 80%',
    enabled: true,
    cooldownHours: 48,
  },
  {
    id: 'finance_anomaly',
    type: 'finance_anomaly',
    agent: 'Adam Smith',
    agentEmoji: '💰',
    color: '#0891B2',
    priority: 'medium',
    condition: 'Gasto diário > 150% da média dos últimos 7 dias',
    enabled: true,
    cooldownHours: 24,
  },
  {
    id: 'savings_drop',
    type: 'savings_drop',
    agent: 'Adam Smith',
    agentEmoji: '💰',
    color: '#0891B2',
    priority: 'high',
    condition: 'Taxa de poupança do mês caiu abaixo de 10%',
    enabled: true,
    cooldownHours: 72,
  },
  {
    id: 'milestone_near',
    type: 'milestone_near',
    agent: 'Alexandre',
    agentEmoji: '⚔️',
    color: '#7C3AED',
    priority: 'medium',
    condition: 'Meta a ≤ 10% do próximo milestone',
    enabled: true,
    cooldownHours: 12,
  },
  {
    id: 'inactivity',
    type: 'inactivity',
    agent: 'Franklin',
    agentEmoji: '🦅',
    color: '#D97706',
    priority: 'medium',
    condition: 'Nenhuma tarefa completada em 48h',
    enabled: true,
    cooldownHours: 48,
  },
  {
    id: 'habit_chain',
    type: 'habit_chain',
    agent: 'Aristóteles',
    agentEmoji: '🏛️',
    color: '#059669',
    priority: 'low',
    condition: '3+ hábitos completados hoje — momentum positivo',
    enabled: true,
    cooldownHours: 24,
  },
];

export async function GET() {
  return NextResponse.json({ rules: RULES });
}
