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

const dbPath = path.join(process.cwd(), 'src', 'repositories', '.data', 'db.json');

function nowIso() { return new Date().toISOString(); }

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

export function readDb(): LocalDb {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultDb, null, 2));
    return structuredClone(defaultDb);
  }
  const parsed = JSON.parse(fs.readFileSync(dbPath, 'utf8')) as LocalDb;
  parsed.profile = ensureProfileDefaults(parsed.profile);
  return parsed;
}

export function writeDb(db: LocalDb) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

export function resetDb() {
  writeDb(structuredClone(defaultDb));
  return readDb();
}
