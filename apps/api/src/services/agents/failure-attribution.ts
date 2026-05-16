/**
 * Failure Attribution Engine — SWE-CI-inspired Failure Attribution
 * Quando uma meta/hábito falha, atribui sistematicamente a causa raiz.
 * Inspirado no sistema de atribuição de falhas de testes do SWE-CI.
 */

export type FailureCause =
  | 'planning_gap'
  | 'motivation_collapse'
  | 'external_blocker'
  | 'dependency_failure'
  | 'resource_constraint'
  | 'habit_not_formed'
  | 'unknown';

export interface FailureCauseWeight {
  cause: FailureCause;
  weight: number;
  evidence: string;
}

export interface FailureAttribution {
  id: string;
  area: string;
  failedItem: string;
  failedOn: string;
  causes: FailureCauseWeight[];
  primaryCause: FailureCause;
  suggestedFix: string;
  preventionAction: string;
  confidence: number;
}

const SUGGESTED_FIXES: Record<FailureCause, string> = {
  planning_gap:
    'Redefina o objetivo com critérios SMART (Específico, Mensurável, Atingível, Relevante, Temporal).',
  motivation_collapse:
    'Revise o "porquê" por trás da meta. Considere reduzir o escopo para recuperar a momentum.',
  external_blocker:
    'Mapeie os bloqueios externos e crie planos de contingência para cada um.',
  dependency_failure:
    'Identifique a área dependente e resolva o problema raiz antes de continuar.',
  resource_constraint:
    'Realoque recursos (tempo/dinheiro) ou reduza o escopo para o que é viável agora.',
  habit_not_formed:
    'Reduza a ação mínima diária até que seja irresistível. Foque em não quebrar a sequência.',
  unknown:
    'Realize uma retrospectiva detalhada para identificar a causa raiz antes de continuar.',
};

const PREVENTION_ACTIONS: Record<FailureCause, string> = {
  planning_gap:
    'Antes de iniciar qualquer meta, documente os critérios de sucesso e marcos intermediários.',
  motivation_collapse:
    'Crie um sistema de recompensas para marcos e conecte a meta a valores pessoais profundos.',
  external_blocker:
    'Reserve tempo semanal para antecipar e mitigar bloqueios externos conhecidos.',
  dependency_failure:
    'Monitore métricas das áreas interdependentes semanalmente para detectar degradações cedo.',
  resource_constraint:
    'Defina orçamento de tempo e dinheiro para cada área antes de assumir compromissos.',
  habit_not_formed:
    'Criar ancoragem de hábito: associar à atividade já estabelecida na rotina.',
  unknown:
    'Implementar check-in semanal para detectar sinais de falha precocemente.',
};

function normalizeWeights(causes: FailureCauseWeight[]): FailureCauseWeight[] {
  const total = causes.reduce((sum, c) => sum + c.weight, 0);
  if (total === 0) return causes;
  return causes.map((c) => ({ ...c, weight: parseFloat((c.weight / total).toFixed(2)) }));
}

export function attributeFailure(
  area: string,
  failedItem: string,
  context: Record<string, unknown>
): FailureAttribution {
  const causes: FailureCauseWeight[] = [];

  // habits.streak < 21 → habit_not_formed
  const habits = context.habits as Record<string, unknown> | undefined;
  const streak = typeof habits?.streak === 'number' ? habits.streak : null;
  if (streak !== null && streak < 21) {
    causes.push({
      cause: 'habit_not_formed',
      weight: 0.6,
      evidence: `Streak atual de ${streak} dias — hábito ainda não consolidado (< 21 dias)`,
    });
  }

  // context.tasks many 'doing' → external_blocker
  const tasks = context.tasks as unknown[] | undefined;
  if (Array.isArray(tasks)) {
    const doingCount = tasks.filter(
      (t) => typeof t === 'object' && t !== null && (t as Record<string, unknown>).status === 'doing'
    ).length;
    if (doingCount >= 3) {
      causes.push({
        cause: 'external_blocker',
        weight: 0.5,
        evidence: `${doingCount} tarefas em andamento simultâneo — sobrecarga detectada`,
      });
    }
  }

  // goals.progress fell → motivation_collapse
  const goals = context.goals as Record<string, unknown> | undefined;
  const goalProgress = typeof goals?.progress === 'number' ? goals.progress : null;
  if (goalProgress !== null && goalProgress < 40) {
    causes.push({
      cause: 'motivation_collapse',
      weight: 0.4,
      evidence: `Progresso de metas em ${goalProgress}% — possível perda de motivação`,
    });
  }

  // finances.balance < 0 → resource_constraint
  const finances = context.finances as Record<string, unknown> | undefined;
  const balance = typeof finances?.balance === 'number' ? finances.balance : null;
  if (balance !== null && balance < 0) {
    causes.push({
      cause: 'resource_constraint',
      weight: 0.3,
      evidence: `Saldo financeiro negativo (${balance}) — recursos limitados para sustentar a meta`,
    });
  }

  // Check for dependency failures across areas
  const areaScore = context.areaScore as Record<string, number> | undefined;
  if (areaScore) {
    const lowAreas = Object.entries(areaScore)
      .filter(([a, score]) => a !== area && score < 30)
      .map(([a]) => a);
    if (lowAreas.length > 0) {
      causes.push({
        cause: 'dependency_failure',
        weight: 0.35,
        evidence: `Áreas interdependentes com score baixo: ${lowAreas.join(', ')}`,
      });
    }
  }

  // planning_gap if no structured goal data
  if (!goals?.milestones && !goals?.criteria) {
    causes.push({
      cause: 'planning_gap',
      weight: 0.25,
      evidence: 'Ausência de marcos ou critérios documentados para a meta',
    });
  }

  // Always add unknown with residual weight
  const residualWeight = Math.max(0.05, 1 - causes.reduce((s, c) => s + c.weight, 0));
  causes.push({
    cause: 'unknown',
    weight: parseFloat(residualWeight.toFixed(2)),
    evidence: 'Possível causa não identificada pelos indicadores disponíveis',
  });

  const normalized = normalizeWeights(causes);
  const primaryCause = normalized.reduce((max, c) => (c.weight > max.weight ? c : max)).cause;

  const confidence = Math.min(
    0.95,
    normalized.filter((c) => c.cause !== 'unknown').reduce((s, c) => s + c.weight, 0)
  );

  return {
    id: `attr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    area,
    failedItem,
    failedOn: new Date().toISOString(),
    causes: normalized,
    primaryCause,
    suggestedFix: SUGGESTED_FIXES[primaryCause],
    preventionAction: PREVENTION_ACTIONS[primaryCause],
    confidence: parseFloat(confidence.toFixed(2)),
  };
}

export async function attributeFailureWithAI(
  area: string,
  failedItem: string,
  context: Record<string, unknown>
): Promise<FailureAttribution> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return attributeFailure(area, failedItem, context);
  }

  try {
    const prompt = `Você é um especialista em análise de falhas de metas pessoais. Analise esta falha:
Área: ${area}
Item que falhou: ${failedItem}
Contexto: ${JSON.stringify(context)}

Identifique as causas raiz desta falha. As causas possíveis são:
- planning_gap: falta de planejamento ou metas vagas
- motivation_collapse: perda de motivação ou burnout
- external_blocker: bloqueios externos (trabalho, família)
- dependency_failure: outra área de vida impactou negativamente
- resource_constraint: tempo ou dinheiro insuficiente
- habit_not_formed: hábito não consolidado (< 21 dias)
- unknown: causa não identificada

Retorne APENAS JSON com: { causes: [{cause, weight (0-1), evidence}], primaryCause, suggestedFix, preventionAction }`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = (await response.json()) as {
      content: Array<{ type: string; text: string }>;
    };
    const text = data.content[0]?.text ?? '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]) as Partial<{
      causes: FailureCauseWeight[];
      primaryCause: FailureCause;
      suggestedFix: string;
      preventionAction: string;
    }>;

    const base = attributeFailure(area, failedItem, context);

    return {
      ...base,
      causes: Array.isArray(parsed.causes) ? normalizeWeights(parsed.causes) : base.causes,
      primaryCause: parsed.primaryCause ?? base.primaryCause,
      suggestedFix: parsed.suggestedFix ?? base.suggestedFix,
      preventionAction: parsed.preventionAction ?? base.preventionAction,
    };
  } catch {
    return attributeFailure(area, failedItem, context);
  }
}

export function generatePreventionPlan(attribution: FailureAttribution): string[] {
  const THRESHOLD = 0.2;

  const significantCauses = attribution.causes.filter(
    (c) => c.weight > THRESHOLD && c.cause !== 'unknown'
  );

  if (significantCauses.length === 0) {
    return [PREVENTION_ACTIONS['unknown']];
  }

  return significantCauses.map((c) => PREVENTION_ACTIONS[c.cause]);
}

export function formatAttribution(attribution: FailureAttribution): string {
  return `⚠️ ${attribution.area}: ${attribution.failedItem} falhou. Causa principal: ${attribution.primaryCause}. ${attribution.suggestedFix}`;
}
