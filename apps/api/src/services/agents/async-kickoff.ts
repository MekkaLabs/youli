import fs from 'node:fs';
import path from 'node:path';
import { runOrchestrator } from './orchestrator';
import type { UserContext } from './agent-executor';

type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface OrchestratorJob {
  id: string;
  threadId: string;
  message: string;
  context: UserContext;
  status: JobStatus;
  result?: unknown;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface JobStore {
  jobs: Record<string, OrchestratorJob>;
}

const JOB_PATH = path.join(process.cwd(), 'src', 'repositories', '.data', 'orchestrator-jobs.json');

function nowIso() {
  return new Date().toISOString();
}

function ensureStoreDir() {
  const dir = path.dirname(JOB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readStore(): JobStore {
  ensureStoreDir();
  if (!fs.existsSync(JOB_PATH)) {
    const initial: JobStore = { jobs: {} };
    fs.writeFileSync(JOB_PATH, JSON.stringify(initial, null, 2));
    return initial;
  }
  try {
    return JSON.parse(fs.readFileSync(JOB_PATH, 'utf8')) as JobStore;
  } catch {
    return { jobs: {} };
  }
}

function writeStore(store: JobStore) {
  ensureStoreDir();
  fs.writeFileSync(JOB_PATH, JSON.stringify(store, null, 2));
}

function saveJob(job: OrchestratorJob) {
  const store = readStore();
  store.jobs[job.id] = job;
  writeStore(store);
}

export function getJob(id: string): OrchestratorJob | null {
  const store = readStore();
  return store.jobs[id] || null;
}

export function createKickoffJob(payload: {
  message: string;
  context: UserContext;
  threadId?: string;
}): OrchestratorJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const job: OrchestratorJob = {
    id,
    threadId: payload.threadId || `thread_job_${Date.now()}`,
    message: payload.message,
    context: payload.context,
    status: 'queued',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  saveJob(job);

  setTimeout(async () => {
    const running = { ...job, status: 'running' as const, updatedAt: nowIso() };
    saveJob(running);
    try {
      const result = await runOrchestrator(
        running.message,
        running.context,
        undefined,
        { threadId: running.threadId }
      );
      saveJob({ ...running, status: 'completed', result, updatedAt: nowIso() });
    } catch (error) {
      saveJob({
        ...running,
        status: 'failed',
        error: error instanceof Error ? error.message : 'unknown',
        updatedAt: nowIso(),
      });
    }
  }, 10);

  return job;
}

