import type { Habit, Task, Goal, CalendarEvent, FitnessActivity, DailyInsight, MemoryRecord } from '@youli/shared';

export type SystemSection =
  | 'overview'
  | 'tarefas'
  | 'metas'
  | 'habitos'
  | 'calendario'
  | 'insights'
  | 'fitness'
  | 'financeiro'
  | 'perfil'
  | 'memoria'
  | 'orquestracao';

export interface SystemInterpretation {
  section: SystemSection;
  title: string;
  action:
    | { type: 'create_task'; payload: Omit<Task, 'id'> }
    | { type: 'create_goal'; payload: Omit<Goal, 'id'> }
    | { type: 'create_habit'; payload: Omit<Habit, 'id'> }
    | { type: 'create_calendar_event'; payload: Omit<CalendarEvent, 'id'> }
    | { type: 'create_fitness_activity'; payload: Omit<FitnessActivity, 'id'> }
    | { type: 'create_insight'; payload: Omit<DailyInsight, 'id'> }
    | { type: 'create_memory'; payload: Omit<MemoryRecord, 'id'> }
    | { type: 'note'; payload: { text: string } };
}

export function interpretBySection(section: SystemSection, message: string): SystemInterpretation {
  const text = message.trim();
  const low = text.toLowerCase();

  if (section === 'tarefas') {
    const priority: Task['priority'] = /(urgente|hoje|prazo)/.test(low) ? 5 : 4;
    return {
      section,
      title: normalize(text),
      action: { type: 'create_task', payload: { title: normalize(text), status: 'todo', priority, nextStep: 'Executar o primeiro passo de 10 minutos.' } }
    };
  }

  if (section === 'metas') {
    return {
      section,
      title: normalize(text),
      action: { type: 'create_goal', payload: { objectiveId: 'o1', title: normalize(text), progress: 0 } }
    };
  }

  if (section === 'habitos') {
    const frequency: Habit['frequency'] = /(semana|semanal|2x|3x|4x|5x)/.test(low) ? 'weekly' : 'daily';
    return {
      section,
      title: normalize(text),
      action: { type: 'create_habit', payload: { title: normalize(text), frequency, streak: 0 } }
    };
  }

  if (section === 'calendario') {
    const now = new Date();
    return {
      section,
      title: normalize(text),
      action: {
        type: 'create_calendar_event',
        payload: {
          source: 'mock',
          title: normalize(text),
          startsAt: now.toISOString(),
          endsAt: new Date(now.getTime() + 60 * 60 * 1000).toISOString()
        }
      }
    };
  }

  if (section === 'fitness') {
    return {
      section,
      title: normalize(text),
      action: {
        type: 'create_fitness_activity',
        payload: {
          source: 'mock',
          type: normalize(text),
          durationMin: 40,
          intensity: /(forte|pesado|intenso)/.test(low) ? 'high' : 'medium',
          startedAt: new Date().toISOString()
        }
      }
    };
  }

  if (section === 'insights') {
    return {
      section,
      title: normalize(text),
      action: {
        type: 'create_insight',
        payload: {
          createdAt: new Date().toISOString(),
          summary: normalize(text),
          actions: ['Transformar em ação prática hoje'],
          energy: 'medium'
        }
      }
    };
  }

  if (section === 'memoria') {
    return {
      section,
      title: normalize(text),
      action: {
        type: 'create_memory',
        payload: { userId: 'u1', type: 'fact', text: normalize(text), createdAt: new Date().toISOString() }
      }
    };
  }

  return {
    section,
    title: normalize(text),
    action: { type: 'note', payload: { text: normalize(text) } }
  };
}

function normalize(value: string) {
  const v = value.replace(/^(quero|adicionar|criar|incluir)\s+/i, '').trim();
  if (!v) return 'Novo registro';
  return v.charAt(0).toUpperCase() + v.slice(1);
}
