/**
 * LIFE SIMULATOR — Motor de Simulação de Trajetória de Vida
 * Inspirado no MiroFish: "Ensaiar o futuro em um sandbox digital"
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

export type SimulationHorizon = 30 | 60 | 90 | 180 | 365;
export type ScenarioType = 'current_trajectory' | 'what_if' | 'best_case' | 'worst_case';

export interface LifeSnapshot {
  profile: { name: string; objectives?: string[] };
  tasks: Array<{ title: string; status: string; priority: number }>;
  habits: Array<{ title: string; streak: number; frequency: string }>;
  goals: Array<{ title: string; progress: number; deadline?: string }>;
  finances: { balance: number; income: number; expenses: number };
  fitness: { weeklyActivities: number; goalWeekly: number; lastActivity?: string };
  graphCorrelations?: string[];
}

export interface WhatIfChange {
  area: string;
  change: string;
  magnitude: number;
}

export interface AreaPrediction {
  area: string;
  agentName: string;
  currentState: string;
  projectedState: string;
  keyMetrics: Array<{ name: string; current: string; projected: string; trend: 'up' | 'down' | 'stable' }>;
  risks: string[];
  opportunities: string[];
  confidence: number;
}

export interface SimulationResult {
  scenarioType: ScenarioType;
  horizonDays: SimulationHorizon;
  horizonLabel: string;
  overallScore: number;
  overallTrend: 'improving' | 'declining' | 'stable';
  summary: string;
  predictions: AreaPrediction[];
  criticalInsight: string;
  topOpportunity: string;
  topRisk: string;
  whatIfChanges?: WhatIfChange[];
  generatedAt: Date;
}

const HORIZON_LABELS: Record<number, string> = {
  30: '30 dias', 60: '2 meses', 90: '3 meses', 180: '6 meses', 365: '1 ano'
};

export async function runLifeSimulation(
  snapshot: LifeSnapshot,
  horizonDays: SimulationHorizon = 90,
  scenarioType: ScenarioType = 'current_trajectory',
  whatIfChanges?: WhatIfChange[],
  orchestratorName = 'Youli'
): Promise<SimulationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const horizonLabel = HORIZON_LABELS[horizonDays] || `${horizonDays} dias`;

  if (!apiKey) return generateFallbackSimulation(snapshot, horizonDays, scenarioType, orchestratorName, horizonLabel);

  const systemPrompt = `Você é ${orchestratorName}, motor de simulação de vida inspirado no MiroFish.
Dado o snapshot atual do usuário, projete sua trajetória de vida nos próximos ${horizonDays} dias.

RETORNE APENAS JSON com esta estrutura:
{
  "overallScore": <0-100>,
  "overallTrend": "improving|declining|stable",
  "summary": "<2-3 frases narrativas em pt-BR>",
  "predictions": [
    {
      "area": "<area>",
      "agentName": "<agente histórico>",
      "currentState": "<estado atual 1 frase>",
      "projectedState": "<projeção 1 frase>",
      "keyMetrics": [{"name":"<m>","current":"<v>","projected":"<v>","trend":"up|down|stable"}],
      "risks": ["<risco>"],
      "opportunities": ["<oportunidade>"],
      "confidence": <0-1>
    }
  ],
  "criticalInsight": "<insight mais importante>",
  "topOpportunity": "<maior oportunidade>",
  "topRisk": "<maior risco>"
}

REGRAS: Use dados reais do snapshot. Seja realista. Tom analítico e encorajador. Em português.`;

  const habitSummary = snapshot.habits.map(h => `${h.title}:streak${h.streak}d`).join('|');
  const goalSummary = snapshot.goals.map(g => `${g.title}:${g.progress}%`).join('|');
  const savingsRate = snapshot.finances.income > 0
    ? ((snapshot.finances.income - snapshot.finances.expenses) / snapshot.finances.income * 100).toFixed(1)
    : '0';

  const changes = whatIfChanges?.length
    ? '\nCENÁRIO WHAT-IF:\n' + whatIfChanges.map(c => `- ${c.area}: ${c.change} (${(c.magnitude*100).toFixed(0)}%)`).join('\n')
    : '';

  const userPrompt = `HORIZONTE: ${horizonDays} dias | TIPO: ${scenarioType}
USUÁRIO: ${snapshot.profile.name}
OBJETIVOS: ${snapshot.profile.objectives?.join(', ') || 'não definidos'}
HÁBITOS: ${habitSummary || 'nenhum'}
METAS: ${goalSummary || 'nenhuma'}
FINANÇAS: Saldo R$${snapshot.finances.balance} | Receita R$${snapshot.finances.income} | Gastos R$${snapshot.finances.expenses} | Poupança ${savingsRate}%
FITNESS: ${snapshot.fitness.weeklyActivities}/${snapshot.fitness.goalWeekly} treinos/sem
${snapshot.graphCorrelations?.length ? 'CORRELAÇÕES:\n' + snapshot.graphCorrelations.join('\n') : ''}${changes}

Simule para: tarefas, habitos, metas, financeiro, fitness. Retorne JSON.`;

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: CLAUDE_MODEL, max_tokens: 2000, system: systemPrompt, messages: [{ role: 'user', content: userPrompt }] }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      scenarioType, horizonDays, horizonLabel,
      overallScore: parsed.overallScore || 65,
      overallTrend: parsed.overallTrend || 'stable',
      summary: parsed.summary || '',
      predictions: parsed.predictions || [],
      criticalInsight: parsed.criticalInsight || '',
      topOpportunity: parsed.topOpportunity || '',
      topRisk: parsed.topRisk || '',
      whatIfChanges,
      generatedAt: new Date(),
    };
  } catch (err) {
    console.error('[Simulator]', err);
    return generateFallbackSimulation(snapshot, horizonDays, scenarioType, orchestratorName, horizonLabel);
  }
}

export async function runWhatIfSimulation(
  snapshot: LifeSnapshot,
  changes: WhatIfChange[],
  horizonDays: SimulationHorizon = 90
): Promise<{ current: SimulationResult; withChanges: SimulationResult; delta: string }> {
  const [current, withChanges] = await Promise.all([
    runLifeSimulation(snapshot, horizonDays, 'current_trajectory'),
    runLifeSimulation(snapshot, horizonDays, 'what_if', changes),
  ]);
  const d = withChanges.overallScore - current.overallScore;
  const delta = d > 5 ? `+${d.toFixed(0)} pontos de qualidade de vida em ${current.horizonLabel}.`
    : d < -5 ? `Risco: -${Math.abs(d).toFixed(0)} pontos no período.`
    : 'Impacto neutro — explore outras alavancas.';
  return { current, withChanges, delta };
}

function generateFallbackSimulation(
  snapshot: LifeSnapshot, horizonDays: SimulationHorizon,
  scenarioType: ScenarioType, orchName: string, horizonLabel: string
): SimulationResult {
  const avgStreak = snapshot.habits.reduce((s, h) => s + h.streak, 0) / Math.max(snapshot.habits.length, 1);
  const avgGoal = snapshot.goals.reduce((s, g) => s + g.progress, 0) / Math.max(snapshot.goals.length, 1);
  const fitnessScore = (snapshot.fitness.weeklyActivities / Math.max(snapshot.fitness.goalWeekly, 1)) * 100;
  const sr = snapshot.finances.income > 0 ? ((snapshot.finances.income - snapshot.finances.expenses) / snapshot.finances.income) * 100 : 0;
  const overallScore = Math.min(100, Math.max(0, Math.round((avgStreak/30*100*0.3) + (avgGoal*0.25) + (fitnessScore*0.25) + (Math.max(0,sr)*0.2))));

  return {
    scenarioType, horizonDays, horizonLabel,
    overallScore,
    overallTrend: overallScore > 60 ? 'improving' : overallScore > 40 ? 'stable' : 'declining',
    summary: `${orchName} projeta score ${overallScore}/100 em ${horizonLabel}. Configure ANTHROPIC_API_KEY para simulações completas.`,
    predictions: [],
    criticalInsight: 'Configure a Claude API para insights de simulação detalhados.',
    topOpportunity: 'Consistência de hábitos é o maior alavancador de qualidade de vida.',
    topRisk: sr < 10 ? 'Taxa de poupança crítica.' : 'Metas sem progresso recente.',
    generatedAt: new Date(),
  };
}
