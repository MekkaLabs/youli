import fs from 'node:fs';
import path from 'node:path';
import type { LifeArea } from './agent-definitions';

export type WorkflowNodeId =
  | 'start'
  | 'selector'
  | 'guardrails'
  | 'execute_primary'
  | 'handoff'
  | 'finalize';

export interface AreaWorkflowDefinition {
  id: string;
  version: number;
  area: LifeArea;
  enabled: boolean;
  maxTurns: number;
  termination: {
    maxAgentActions: number;
    stopOnHighUrgency: boolean;
  };
  handoffs: LifeArea[];
  selector: {
    strategy: 'context_score';
    candidates: LifeArea[];
  };
  graph: {
    nodes: WorkflowNodeId[];
    edges: Array<{ from: WorkflowNodeId; to: WorkflowNodeId; condition?: string }>;
  };
}

interface WorkflowStore {
  schemaVersion: 1;
  updatedAt: string;
  workflows: Record<LifeArea, {
    active: AreaWorkflowDefinition;
    draft: AreaWorkflowDefinition;
    history: AreaWorkflowDefinition[];
  }>;
}

const WORKFLOW_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'orchestrator-workflows.json');

const AREA_HANDOFFS: Record<LifeArea, LifeArea[]> = {
  dashboard: ['tarefas', 'metas', 'insights'],
  tarefas: ['metas', 'calendario', 'foco'],
  habitos: ['fitness', 'foco', 'insights'],
  metas: ['tarefas', 'financeiro', 'insights'],
  financeiro: ['metas', 'insights', 'tarefas'],
  fitness: ['habitos', 'foco', 'calendario'],
  calendario: ['tarefas', 'foco', 'metas'],
  insights: ['dashboard', 'tarefas', 'metas'],
  foco: ['tarefas', 'calendario', 'fitness'],
  perfil: ['dashboard', 'insights', 'metas'],
};

const ALL_AREAS: LifeArea[] = [
  'dashboard',
  'tarefas',
  'habitos',
  'metas',
  'financeiro',
  'fitness',
  'calendario',
  'insights',
  'foco',
  'perfil',
];

function nowIso() {
  return new Date().toISOString();
}

function buildDefaultWorkflow(area: LifeArea): AreaWorkflowDefinition {
  return {
    id: `wf-${area}`,
    version: 1,
    area,
    enabled: true,
    maxTurns: 4,
    termination: {
      maxAgentActions: 6,
      stopOnHighUrgency: true,
    },
    handoffs: AREA_HANDOFFS[area],
    selector: {
      strategy: 'context_score',
      candidates: ALL_AREAS,
    },
    graph: {
      nodes: ['start', 'selector', 'guardrails', 'execute_primary', 'handoff', 'finalize'],
      edges: [
        { from: 'start', to: 'selector' },
        { from: 'selector', to: 'guardrails' },
        { from: 'guardrails', to: 'execute_primary', condition: 'no_interrupt' },
        { from: 'execute_primary', to: 'handoff', condition: 'handoff_needed' },
        { from: 'execute_primary', to: 'finalize', condition: 'no_handoff' },
        { from: 'handoff', to: 'finalize' },
      ],
    },
  };
}

function defaultStore(): WorkflowStore {
  const workflows = {} as WorkflowStore['workflows'];
  for (const area of ALL_AREAS) {
    const wf = buildDefaultWorkflow(area);
    workflows[area] = { active: wf, draft: { ...wf }, history: [] };
  }
  return { schemaVersion: 1, updatedAt: nowIso(), workflows };
}

function ensureStoreDir() {
  const dir = path.dirname(WORKFLOW_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): WorkflowStore {
  ensureStoreDir();
  if (!fs.existsSync(WORKFLOW_PATH)) {
    const initial = defaultStore();
    fs.writeFileSync(WORKFLOW_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(WORKFLOW_PATH, 'utf8')) as WorkflowStore;
    for (const area of ALL_AREAS) {
      if (!parsed.workflows[area]) {
        const wf = buildDefaultWorkflow(area);
        parsed.workflows[area] = { active: wf, draft: { ...wf }, history: [] };
        continue;
      }
      const current = parsed.workflows[area] as unknown as AreaWorkflowDefinition | WorkflowStore['workflows'][LifeArea];
      if ((current as WorkflowStore['workflows'][LifeArea]).active) {
        continue;
      }
      const legacy = current as AreaWorkflowDefinition;
      parsed.workflows[area] = {
        active: legacy,
        draft: { ...legacy },
        history: [],
      };
    }
    return parsed;
  } catch {
    const initial = defaultStore();
    fs.writeFileSync(WORKFLOW_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
}

function writeStore(store: WorkflowStore) {
  ensureStoreDir();
  store.updatedAt = nowIso();
  fs.writeFileSync(WORKFLOW_PATH, JSON.stringify(store, null, 2));
}

export function getWorkflowForArea(area: LifeArea): AreaWorkflowDefinition {
  const store = readStore();
  return store.workflows[area].active;
}

export function listWorkflows(): AreaWorkflowDefinition[] {
  const store = readStore();
  return ALL_AREAS.map((a) => store.workflows[a].active);
}

export function listWorkflowBundles() {
  const store = readStore();
  return ALL_AREAS.map((a) => ({ area: a, ...store.workflows[a] }));
}

export function updateWorkflowDraft(area: LifeArea, patch: Partial<AreaWorkflowDefinition>): AreaWorkflowDefinition {
  const store = readStore();
  const current = store.workflows[area].draft;
  const next: AreaWorkflowDefinition = {
    ...current,
    ...patch,
    version: current.version + 1,
    area,
  };
  store.workflows[area].draft = next;
  writeStore(store);
  return next;
}

export function activateWorkflow(area: LifeArea): AreaWorkflowDefinition {
  const store = readStore();
  const currentActive = store.workflows[area].active;
  const nextActive = store.workflows[area].draft;
  store.workflows[area].history.push(currentActive);
  if (store.workflows[area].history.length > 20) {
    store.workflows[area].history = store.workflows[area].history.slice(-20);
  }
  store.workflows[area].active = { ...nextActive, version: nextActive.version + 1 };
  store.workflows[area].draft = { ...store.workflows[area].active };
  writeStore(store);
  return store.workflows[area].active;
}

export function rollbackWorkflow(area: LifeArea): AreaWorkflowDefinition {
  const store = readStore();
  const previous = store.workflows[area].history.pop();
  if (!previous) return store.workflows[area].active;
  store.workflows[area].active = previous;
  store.workflows[area].draft = { ...previous };
  writeStore(store);
  return previous;
}
