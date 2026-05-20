import fs from 'node:fs';
import path from 'node:path';
import type { SystemSection } from './system-assistant';
import { readDb } from '../repositories/local-db';

export interface AreaSquad {
  section: SystemSection;
  squadId: string;
  squadName: string;
  agentName: string;
  mission: string;
  downloadedSquadsHint: string[];
}

const AREA_SQUADS: AreaSquad[] = [
  { section: 'overview', squadId: 'squad-overview', squadName: 'Atlas Squad', agentName: 'Aristoteles', mission: 'Integrar vida, clareza e prioridades globais.', downloadedSquadsHint: ['advisory-board', 'c-level-squad'] },
  { section: 'tarefas', squadId: 'squad-exec', squadName: 'Executor Squad', agentName: 'Sun Tzu', mission: 'Transformar intenção em execução objetiva.', downloadedSquadsHint: ['data-squad', 'copy-squad'] },
  { section: 'metas', squadId: 'squad-goals', squadName: 'Momentum Squad', agentName: 'Peter Drucker', mission: 'Converter meta em plano mensurável.', downloadedSquadsHint: ['advisory-board', 'hormozi-squad'] },
  { section: 'habitos', squadId: 'squad-habits', squadName: 'Discipline Squad', agentName: 'Sêneca', mission: 'Criar constância com baixa fricção.', downloadedSquadsHint: ['movement', 'storytelling'] },
  { section: 'calendario', squadId: 'squad-time', squadName: 'Chronos Squad', agentName: 'Benjamin Franklin', mission: 'Otimizar tempo e agenda de alto impacto.', downloadedSquadsHint: ['c-level-squad'] },
  { section: 'insights', squadId: 'squad-insight', squadName: 'Clarity Squad', agentName: 'Carl Jung', mission: 'Extrair padrões e recomendações práticas.', downloadedSquadsHint: ['data-squad', 'storytelling'] },
  { section: 'fitness', squadId: 'squad-health', squadName: 'Vital Squad', agentName: 'Hipocrates', mission: 'Elevar energia física para sustentar performance.', downloadedSquadsHint: ['movement'] },
  { section: 'financeiro', squadId: 'squad-finance', squadName: 'Treasury Squad', agentName: 'Adam Smith', mission: 'Maximizar saúde financeira e decisões econômicas.', downloadedSquadsHint: ['advisory-board', 'data-squad'] },
  { section: 'perfil', squadId: 'squad-identity', squadName: 'Identity Squad', agentName: 'Leonardo da Vinci', mission: 'Alinhar identidade, propósito e narrativa pessoal.', downloadedSquadsHint: ['brand-squad', 'storytelling'] },
  { section: 'memoria', squadId: 'squad-memory', squadName: 'Archive Squad', agentName: 'Marie Curie', mission: 'Organizar memória útil para decisões melhores.', downloadedSquadsHint: ['data-squad'] },
  { section: 'orquestracao', squadId: 'squad-orch', squadName: 'Orchestration Squad', agentName: 'Alan Turing', mission: 'Orquestrar squads com precisão contextual.', downloadedSquadsHint: ['claude-code-mastery', 'cybersecurity'] }
];

export function getAreaSquads() {
  return AREA_SQUADS;
}

export function getDownloadedSquadNames() {
  const base = process.env.SQUADS_PATH || path.join(process.env.HOME || '', 'Downloads', 'squads');
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base).filter((x) => fs.statSync(path.join(base, x)).isDirectory());
}

export function orchestrateLifeCopilot(userId: string, message: string, currentSection: SystemSection = 'overview') {
  const db = readDb(userId);
  const sections = detectSections(message, currentSection);
  const downloaded = getDownloadedSquadNames();

  const recommendations = sections.map((section) => {
    const squad = AREA_SQUADS.find((s) => s.section === section)!;
    const hints = buildSectionInsights(section, db);
    const matchedDownloaded = squad.downloadedSquadsHint.filter((name) => downloaded.includes(name));

    return {
      section,
      squad: {
        id: squad.squadId,
        name: squad.squadName,
        agent: squad.agentName,
        mission: squad.mission,
        linkedDownloadedSquads: matchedDownloaded
      },
      insights: hints.insights,
      actions: hints.actions,
      confidence: hints.confidence
    };
  });

  return {
    mode: 'jarvis-life-copilot',
    message,
    currentSection,
    source: {
      realtime: true,
      data: 'local-db',
      downloadedSquads: downloaded.length
    },
    recommendations
  };
}

function detectSections(message: string, fallback: SystemSection): SystemSection[] {
  const low = message.toLowerCase();
  const map: Array<[RegExp, SystemSection]> = [
    [/(tarefa|execut|prioridade|entrega)/, 'tarefas'],
    [/(meta|objetivo|resultado)/, 'metas'],
    [/(hábito|habito|rotina|disciplina)/, 'habitos'],
    [/(agenda|calend[aá]rio|hor[aá]rio|evento)/, 'calendario'],
    [/(insight|padr[aã]o|reflex[aã]o)/, 'insights'],
    [/(treino|fitness|sa[úu]de|energia)/, 'fitness'],
    [/(finance|dinheiro|gasto|receita|open finance)/, 'financeiro'],
    [/(perfil|identidade|curr[íi]culo)/, 'perfil'],
    [/(mem[oó]ria|hist[oó]rico|contexto)/, 'memoria'],
    [/(squad|orquestr|copiloto|jarvis)/, 'orquestracao']
  ];

  const found = map.filter(([re]) => re.test(low)).map(([, s]) => s);
  if (!found.length) return [fallback, 'overview'];
  return Array.from(new Set(found));
}

function buildSectionInsights(section: SystemSection, db: ReturnType<typeof readDb>) {
  if (section === 'tarefas') {
    const pending = db.tasks.filter((t) => t.status !== 'done');
    const top = pending.sort((a, b) => b.priority - a.priority).slice(0, 2);
    return {
      confidence: 'high',
      insights: [`${pending.length} tarefas pendentes`, `Top prioridade: ${top[0]?.title || 'N/A'}`],
      actions: top.map((t) => `Executar agora: ${t.title}`)
    };
  }
  if (section === 'metas') {
    const g = db.goals[0];
    return {
      confidence: 'medium',
      insights: [`Meta principal: ${g?.title || 'N/A'}`, `Progresso atual: ${g?.progress || 0}%`],
      actions: ['Definir marco semanal com métrica explícita', 'Vincular 1 tarefa diária à meta']
    };
  }
  if (section === 'habitos') {
    const strong = db.habits.filter((h) => h.streak >= 3).length;
    return {
      confidence: 'high',
      insights: [`${db.habits.length} hábitos ativos`, `${strong} hábitos com consistência alta`],
      actions: ['Manter horário fixo para treino', 'Registrar check-in noturno 00:00']
    };
  }
  if (section === 'calendario') {
    return {
      confidence: 'medium',
      insights: [`${db.calendar.length} eventos na agenda`, `Próximo evento: ${db.calendar[0]?.title || 'N/A'}`],
      actions: ['Bloquear janela de foco antes do treino', 'Agrupar tarefas externas no mesmo bloco']
    };
  }
  if (section === 'insights') {
    return {
      confidence: 'high',
      insights: db.insights.slice(0, 2).map((i) => i.summary),
      actions: ['Transformar insight em tarefa concreta', 'Revisar padrão ao fim do dia']
    };
  }
  if (section === 'fitness') {
    const last = db.fitness[0];
    return {
      confidence: 'medium',
      insights: [`Último treino: ${last?.type || 'N/A'}`, `Intensidade recente: ${last?.intensity || 'N/A'}`],
      actions: ['Planejar recuperação ativa amanhã', 'Sincronizar treino com bloco de trabalho profundo']
    };
  }
  if (section === 'financeiro') {
    return {
      confidence: 'medium',
      insights: ['Open Finance conectado', 'Recomendado revisar despesas semanais por categoria'],
      actions: ['Definir teto de gasto semanal', 'Relacionar gasto com metas de receita']
    };
  }
  if (section === 'perfil') {
    return {
      confidence: 'high',
      insights: [`Perfil: ${db.profile.name}`, `Objetivo central: ${db.profile.objectives?.[0] || 'N/A'}`],
      actions: ['Manter módulos focados no momento atual', 'Atualizar narrativa de progresso semanal']
    };
  }
  if (section === 'memoria') {
    return {
      confidence: 'low',
      insights: [`${db.memory.length} memórias registradas`, 'Base de contexto em evolução'],
      actions: ['Registrar decisões importantes diariamente', 'Marcar padrões de alta performance']
    };
  }
  if (section === 'orquestracao') {
    return {
      confidence: 'high',
      insights: ['Copiloto unificado ativo', 'Squads por área prontos para decisão assistida'],
      actions: ['Usar comando global para decisões críticas', 'Validar recomendações por área antes da execução']
    };
  }

  return {
    confidence: 'medium',
    insights: ['Visão macro consolidada'],
    actions: ['Focar 1 prioridade e 1 hábito hoje']
  };
}
