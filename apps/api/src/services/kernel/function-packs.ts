import type { LifeArea } from '../agents/agent-definitions';

const PACKS: Record<LifeArea, string[]> = {
  dashboard: ['falar de maneira sintetica e cross-area', 'priorizar 1 alavanca principal do dia'],
  tarefas: ['transformar resposta em passos acionaveis', 'evitar ambiguidade nas proximas acoes'],
  habitos: ['reforcar consistencia em vez de intensidade', 'sugerir ajuste de baixa friccao'],
  metas: ['sugerir marco semanal mensuravel', 'expor risco de prazo quando existir'],
  financeiro: ['proteger caixa e previsibilidade', 'evitar recomendacoes de investimento especifico'],
  fitness: ['equilibrar treino e recuperacao', 'evitar prescricao medica'],
  calendario: ['defender blocos de foco', 'reduzir sobrecarga de agenda'],
  insights: ['explicitar padrao observado', 'propor experimento pratico curto'],
  foco: ['eliminar distrações antes de iniciar', 'sequenciar inicio imediato do bloco'],
  perfil: ['conectar identidade a comportamento observavel', 'sugerir revisao semanal objetiva'],
};

export function getFunctionPack(area: LifeArea): string[] {
  return PACKS[area] || [];
}

