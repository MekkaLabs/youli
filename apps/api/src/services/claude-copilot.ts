import type { SystemSection } from './system-assistant';
import { readDb } from '../repositories/local-db';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-4-6';

export async function runClaudeCopilot(userId: string, message: string, section: SystemSection) {
  const db = readDb(userId);
  const profile = db.profile;

  // Contexto compacto do usuário para o prompt
  const context = `
SISTEMA OPERACIONAL PESSOAL — YOULI
Usuário: ${profile.name} | Energia: ${profile.energyProfile} | Fuso: ${profile.timezone}
Objetivos: ${profile.objectives.join(' · ')}
Área atual: ${section}

ESTADO ATUAL:
- Tarefas pendentes: ${db.tasks.filter(t => t.status !== 'done').length} (top: ${db.tasks.find(t => t.status === 'todo')?.title || 'nenhuma'})
- Hábitos ativos: ${db.habits.length} (streak médio: ${Math.round(db.habits.reduce((s, h) => s + h.streak, 0) / Math.max(1, db.habits.length))} dias)
- Meta principal: ${db.goals[0]?.title || 'não definida'} (${db.goals[0]?.progress || 0}%)
- Próximo evento: ${db.calendar[0]?.title || 'nenhum'}
- Último treino: ${db.fitness[0]?.type || 'nenhum'} (${db.fitness[0]?.intensity || '-'})

SQUADS DISPONÍVEIS por área:
- tarefas → Executor Squad (Sun Tzu)
- metas → Momentum Squad (Peter Drucker)  
- habitos → Discipline Squad (Sêneca)
- financeiro → Treasury Squad (Adam Smith)
- insights → Clarity Squad (Carl Jung)
- overview → Atlas Squad (Aristóteles)
`.trim();

  if (!ANTHROPIC_API_KEY) {
    return null; // Usa fallback do life-copilot.ts
  }

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
        max_tokens: 600,
        system: `${context}

Você é o Copilot pessoal do Youli. Responda em português BR.
SEMPRE retorne JSON com esta estrutura exata:
{
  "squad": "<nome do squad recomendado>",
  "agent": "<nome do agente>", 
  "insights": ["<insight 1>", "<insight 2>"],
  "actions": ["<ação concreta 1>", "<ação concreta 2>", "<ação concreta 3>"],
  "urgency": "high"|"medium"|"low",
  "focus": "<uma frase de foco para agora>"
}

Seja direto, prático e específico ao contexto do usuário.`,
        messages: [{ role: 'user', content: message }],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const text = data?.content?.[0]?.text ?? '';
    const parsed = JSON.parse(text);

    return {
      mode: 'claude-copilot',
      model: MODEL,
      message,
      currentSection: section,
      source: { realtime: true, data: 'local-db+claude', claudeActive: true },
      recommendations: [{
        section,
        squad: { id: 'squad-claude', name: parsed.squad, agent: parsed.agent, mission: parsed.focus },
        insights: parsed.insights || [],
        actions: parsed.actions || [],
        confidence: parsed.urgency === 'high' ? 'high' : 'medium',
        focus: parsed.focus,
      }],
    };
  } catch {
    return null;
  }
}
