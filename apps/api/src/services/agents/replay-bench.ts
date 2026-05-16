import fs from 'node:fs';
import path from 'node:path';
import { runOrchestrator } from './orchestrator';
import type { UserContext } from './agent-executor';

export interface BenchScenario {
  id: string;
  message: string;
  expectsArea?: string;
}

const FILE_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'replay-bench.json');

const DEFAULT_SCENARIOS: BenchScenario[] = [
  { id: 'scn-fin-1', message: 'meus gastos estão altos e preciso organizar meu dinheiro', expectsArea: 'financeiro' },
  { id: 'scn-task-1', message: 'tenho muitas tarefas travadas, como priorizo?', expectsArea: 'tarefas' },
  { id: 'scn-habit-1', message: 'não estou conseguindo manter meus hábitos', expectsArea: 'habitos' },
];

export function getBenchScenarios() {
  if (!fs.existsSync(FILE_PATH)) return DEFAULT_SCENARIOS;
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE_PATH, 'utf8')) as BenchScenario[];
    return parsed.length ? parsed : DEFAULT_SCENARIOS;
  } catch {
    return DEFAULT_SCENARIOS;
  }
}

export async function runReplayBench(context: UserContext = {}) {
  const scenarios = getBenchScenarios();
  const results = [];
  let pass = 0;
  for (const s of scenarios) {
    const response = await runOrchestrator(s.message, context, undefined, { threadId: `bench_${s.id}_${Date.now()}` });
    const got = response.graph?.area || response.primaryAgent.area;
    const ok = !s.expectsArea || got === s.expectsArea;
    if (ok) pass += 1;
    results.push({ scenarioId: s.id, expected: s.expectsArea, got, ok });
  }
  return {
    total: scenarios.length,
    pass,
    fail: scenarios.length - pass,
    score: Number((pass / Math.max(1, scenarios.length)).toFixed(3)),
    results,
  };
}

