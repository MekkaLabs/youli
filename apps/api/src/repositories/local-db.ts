import fs from 'node:fs';
import path from 'node:path';
import type {
  AIPersonalization,
  CalendarEvent,
  DailyInsight,
  FitnessActivity,
  Goal,
  Habit,
  HumanDesignSettings,
  MemoryRecord,
  PersonaId,
  Task,
  UserProfile
} from '@youli/shared';

export interface LocalDb {
  profile: UserProfile;
  connections: Array<{ id: string; provider: 'strava' | 'open_finance' | 'google_calendar' | 'native_calendar'; status: 'connected' | 'disconnected'; syncedAt?: string }>;
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  insights: DailyInsight[];
  memory: MemoryRecord[];
  calendar: CalendarEvent[];
  fitness: FitnessActivity[];
}

const DATA_DIR = path.join(process.cwd(), 'src', 'repositories', '.data');
const LEGACY_DB_PATH = path.join(DATA_DIR, 'db.json');
const USERS_DIR = path.join(DATA_DIR, 'users');

/** Dono do sistema — herda o db.json legado (preserva os dados do Gustavo). */
const OWNER_ID = process.env.YOULI_OWNER_ID || 'user-gusta-001';

function nowIso() { return new Date().toISOString(); }

/** Sanitiza o userId para uso seguro como nome de arquivo. */
function safeUserId(userId: string): string {
  return userId.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function userDbPath(userId: string): string {
  return path.join(USERS_DIR, `${safeUserId(userId)}.json`);
}

const PERSONA_AREA_MAP = {
  leonardo: 'dashboard',
  franklin: 'tarefas',
  aristoteles: 'habitos',
  alexandre: 'metas',
  adam: 'financeiro',
  hipocrates: 'fitness',
  newton: 'calendario',
  socrates: 'insights',
  tesla: 'foco',
  marco: 'perfil',
} as const;

const DEFAULT_HD_SETTINGS: HumanDesignSettings = {
  enabled: false,
  consentAccepted: false,
  mode: 'off',
};

function buildDefaultAiPersonalization(): AIPersonalization {
  const personaIds = Object.keys(PERSONA_AREA_MAP) as PersonaId[];
  return {
    personas: personaIds.map((personaId) => ({
      personaId,
      area: PERSONA_AREA_MAP[personaId],
      enabled: true,
      humanDesignEnabled: false
    }))
  };
}

function ensureProfileDefaults(profile: UserProfile): UserProfile {
  const aiPersonalization = profile.aiPersonalization || buildDefaultAiPersonalization();
  const personaById = new Map(aiPersonalization.personas.map((p) => [p.personaId, p]));
  const normalizedPersonas = (Object.keys(PERSONA_AREA_MAP) as PersonaId[]).map((personaId) => {
    const existing = personaById.get(personaId);
    return {
      personaId,
      area: PERSONA_AREA_MAP[personaId],
      enabled: existing?.enabled ?? true,
      humanDesignEnabled: existing?.humanDesignEnabled ?? false
    };
  });

  const { provisionalPassword: _unusedProvisionalPassword, ...safeProfile } = profile as UserProfile & { provisionalPassword?: string };

  return {
    ...safeProfile,
    humanDesign: {
      ...DEFAULT_HD_SETTINGS,
      ...(profile.humanDesign || {})
    },
    aiPersonalization: {
      personas: normalizedPersonas
    }
  };
}

const defaultDb: LocalDb = {
  profile: {
    id: 'u1',
    name: 'Gustavo Vicente',
    email: 'gustav0.v1c3nt3@gmail.com',
    role: 'Admin Master',
    age: 33,
    avatarUrl: '/profile/gustavo-vicente.jpg',
    timezone: 'America/Sao_Paulo',
    objectives: ['Ganhar R$10.000 com internet', 'Manter rotina de alta performance'],
    routine: ['Treino diário', 'Programação', 'Estudo', 'Fechamento do dia 00:00'],
    preferences: ['Sistema operacional pessoal', 'Fluxo por áreas', 'Comandos em linguagem natural'],
    projects: ['YOULI MVP'],
    lifeAreas: ['Negócios Digitais', 'Saúde', 'Execução', 'Finanças'],
    behaviorPatterns: ['Alta energia após treino', 'Executa melhor com tarefas claras e priorizadas'],
    energyProfile: 'high',
    persistentContext: ['Prefere visão por sistema, não chatbot', 'Quer tudo integrado em um único fluxo'],
    integrations: { strava: 'connected', openFinance: 'connected', calendar: 'connected', nativeCalendar: 'connected' }
    ,activeModules: ['overview', 'tarefas', 'habitos', 'metas', 'financeiro', 'calendario', 'insights', 'fitness', 'perfil', 'memoria', 'orquestracao'],
    humanDesign: DEFAULT_HD_SETTINGS,
    aiPersonalization: buildDefaultAiPersonalization()
  },
  connections: [
    { id: 'conn-strava', provider: 'strava', status: 'connected', syncedAt: nowIso() },
    { id: 'conn-of', provider: 'open_finance', status: 'connected', syncedAt: nowIso() },
    { id: 'conn-gcal', provider: 'google_calendar', status: 'connected', syncedAt: nowIso() },
    { id: 'conn-native', provider: 'native_calendar', status: 'connected', syncedAt: nowIso() }
  ],
  tasks: [
    { id: 't1', title: 'Programar novos aplicativos', status: 'todo', priority: 5, nextStep: 'Definir escopo e iniciar arquitetura base.' },
    { id: 't2', title: 'Ir à Vivo resolver problema de celular', status: 'todo', priority: 4, nextStep: 'Levar documento e protocolo anterior.' }
  ],
  goals: [{ id: 'g1', objectiveId: 'o1', title: 'Conseguir ganhar 10.000 com internet', progress: 15 }],
  habits: [
    { id: 'h1', title: 'Treinar todos os dias (triathlon, jiu e muaythai)', frequency: 'daily', streak: 3 },
    { id: 'h2', title: 'Estudar', frequency: 'daily', streak: 5 },
    { id: 'h3', title: 'Dormir 00:00', frequency: 'daily', streak: 2 }
  ],
  insights: [{ id: 'i1', createdAt: nowIso(), summary: 'Seu foco sobe quando treino e estudo são executados no mesmo dia.', actions: ['Manter janela fixa de treino', 'Reservar 60-90min para estudo técnico'], energy: 'high' }],
  memory: [],
  calendar: [
    { id: 'cal-1', source: 'native', title: 'Bloco de Programação', startsAt: nowIso(), endsAt: new Date(Date.now() + 90 * 60 * 1000).toISOString() },
    { id: 'cal-2', source: 'native', title: 'Treino (triathlon / luta)', startsAt: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), endsAt: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString() },
    { id: 'cal-3', source: 'native', title: 'Vivo - resolver celular', startsAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(), endsAt: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString() }
  ],
  fitness: [
    { id: 'fit-1', source: 'strava', type: 'Triathlon', durationMin: 70, intensity: 'high', startedAt: new Date(Date.now() - 86400000).toISOString() },
    { id: 'fit-2', source: 'strava', type: 'Jiu-Jitsu', durationMin: 50, intensity: 'high', startedAt: new Date(Date.now() - 2 * 86400000).toISOString() }
  ]
};

// ──────────────────────────────────────────────
// SEED POR USUÁRIO
// ──────────────────────────────────────────────

/** Perfil em branco (sem dados pessoais) para um novo usuário. */
function blankProfile(userId: string, identity?: { name?: string; email?: string }): UserProfile {
  return ensureProfileDefaults({
    id: userId,
    name: identity?.name || 'Usuário',
    email: identity?.email || '',
    role: 'user',
    timezone: 'America/Sao_Paulo',
    objectives: [],
    routine: [],
    preferences: [],
    projects: [],
    lifeAreas: [],
    behaviorPatterns: [],
    energyProfile: 'medium',
    persistentContext: [],
    integrations: { strava: 'disconnected', openFinance: 'disconnected', calendar: 'disconnected', nativeCalendar: 'disconnected' },
    activeModules: ['overview', 'tarefas', 'habitos', 'metas', 'financeiro', 'calendario', 'insights', 'fitness', 'perfil', 'memoria', 'orquestracao'],
    humanDesign: DEFAULT_HD_SETTINGS,
    aiPersonalization: buildDefaultAiPersonalization(),
  });
}

/** Dataset vazio (slate limpo) para um novo usuário. */
function blankUserData(userId: string, identity?: { name?: string; email?: string }): LocalDb {
  return {
    profile: blankProfile(userId, identity),
    connections: [],
    tasks: [],
    goals: [],
    habits: [],
    insights: [],
    memory: [],
    calendar: [],
    fitness: [],
  };
}

/** Seed inicial de um usuário: owner herda o seed rico; demais começam vazios. */
function buildSeed(userId: string, identity?: { name?: string; email?: string }): LocalDb {
  if (userId === OWNER_ID) {
    return {
      ...structuredClone(defaultDb),
      profile: ensureProfileDefaults({ ...defaultDb.profile, id: userId }),
    };
  }
  return blankUserData(userId, identity);
}

/**
 * Lê o banco LOCAL de UM usuário (arquivo próprio em .data/users/{id}.json).
 * - Se não existe: o owner migra o db.json legado (uma vez); demais recebem
 *   slate limpo. Em todos os casos o seed é persistido.
 */
export function readDb(userId: string): LocalDb {
  const p = userDbPath(userId);
  if (fs.existsSync(p)) {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8')) as LocalDb;
    parsed.profile = ensureProfileDefaults(parsed.profile);
    return parsed;
  }

  fs.mkdirSync(USERS_DIR, { recursive: true });

  // Migração única: o owner herda o db.json legado (preserva dados existentes).
  if (userId === OWNER_ID && fs.existsSync(LEGACY_DB_PATH)) {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_PATH, 'utf8')) as LocalDb;
    legacy.profile = ensureProfileDefaults({ ...legacy.profile, id: userId });
    fs.writeFileSync(p, JSON.stringify(legacy, null, 2));
    return legacy;
  }

  const seed = buildSeed(userId);
  fs.writeFileSync(p, JSON.stringify(seed, null, 2));
  return structuredClone(seed);
}

export function writeDb(userId: string, db: LocalDb) {
  fs.mkdirSync(USERS_DIR, { recursive: true });
  fs.writeFileSync(userDbPath(userId), JSON.stringify(db, null, 2));
}

export function resetDb(userId: string) {
  writeDb(userId, buildSeed(userId));
  return readDb(userId);
}

/**
 * Garante que o usuário tenha um db inicializado com sua identidade.
 * Chamado no registro/login. Idempotente.
 */
export function seedUserIfMissing(userId: string, identity?: { name?: string; email?: string }): void {
  const p = userDbPath(userId);
  if (fs.existsSync(p)) return;
  fs.mkdirSync(USERS_DIR, { recursive: true });
  if (userId === OWNER_ID && fs.existsSync(LEGACY_DB_PATH)) {
    readDb(userId); // dispara a migração do legado
    return;
  }
  fs.writeFileSync(p, JSON.stringify(buildSeed(userId, identity), null, 2));
}
