import type { AgentResponse } from './agent-executor';
import type { LifeArea } from './agent-definitions';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const SELF_EVAL_MODEL = process.env.YOULI_MODEL_FAST || 'claude-3-5-haiku-latest';
const SELF_EVAL_PASS_THRESHOLD = 70;

export interface SelfEvalResult {
  score: number;
  breakdown: {
    relevancia: number;
    acionabilidade: number;
    precisaoContextual: number;
    tomETamanho: number;
  };
  passed: boolean;
}

/**
 * Avalia a qualidade da resposta do agente em 4 critérios (0-100).
 * Usa o modelo fast (Haiku) para manter baixa latência.
 * Se ANTHROPIC_API_KEY não estiver definida, retorna score padrão otimista (75).
 */
export async function selfEvaluate(
  userMessage: string,
  agentResponse: AgentResponse,
): Promise<SelfEvalResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      score: 75,
      breakdown: { relevancia: 22, acionabilidade: 22, precisaoContextual: 19, tomETamanho: 12 },
      passed: true,
    };
  }

  const evalPrompt = `Você é um avaliador de qualidade de respostas de IA. Avalie a resposta do agente abaixo em 4 critérios e retorne APENAS um JSON.

PERGUNTA DO USUÁRIO: "${userMessage}"

RESPOSTA DO AGENTE:
Mensagem: ${agentResponse.message}
Ações: ${agentResponse.actions.join(' | ')}
Insights: ${agentResponse.insights.join(' | ')}

CRITÉRIOS DE AVALIAÇÃO (retorne pontuação inteira dentro dos limites):
- relevancia (0-30): a resposta atende diretamente ao que foi perguntado?
- acionabilidade (0-30): há pelo menos 1 ação concreta executável hoje?
- precisaoContextual (0-25): usa dados específicos do contexto do usuário, não respostas genéricas?
- tomETamanho (0-15): tom adequado, resposta concisa e não verbosa?

Retorne SOMENTE este JSON (sem explicações):
{"relevancia": <int>, "acionabilidade": <int>, "precisaoContextual": <int>, "tomETamanho": <int>}`;

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: SELF_EVAL_MODEL,
        max_tokens: 128,
        messages: [{ role: 'user', content: evalPrompt }],
      }),
    });

    if (!response.ok) throw new Error(`Self-eval API error: ${response.status}`);

    const data = await response.json();
    const text: string = data.content?.[0]?.text || '{}';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in self-eval response');

    const parsed = JSON.parse(jsonMatch[0]) as {
      relevancia?: number;
      acionabilidade?: number;
      precisaoContextual?: number;
      tomETamanho?: number;
    };

    const breakdown = {
      relevancia: Math.min(30, Math.max(0, parsed.relevancia ?? 15)),
      acionabilidade: Math.min(30, Math.max(0, parsed.acionabilidade ?? 15)),
      precisaoContextual: Math.min(25, Math.max(0, parsed.precisaoContextual ?? 12)),
      tomETamanho: Math.min(15, Math.max(0, parsed.tomETamanho ?? 10)),
    };
    const score = breakdown.relevancia + breakdown.acionabilidade + breakdown.precisaoContextual + breakdown.tomETamanho;

    return {
      score,
      breakdown,
      passed: score >= SELF_EVAL_PASS_THRESHOLD,
    };
  } catch (err) {
    console.error('[selfEvaluate] Error:', err);
    // Em caso de erro na avaliação, assumir que passou para não bloquear o fluxo
    return {
      score: 75,
      breakdown: { relevancia: 22, acionabilidade: 22, precisaoContextual: 19, tomETamanho: 12 },
      passed: true,
    };
  }
}

function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

function fallbackActionForArea(area: LifeArea): string {
  const map: Record<LifeArea, string> = {
    dashboard: 'Definir a prioridade numero 1 das proximas 2 horas.',
    tarefas: 'Executar a tarefa com maior prioridade agora.',
    habitos: 'Marcar check-in do habito mais critico hoje.',
    metas: 'Definir o proximo marco mensuravel para esta semana.',
    financeiro: 'Revisar os 3 maiores gastos recentes e definir limite semanal.',
    fitness: 'Executar uma sessao curta de movimento hoje.',
    calendario: 'Bloquear um foco profundo de 60 minutos na agenda.',
    insights: 'Transformar o insight principal em uma acao concreta.',
    foco: 'Remover uma distracao e iniciar o bloco de foco agora.',
    perfil: 'Atualizar objetivo principal e revisar progresso semanal.',
  };
  return map[area];
}

export function applyOutputGuardrails(area: LifeArea, response: AgentResponse): AgentResponse {
  const safeMessage = normalizeText(response.message || '');
  const safeInsights = (response.insights || [])
    .map((x) => normalizeText(x))
    .filter(Boolean)
    .slice(0, 4);
  const safeActions = (response.actions || [])
    .map((x) => normalizeText(x))
    .filter(Boolean)
    .slice(0, 4);

  if (!safeMessage) {
    response.message = `Analise da area ${area} pronta.`;
  } else {
    response.message = safeMessage;
  }

  if (!safeActions.length) {
    safeActions.push(fallbackActionForArea(area));
  }

  response.insights = safeInsights;
  response.actions = safeActions;
  response.confidence = Math.max(0.2, Math.min(0.99, response.confidence || 0.7));
  return response;
}

