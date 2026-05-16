import type { LifeArea } from './agent-definitions';
import type { UserContext } from './agent-executor';

export interface ConditionalTaskDecision {
  shouldEscalate: boolean;
  reason: string;
  suggestedArea?: LifeArea;
}

export function evaluateConditionalTask(area: LifeArea, context: UserContext): ConditionalTaskDecision {
  if (area === 'financeiro') {
    const income = context.finances?.income ?? 0;
    const expenses = context.finances?.expenses ?? 0;
    if (income > 0 && expenses > income) {
      return {
        shouldEscalate: true,
        suggestedArea: 'metas',
        reason: 'despesa acima da receita',
      };
    }
  }

  if (area === 'tarefas') {
    const overdueCritical = (context.tasks ?? []).filter((t) => t.status !== 'done' && t.priority >= 5).length;
    if (overdueCritical >= 2) {
      return {
        shouldEscalate: true,
        suggestedArea: 'calendario',
        reason: 'muitas tarefas criticas pendentes',
      };
    }
  }

  if (area === 'habitos') {
    const weakHabits = (context.habits ?? []).filter((h) => h.streak < 2).length;
    if (weakHabits >= 2) {
      return {
        shouldEscalate: true,
        suggestedArea: 'foco',
        reason: 'consistencia de habitos baixa',
      };
    }
  }

  if (area === 'fitness') {
    const weekly = context.fitness?.weeklyActivities ?? 0;
    const goal = context.fitness?.goalWeeklyActivities ?? 0;
    if (goal > 0 && weekly < goal / 2) {
      return {
        shouldEscalate: true,
        suggestedArea: 'calendario',
        reason: 'treinos abaixo da metade da meta semanal',
      };
    }
  }

  return {
    shouldEscalate: false,
    reason: 'nenhuma escalacao condicional necessaria',
  };
}

