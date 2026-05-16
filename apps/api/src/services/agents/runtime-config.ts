import fs from 'node:fs';
import path from 'node:path';

export interface AgentRuntimeConfig {
  stepBudgetDefault: number;
  enableHandoff: boolean;
  enableConditionalEscalation: boolean;
  enableSOP: boolean;
  enableReAct: boolean;
  reactMaxIterations: number;
  toolBundlesByArea: Record<string, string[]>;
  enableSkillManager: boolean;

  // Sprint A — Context Compression + Agent Leaderboard
  enableContextCompression: boolean;
  contextBudgetTokens: number;
  enableLeaderboard: boolean;

  // Sprint B — Life Watch Mode + Life Versioning
  enableWatchMode: boolean;
  watchPollingIntervalMs: number;
  enableVersioning: boolean;
  maxVersionHistory: number;

  // Sprint C — Visual Context + Life Diff
  enableVisualContext: boolean;
  enableLifeDiff: boolean;

  // Sprint D — Response Validation Loop + Life Context Map
  enableValidationLoop: boolean;
  validationMaxRetries: number;
  enableContextMap: boolean;
  contextMapMaxTokens: number;

  // Sprint E — Self-Improving Prompts + Life Architect Mode
  enableSelfImprovingPrompts: boolean;
  enableArchitectMode: boolean;

  // Sprint F — Life CI Loop + Gap Analyzer + ANC Score (SWE-CI)
  enableCILoop: boolean;
  ciLoopSchedule: 'daily' | 'weekly' | 'manual';
  enableGapAnalyzer: boolean;
  gapCriticalThreshold: number;   // gap >= this = critical (0-1)
  enableANCScore: boolean;

  // Sprint G — Requirements Doc + Evolution Tracker + Failure Attribution (SWE-CI)
  enableRequirementsDoc: boolean;
  enableEvolutionTracker: boolean;
  evolutionRetentionDays: number;
  enableFailureAttribution: boolean;

  // Sprint H — Maintainability + Checkpoint + Parallel Eval + CI Weekly (SWE-CI)
  enableMaintainabilityScore: boolean;
  enableGoalCheckpoint: boolean;
  goalInactivityDays: number;
  enableParallelEvaluator: boolean;
  parallelEvalTokenBudgetPerArea: number;
  enableCIWeeklyPipeline: boolean;
}

const CONFIG_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'agent-runtime-config.json');

const DEFAULT_CONFIG: AgentRuntimeConfig = {
  stepBudgetDefault: 3,
  enableHandoff: true,
  enableConditionalEscalation: true,
  enableSOP: true,          // SOPs multi-step ativados
  enableReAct: false,       // ReAct off (custo/latência)
  reactMaxIterations: 2,
  enableSkillManager: true, // Aprende padrões do usuário

  // Sprint A
  enableContextCompression: false,
  contextBudgetTokens: 4000,
  enableLeaderboard: true,  // Rastreia qualidade dos agentes

  // Sprint B
  enableWatchMode: false,
  watchPollingIntervalMs: 300000, // 5 min
  enableVersioning: false,
  maxVersionHistory: 20,

  // Sprint C
  enableVisualContext: false,
  enableLifeDiff: false,

  // Sprint D
  enableValidationLoop: false,
  validationMaxRetries: 2,
  enableContextMap: false,
  contextMapMaxTokens: 800,

  // Sprint E
  enableSelfImprovingPrompts: false,
  enableArchitectMode: false,

  // Sprint F (SWE-CI)
  enableCILoop: false,
  ciLoopSchedule: 'weekly',
  enableGapAnalyzer: false,
  gapCriticalThreshold: 0.6,
  enableANCScore: false,

  // Sprint G (SWE-CI)
  enableRequirementsDoc: false,
  enableEvolutionTracker: false,
  evolutionRetentionDays: 90,
  enableFailureAttribution: false,

  // Sprint H (SWE-CI)
  enableMaintainabilityScore: false,
  enableGoalCheckpoint: false,
  goalInactivityDays: 7,
  enableParallelEvaluator: false,
  parallelEvalTokenBudgetPerArea: 1200,
  enableCIWeeklyPipeline: false,

  toolBundlesByArea: {
    financeiro: ['finance.getSummary'],
    calendario: ['calendar.getEvents'],
    fitness: ['fitness.getActivities'],
    dashboard: [],
    tarefas: [],
    habitos: [],
    metas: [],
    insights: [],
    foco: [],
    perfil: [],
  }
};

function readRaw(): AgentRuntimeConfig {
  if (!fs.existsSync(CONFIG_PATH)) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) as AgentRuntimeConfig;
    return { ...DEFAULT_CONFIG, ...parsed, toolBundlesByArea: { ...DEFAULT_CONFIG.toolBundlesByArea, ...(parsed.toolBundlesByArea || {}) } };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function writeRaw(config: AgentRuntimeConfig) {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getRuntimeConfig(): AgentRuntimeConfig {
  return readRaw();
}

export function updateRuntimeConfig(patch: Partial<AgentRuntimeConfig>): AgentRuntimeConfig {
  const current = readRaw();
  const next: AgentRuntimeConfig = {
    ...current,
    ...patch,
    toolBundlesByArea: {
      ...current.toolBundlesByArea,
      ...(patch.toolBundlesByArea || {})
    }
  };
  writeRaw(next);
  return next;
}

