/**
 * Architect Mode — Aider-inspired "Architect Mode"
 * Planejamento de alto nível para metas complexas multi-área.
 */

import fs from 'node:fs';
import path from 'node:path';

export interface ArchitectStep {
  order: number;
  area: string;
  objective: string;
  successCriteria: string;
  dependencies: number[];
  estimatedDays: number;
}

export interface ArchitectPlan {
  id: string;
  userGoal: string;
  areas: string[];
  steps: ArchitectStep[];
  estimatedWeeks: number;
  createdAt: string;
}

export function detectArchitectIntent(message: string): boolean {
  const pattern =
    /planejar|organizar.*vida|objetivo.*longo prazo|estratégia|mudança.*grande|transformação|próximos.*meses|próximo.*ano|mudar.*vida/i;
  return pattern.test(message);
}

function buildMockPlan(userGoal: string): Omit<ArchitectPlan, 'id' | 'createdAt'> {
  return {
    userGoal,
    areas: ['Saúde', 'Carreira', 'Finanças'],
    steps: [
      {
        order: 1,
        area: 'Saúde',
        objective: 'Estabelecer rotina de bem-estar',
        successCriteria: 'Hábito diário mantido por 7 dias consecutivos',
        dependencies: [],
        estimatedDays: 7,
      },
      {
        order: 2,
        area: 'Carreira',
        objective: 'Definir objetivos profissionais claros',
        successCriteria: 'Plano de carreira documentado com 3 metas',
        dependencies: [1],
        estimatedDays: 7,
      },
      {
        order: 3,
        area: 'Finanças',
        objective: 'Criar orçamento mensal estruturado',
        successCriteria: 'Planilha de gastos atualizada com categorias',
        dependencies: [1],
        estimatedDays: 7,
      },
    ],
    estimatedWeeks: 3,
  };
}

export async function buildArchitectPlan(
  userGoal: string,
  context: Record<string, unknown>,
): Promise<ArchitectPlan> {
  const id = `plan_${Date.now()}`;
  const createdAt = new Date().toISOString();

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const model = process.env.YOULI_MODEL_STRONG || 'claude-sonnet-4-6';
      const prompt = `Você é um Life Architect. O usuário quer: '${userGoal}'\nContexto: ${JSON.stringify(context).slice(0, 500)}\nCrie um plano em JSON: { areas: string[], steps: [{order,area,objective,successCriteria,dependencies,estimatedDays}], estimatedWeeks: number }\nRetorne APENAS o JSON.`;

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as {
          content: Array<{ type: string; text: string }>;
        };
        const text = data.content?.[0]?.text ?? '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as {
            areas: string[];
            steps: ArchitectStep[];
            estimatedWeeks: number;
          };
          return { id, userGoal, createdAt, ...parsed };
        }
      }
    } catch {
      // fall through to mock
    }
  }

  return { id, createdAt, ...buildMockPlan(userGoal) };
}

export function formatPlanForResponse(plan: ArchitectPlan): string {
  const stepsText = plan.steps
    .map(
      (s) =>
        `${s.order}. [${s.area}] ${s.objective}\n   ✓ ${s.successCriteria} (${s.estimatedDays}d)`,
    )
    .join('\n');

  return `🏛️ PLANO ESTRATÉGICO
Objetivo: ${plan.userGoal}
Áreas: ${plan.areas.join(', ')}
Estimativa: ${plan.estimatedWeeks} semanas

Steps:
${stepsText}`;
}

function getPlansPath(userId: string): string {
  return path.join(
    process.cwd(),
    `src/repositories/.data/architect-plans-${userId}.json`,
  );
}

export function savePlan(plan: ArchitectPlan, userId: string): void {
  const filePath = getPlansPath(userId);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const plans = loadPlans(userId);
  plans.push(plan);
  fs.writeFileSync(filePath, JSON.stringify(plans, null, 2), 'utf-8');
}

export function loadPlans(userId: string): ArchitectPlan[] {
  const filePath = getPlansPath(userId);
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as ArchitectPlan[];
    }
  } catch {
    // fall through
  }
  return [];
}
