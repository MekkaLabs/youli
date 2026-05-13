import type { Habit, UserProfile } from '@youli/shared';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

export async function interpretHabit(message: string, profile?: Partial<UserProfile>): Promise<Omit<Habit, 'id'>> {
  if (!ANTHROPIC_API_KEY) return fallback(message);

  const context = profile
    ? `Usuário: ${profile.name}. Objetivos: ${(profile.objectives || []).join(', ')}. Rotina: ${(profile.routine || []).join(', ')}.`
    : '';

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        system: `Você interpreta descrições de hábitos pessoais e retorna JSON estruturado.
${context}
Responda APENAS com JSON: {"title": "<título limpo>", "frequency": "daily"|"weekly", "streak": 0}
Regras: título deve ser claro e motivador, sem gerúndio. frequency=daily se todo dia, weekly se semanal/2-3x/semana.`,
        messages: [{ role: 'user', content: `Crie um hábito a partir de: "${message}"` }],
      }),
    });

    if (!response.ok) return fallback(message);
    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);
    return {
      title: parsed.title || normalize(message),
      frequency: parsed.frequency === 'weekly' ? 'weekly' : 'daily',
      streak: 0,
    };
  } catch {
    return fallback(message);
  }
}

function fallback(message: string): Omit<Habit, 'id'> {
  const freq: Habit['frequency'] = /(semana|semanal|2x|3x|4x|5x)/.test(message.toLowerCase()) ? 'weekly' : 'daily';
  return { title: normalize(message), frequency: freq, streak: 0 };
}

function normalize(s: string) {
  const v = s.replace(/^(quero|criar|adicionar|incluir|fazer)\s+/i, '').trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : 'Novo hábito';
}
