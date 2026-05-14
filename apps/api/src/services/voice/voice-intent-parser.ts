/**
 * Voice Intent Parser
 * Converte texto transcrito (Handy ou expo-speech) em comandos estruturados Youli
 * Detecta agente-alvo, intenção e extrai entidades (nome, data, valor, área)
 */

import { LifeArea } from '../agents/agent-definitions';

export type VoiceIntentType =
  | 'create_task'
  | 'create_habit'
  | 'create_goal'
  | 'log_workout'
  | 'log_expense'
  | 'log_income'
  | 'ask_agent'
  | 'morning_briefing'
  | 'run_simulation'
  | 'check_status'
  | 'unknown';

export interface VoiceIntent {
  type: VoiceIntentType;
  area: LifeArea;
  agentName: string;
  rawText: string;
  entities: {
    title?: string;
    value?: number;
    category?: string;
    date?: string;
    duration?: string;
    priority?: 'baixa' | 'normal' | 'alta' | 'urgente';
    horizon?: number; // days for simulation
    whatIf?: string;
  };
  confidence: number; // 0-1
  routeToOrchestrator: boolean; // true = send to /orchestrate, false = send to /agent/[area]
}

// Mapa de ativações por nome do agente histórico
const AGENT_TRIGGERS: Record<string, LifeArea> = {
  // Benjamin Franklin → tarefas
  'franklin': 'tarefas',
  'benjamin': 'tarefas',
  'franky': 'tarefas',
  // Aristóteles → hábitos
  'aristóteles': 'habitos',
  'aristoteles': 'habitos',
  'ari': 'habitos',
  // Alexandre → metas
  'alexandre': 'metas',
  'alex': 'metas',
  // Adam Smith → financeiro
  'adam': 'financeiro',
  'smith': 'financeiro',
  // Hipócrates → fitness
  'hipócrates': 'fitness',
  'hipos': 'fitness',
  'hipocrates': 'fitness',
  // Newton → calendário
  'newton': 'calendario',
  // Sócrates → insights
  'sócrates': 'insights',
  'socrates': 'insights',
  // Tesla → foco
  'tesla': 'foco',
  // Marco Aurélio → perfil
  'marco': 'perfil',
  'aurélio': 'perfil',
  // Leonardo → dashboard
  'leonardo': 'dashboard',
  'leo': 'dashboard',
};

// Padrões de criação de tarefas
const TASK_PATTERNS = [
  /(?:adiciona?|cria?|anota?|lembra?)\s+(?:a\s+)?tarefa[:\s]+(.+)/i,
  /(?:franklin)[,\s]+(?:adiciona?|cria?|coloca?)\s+(?:a\s+)?tarefa[:\s]+(.+)/i,
  /(?:tarefa|task)[:\s]+(.+)/i,
  /(?:preciso|tenho que|tem que)\s+(.+)/i,
  /(?:to[- ]?do)[:\s]+(.+)/i,
];

// Padrões de hábitos
const HABIT_PATTERNS = [
  /(?:adiciona?|cria?|registra?)\s+(?:o\s+)?hábito[:\s]+(.+)/i,
  /(?:aristóteles)[,\s]+(?:novo|adiciona?|registra?)\s+hábito[:\s]+(.+)/i,
  /(?:hábito|habito)[:\s]+(.+)/i,
];

// Padrões de metas
const GOAL_PATTERNS = [
  /(?:adiciona?|cria?|define?)\s+(?:a\s+)?meta[:\s]+(.+)/i,
  /(?:alexandre)[,\s]+(?:nova|cria?|define?)\s+meta[:\s]+(.+)/i,
  /(?:meta|objetivo)[:\s]+(.+)/i,
  /(?:quero|preciso)\s+(?:alcançar|atingir|chegar|conquistar)\s+(.+)/i,
];

// Padrões de gasto/receita
const EXPENSE_PATTERNS = [
  /(?:gastei|gasto|paguei|comprei)\s+(.+)/i,
  /(?:adam|smith)[,\s]+(?:registra?|anota?)\s+(?:gasto|despesa)[:\s]+(.+)/i,
  /(?:gasto|despesa|pagamento)[:\s]+(.+)/i,
];
const INCOME_PATTERNS = [
  /(?:recebi|ganhei|entrou)\s+(.+)/i,
  /(?:renda|receita|salário|entrada)[:\s]+(.+)/i,
];

// Padrões de treino/fitness
const WORKOUT_PATTERNS = [
  /(?:fiz|fiz|treinei|corri|nadei|pedalei|academia)\s+(.+)/i,
  /(?:hipócrates|hipocrates)[,\s]+(?:registra?|anota?)\s+treino[:\s]+(.+)/i,
  /(?:treino|exercício|atividade|workout)[:\s]+(.+)/i,
];

// Padrões de simulação
const SIMULATION_PATTERNS = [
  /(?:simula?|projeta?|prev[êe])\s+(.+)/i,
  /(?:e\s+se|e se eu|e se a|o que acontece se)\s+(.+)/i,
  /(?:o\s+que|qual[,\s])\s+(?:seria|ficaria|aconteceria)\s+(.+)/i,
  /(?:30|60|90|180)\s+dias?\s+(?:de|com|fazendo)\s+(.+)/i,
];

// Padrões de consulta a agente
const ASK_PATTERNS = [
  /(?:pergunta|me fala|como\s+(?:estão|está|anda[m]?))\s+(.+)/i,
  /(?:status|situação)\s+(?:do|da|de)\s+(.+)/i,
  /como\s+estou\s+(?:em|no|na|com)\s+(.+)/i,
];

// Padrões de briefing matinal
const MORNING_PATTERNS = [
  /(?:bom\s+dia|boa\s+manhã|morning|briefing)/i,
  /(?:resumo|resumão)\s+(?:do\s+dia|de\s+hoje|matinal)/i,
  /o\s+que\s+(?:tenho|tem)\s+(?:hoje|para\s+hoje)/i,
];

// Extrai valor monetário de uma string
function extractMoney(text: string): number | undefined {
  const match = text.match(/R?\$?\s*([\d.,]+)/);
  if (!match) return undefined;
  return parseFloat(match[1].replace('.', '').replace(',', '.'));
}

// Extrai prioridade
function extractPriority(text: string): VoiceIntent['entities']['priority'] {
  if (/urgente|urgentíssimo|imediato/i.test(text)) return 'urgente';
  if (/alta|importante|prioritário/i.test(text)) return 'alta';
  if (/baixa|depois|quando\s+der/i.test(text)) return 'baixa';
  return 'normal';
}

// Extrai horizonte de simulação em dias
function extractHorizon(text: string): number {
  const match = text.match(/(\d+)\s*dias?/i);
  if (match) {
    const days = parseInt(match[1]);
    if ([30, 60, 90, 180, 365].includes(days)) return days;
    if (days <= 45) return 30;
    if (days <= 75) return 60;
    if (days <= 120) return 90;
    return 180;
  }
  if (/mês|mensal/i.test(text)) return 30;
  if (/trimestre/i.test(text)) return 90;
  if (/semestre/i.test(text)) return 180;
  if (/ano|anual/i.test(text)) return 365;
  return 90; // default
}

// Detecta agente pelo nome mencionado no texto
function detectAgentFromText(text: string): { area: LifeArea; agentName: string } | null {
  const lower = text.toLowerCase();
  for (const [trigger, area] of Object.entries(AGENT_TRIGGERS)) {
    if (lower.includes(trigger)) {
      return { area, agentName: trigger };
    }
  }
  return null;
}

// Mapeia área para nome do agente histórico
const AREA_TO_AGENT: Record<LifeArea, string> = {
  dashboard: 'Leonardo',
  tarefas: 'Franklin',
  habitos: 'Aristóteles',
  metas: 'Alexandre',
  financeiro: 'Adam',
  fitness: 'Hipócrates',
  calendario: 'Newton',
  insights: 'Sócrates',
  foco: 'Tesla',
  perfil: 'Marco Aurélio',
};

/**
 * Principal: parseia texto transcrito e retorna VoiceIntent estruturado
 */
export function parseVoiceIntent(rawText: string): VoiceIntent {
  const text = rawText.trim();
  const lower = text.toLowerCase();

  // Detecta agente mencionado explicitamente
  const agentHit = detectAgentFromText(text);

  // 1. Briefing matinal
  for (const pattern of MORNING_PATTERNS) {
    if (pattern.test(text)) {
      return {
        type: 'morning_briefing',
        area: 'dashboard',
        agentName: agentHit?.agentName ?? 'Leonardo',
        rawText: text,
        entities: {},
        confidence: 0.95,
        routeToOrchestrator: true,
      };
    }
  }

  // 2. Criar tarefa
  for (const pattern of TASK_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const title = match[1]?.trim();
      return {
        type: 'create_task',
        area: 'tarefas',
        agentName: 'Franklin',
        rawText: text,
        entities: {
          title,
          priority: extractPriority(title ?? text),
        },
        confidence: 0.9,
        routeToOrchestrator: false,
      };
    }
  }

  // 3. Criar hábito
  for (const pattern of HABIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'create_habit',
        area: 'habitos',
        agentName: 'Aristóteles',
        rawText: text,
        entities: { title: match[1]?.trim() },
        confidence: 0.9,
        routeToOrchestrator: false,
      };
    }
  }

  // 4. Criar meta
  for (const pattern of GOAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'create_goal',
        area: 'metas',
        agentName: 'Alexandre',
        rawText: text,
        entities: { title: match[1]?.trim() },
        confidence: 0.88,
        routeToOrchestrator: false,
      };
    }
  }

  // 5. Registrar gasto
  for (const pattern of EXPENSE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'log_expense',
        area: 'financeiro',
        agentName: 'Adam',
        rawText: text,
        entities: {
          title: match[1]?.trim(),
          value: extractMoney(text),
          category: /alimentação|comida|restaurante/i.test(text) ? 'alimentação'
            : /transporte|uber|gasolina/i.test(text) ? 'transporte'
            : /saúde|médico|remédio/i.test(text) ? 'saúde'
            : 'outros',
        },
        confidence: 0.88,
        routeToOrchestrator: false,
      };
    }
  }

  // 6. Registrar receita
  for (const pattern of INCOME_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'log_income',
        area: 'financeiro',
        agentName: 'Adam',
        rawText: text,
        entities: {
          title: match[1]?.trim(),
          value: extractMoney(text),
          category: 'receita',
        },
        confidence: 0.85,
        routeToOrchestrator: false,
      };
    }
  }

  // 7. Registrar treino
  for (const pattern of WORKOUT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const durationMatch = text.match(/(\d+)\s*(?:min|minuto|hora|h)/i);
      return {
        type: 'log_workout',
        area: 'fitness',
        agentName: 'Hipócrates',
        rawText: text,
        entities: {
          title: match[1]?.trim(),
          duration: durationMatch ? durationMatch[0] : undefined,
        },
        confidence: 0.87,
        routeToOrchestrator: false,
      };
    }
  }

  // 8. Simulação
  for (const pattern of SIMULATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const isWhatIf = /e\s+se|o\s+que\s+acontece/i.test(text);
      return {
        type: 'run_simulation',
        area: 'dashboard',
        agentName: 'Leonardo',
        rawText: text,
        entities: {
          horizon: extractHorizon(text),
          whatIf: isWhatIf ? match[1]?.trim() : undefined,
        },
        confidence: 0.82,
        routeToOrchestrator: true,
      };
    }
  }

  // 9. Consulta status
  for (const pattern of ASK_PATTERNS) {
    if (pattern.test(text)) {
      const area = agentHit?.area ?? 'dashboard';
      return {
        type: 'check_status',
        area,
        agentName: agentHit?.agentName
          ? (AREA_TO_AGENT[agentHit.area] ?? 'Leonardo')
          : 'Leonardo',
        rawText: text,
        entities: {},
        confidence: 0.78,
        routeToOrchestrator: !agentHit,
      };
    }
  }

  // 10. Pergunta para agente específico
  if (agentHit) {
    return {
      type: 'ask_agent',
      area: agentHit.area,
      agentName: AREA_TO_AGENT[agentHit.area],
      rawText: text,
      entities: {},
      confidence: 0.75,
      routeToOrchestrator: false,
    };
  }

  // Fallback: manda para orquestrador
  return {
    type: 'unknown',
    area: 'dashboard',
    agentName: 'Leonardo',
    rawText: text,
    entities: {},
    confidence: 0.4,
    routeToOrchestrator: true,
  };
}

/**
 * Gera o prompt Handy de pós-processamento
 * Cole este texto no campo "Post-processing prompt" do Handy
 */
export const HANDY_POST_PROCESSING_PROMPT = `Você é o assistente de voz do Youli, um app de gestão de vida.

Transforme o texto transcrito abaixo em um comando claro e direto para o Youli.

Regras:
- Se o usuário mencionar um agente histórico (Franklin, Aristóteles, Alexandre, Adam, Hipócrates, Newton, Sócrates, Tesla, Marco Aurélio, Leonardo), mantenha o nome no início
- Corrija gírias e informalidade para português claro
- Se for criação de tarefa/hábito/meta, comece com o verbo no imperativo: "Adicionar tarefa: X"
- Se for pergunta, formule como pergunta direta
- Se for valor monetário, mantenha o formato R$ XX,00
- Máximo de 2 frases

Texto transcrito: "\${output}"

Comando Youli:`;
