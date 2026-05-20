/**
 * POST /api/simulate/what-if
 * Recebe um cenário hipotético em linguagem natural e retorna
 * uma análise do impacto nas métricas de vida (90 dias)
 */
import { NextRequest, NextResponse } from 'next/server';
import { logError } from '@/lib/http';

interface WhatIfRequest {
  scenario: string;
  currentMetrics?: {
    habitRate?: number;
    goalProgress?: number;
    savingsRate?: number;
  };
}

interface WhatIfResponse {
  analysis: string;
  impact: {
    habits: number;    // delta percentual
    goals: number;
    finance: number;
    overall: number;
  };
  risks: string[];
  opportunities: string[];
  timeToEffect: string;
}

// Análise baseada em palavras-chave enquanto não há LLM conectado
function analyzeScenario(scenario: string, metrics: WhatIfRequest['currentMetrics']): WhatIfResponse {
  const s = scenario.toLowerCase();

  // Cenários de exercício / saúde
  if (s.includes('academia') || s.includes('exerc') || s.includes('corrida') || s.includes('treino')) {
    return {
      analysis: 'Adicionar exercícios regulares cria um efeito cascata positivo: melhora a energia para hábitos matinais, aumenta a disciplina financeira e acelera o progresso em metas.',
      impact: { habits: +18, goals: +12, finance: +8, overall: +15 },
      risks: ['Lesões por excesso no início', 'Custo de academia ou equipamentos'],
      opportunities: ['Mais energia para tarefas complexas', 'Redução de gastos com saúde a longo prazo', 'Melhora de sono e foco'],
      timeToEffect: '2–3 semanas',
    };
  }

  // Cenários de renda / trabalho
  if (s.includes('salário') || s.includes('renda') || s.includes('freelance') || s.includes('emprego') || s.includes('trabalho')) {
    return {
      analysis: 'Mudanças de renda têm impacto direto na capacidade de poupança e investimento. Com planejamento, um aumento de renda pode acelerar significativamente suas metas financeiras.',
      impact: { habits: +5, goals: +20, finance: +25, overall: +18 },
      risks: ['Aumento de gastos proporcionais à nova renda (lifestyle inflation)', 'Instabilidade em renda variável'],
      opportunities: ['Aportes maiores em investimentos', 'Quitar dívidas mais rápido', 'Margem para emergências'],
      timeToEffect: '1 mês',
    };
  }

  // Cenários de gastos / corte
  if (s.includes('gastar menos') || s.includes('cortar') || s.includes('economizar') || s.includes('poupar')) {
    return {
      analysis: 'Reduzir gastos supérfluos é uma das alavancas mais rápidas para melhorar a saúde financeira. Cada real economizado pode ser redirecionado para metas.',
      impact: { habits: +8, goals: +15, finance: +30, overall: +18 },
      risks: ['Privação excessiva pode gerar rebote de gastos', 'Reduzir investimentos em desenvolvimento pessoal'],
      opportunities: ['Taxa de poupança aumenta imediatamente', 'Clareza sobre o que realmente importa', 'Aceleração da liberdade financeira'],
      timeToEffect: '1–2 semanas',
    };
  }

  // Cenários de hábitos / rotina
  if (s.includes('dormir') || s.includes('sono') || s.includes('acordar') || s.includes('rotina') || s.includes('hábito')) {
    return {
      analysis: 'Otimizar a rotina e o sono é o fundamento de tudo. Dormir bem melhora tomada de decisão, produtividade e até controle financeiro impulsivo.',
      impact: { habits: +25, goals: +15, finance: +10, overall: +20 },
      risks: ['Curva de adaptação de 2–3 semanas', 'Conflitos sociais noturnos'],
      opportunities: ['Mais horas produtivas pela manhã', 'Redução de decisões impulsivas', 'Melhor recuperação física'],
      timeToEffect: '2–3 semanas',
    };
  }

  // Cenários de investimento
  if (s.includes('invest') || s.includes('ação') || s.includes('criptomoeda') || s.includes('fundo') || s.includes('tesouro')) {
    return {
      analysis: 'Começar a investir regularmente ativa o poder dos juros compostos. Mesmo valores pequenos mensais geram impacto expressivo em 5–10 anos.',
      impact: { habits: +5, goals: +18, finance: +35, overall: +22 },
      risks: ['Volatilidade de mercado', 'Liquidez reduzida', 'Curva de aprendizado'],
      opportunities: ['Patrimônio crescendo enquanto você dorme', 'Proteção contra inflação', 'Independência financeira mais rápida'],
      timeToEffect: '3–6 meses para resultados visíveis',
    };
  }

  // Cenário genérico / fallback
  return {
    analysis: `Analisando o cenário "${scenario}": mudanças de comportamento levam em média 3–4 semanas para se consolidar como hábitos. O impacto nas suas métricas depende da consistência e da integração com sua rotina atual.`,
    impact: { habits: +10, goals: +10, finance: +5, overall: +8 },
    risks: ['Resistência à mudança nas primeiras semanas', 'Conflito com hábitos existentes'],
    opportunities: ['Crescimento pessoal', 'Efeito cascata positivo em outras áreas', 'Aumento de autoconfiança'],
    timeToEffect: '3–4 semanas',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: WhatIfRequest = await req.json();
    const { scenario, currentMetrics = {} } = body;

    if (!scenario || typeof scenario !== 'string') {
      return NextResponse.json({ error: 'scenario is required' }, { status: 400 });
    }

    const result = analyzeScenario(scenario.trim(), currentMetrics);
    return NextResponse.json(result);
  } catch (err) {
    logError('POST /api/simulate/what-if', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
