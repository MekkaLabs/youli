-- ═══════════════════════════════════════════════════════════════════════════
-- YOULI — Schema multi-usuário (alinhado ao CÓDIGO atual dos repositories)
--
-- COMO USAR:
--   1. Abra o SQL Editor do projeto Supabase (zpzwqpowvkavregozioz).
--   2. Cole ESTE arquivo inteiro e rode.
--   3. No backend, configure no .env.local:
--        NEXT_PUBLIC_SUPABASE_URL=https://zpzwqpowvkavregozioz.supabase.co
--        SUPABASE_SERVICE_ROLE_KEY=<a service_role key — Settings → API>
--        YOULI_USE_SUPABASE=true
--
-- MODELO DE SEGURANÇA:
--   O backend acessa via SERVICE_ROLE (ignora RLS). RLS é habilitada SEM policies
--   públicas → a publishable/anon key NÃO consegue ler/escrever direto. Todo
--   acesso passa pela API (que valida sessão HMAC e filtra por profile_id=userId).
--
--   profile_id é TEXT e corresponde ao id do usuário em users.json
--   (ex.: 'user-gusta-001'). NÃO usamos Supabase Auth nesta fase.
--
-- ⚠️  Este script faz DROP das tabelas que gerencia (integração limpa).
--     Rode apenas em projeto novo/sem dados de produção.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensões ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ─── Limpeza (ordem por dependência de FK) ──────────────────────────────────
DROP TABLE IF EXISTS habit_logs       CASCADE;
DROP TABLE IF EXISTS agent_signals    CASCADE;
DROP TABLE IF EXISTS life_relationships CASCADE;
DROP TABLE IF EXISTS memory_records   CASCADE;
DROP TABLE IF EXISTS daily_insights   CASCADE;
DROP TABLE IF EXISTS tasks            CASCADE;
DROP TABLE IF EXISTS habits           CASCADE;
DROP TABLE IF EXISTS goals            CASCADE;
DROP TABLE IF EXISTS profiles         CASCADE;

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ─── profiles (id = userId do users.json; TEXT) ──────────────────────────────
CREATE TABLE profiles (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL DEFAULT 'Usuário',
  email               TEXT,
  role                TEXT DEFAULT 'user',
  age                 INTEGER,
  avatar_url          TEXT,
  timezone            TEXT DEFAULT 'America/Sao_Paulo',
  energy_profile      TEXT DEFAULT 'medium',
  objectives          JSONB DEFAULT '[]',
  routine             JSONB DEFAULT '[]',
  preferences         JSONB DEFAULT '[]',
  projects            JSONB DEFAULT '[]',
  life_areas          JSONB DEFAULT '[]',
  behavior_patterns   JSONB DEFAULT '[]',
  persistent_context  JSONB DEFAULT '[]',
  active_modules      JSONB DEFAULT '[]',
  integrations        JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── goals (repo: profile_id, title, progress, objective_id, due_date) ───────
CREATE TABLE goals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  objective_id  TEXT,
  title         TEXT NOT NULL,
  progress      NUMERIC NOT NULL DEFAULT 0,
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_goals_profile ON goals(profile_id);
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── habits (repo: profile_id, title, frequency, streak, goal_id, last_done) ─
CREATE TABLE habits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  frequency   TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily','weekly')),
  streak      INTEGER NOT NULL DEFAULT 0,
  goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  last_done   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_habits_profile ON habits(profile_id);
CREATE TRIGGER habits_updated_at BEFORE UPDATE ON habits FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TABLE habit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id    UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  profile_id  TEXT NOT NULL,
  done_at     DATE NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_habit_logs_habit ON habit_logs(habit_id);

-- ─── tasks (repo: profile_id, title, next_step, status, priority, goal/habit) ─
CREATE TABLE tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  next_step   TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo','doing','in_progress','done','cancelled','archived')),
  priority    INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  habit_id    UUID REFERENCES habits(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tasks_profile ON tasks(profile_id);
CREATE TRIGGER tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── daily_insights (repo store.ts: profile_id, summary, actions, energy) ────
CREATE TABLE daily_insights (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary     TEXT NOT NULL,
  actions     JSONB DEFAULT '[]',
  energy      TEXT DEFAULT 'medium',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_insights_profile ON daily_insights(profile_id, created_at DESC);

-- ─── memory_records (repo store.ts addMemory: user_id, type, text, embedding) ─
CREATE TABLE memory_records (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'fact',
  text        TEXT NOT NULL,
  embedding   VECTOR(1536),
  score       NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_memory_user ON memory_records(user_id);

-- ─── life_relationships (life-graph.ts) ──────────────────────────────────────
CREATE TABLE life_relationships (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id        TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_type       TEXT NOT NULL DEFAULT 'area',
  source_label      TEXT NOT NULL,
  source_area       TEXT NOT NULL,
  relation_type     TEXT NOT NULL,
  strength          REAL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  target_type       TEXT NOT NULL DEFAULT 'area',
  target_label      TEXT NOT NULL,
  target_area       TEXT NOT NULL,
  evidence          TEXT,
  confidence        REAL DEFAULT 0.6 CHECK (confidence >= 0 AND confidence <= 1),
  discovered_by     TEXT DEFAULT 'system',
  observation_count INT DEFAULT 1,
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_life_rel_profile ON life_relationships(profile_id);
CREATE INDEX idx_life_rel_strength ON life_relationships(strength DESC);

-- ─── agent_signals (agent-signal-bus.ts) ─────────────────────────────────────
CREATE TABLE agent_signals (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  from_agent    TEXT NOT NULL,
  to_agent      TEXT NOT NULL,
  signal_type   TEXT NOT NULL,
  payload       JSONB DEFAULT '{}',
  priority      TEXT DEFAULT 'medium',
  status        TEXT DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_agent_signals_profile ON agent_signals(profile_id, status);

-- ─── RPCs (profile_id TEXT — alinhado ao código) ─────────────────────────────
CREATE OR REPLACE FUNCTION get_area_relationships(
  p_profile_id  TEXT,
  p_area        TEXT,
  p_min_strength REAL DEFAULT 0.3
)
RETURNS TABLE (
  source_label  TEXT,
  source_area   TEXT,
  relation_type TEXT,
  strength      REAL,
  target_label  TEXT,
  target_area   TEXT,
  evidence      TEXT,
  confidence    REAL
)
LANGUAGE sql STABLE AS $$
  SELECT source_label, source_area, relation_type, strength,
         target_label, target_area, evidence, confidence
  FROM life_relationships
  WHERE profile_id = p_profile_id
    AND (source_area = p_area OR target_area = p_area)
    AND strength >= p_min_strength
  ORDER BY strength DESC, observation_count DESC
  LIMIT 20;
$$;

CREATE OR REPLACE FUNCTION send_agent_signal(
  p_profile_id  TEXT,
  p_from_agent  TEXT,
  p_to_agent    TEXT,
  p_signal_type TEXT,
  p_payload     JSONB DEFAULT '{}',
  p_priority    TEXT DEFAULT 'medium'
)
RETURNS UUID
LANGUAGE sql AS $$
  INSERT INTO agent_signals (profile_id, from_agent, to_agent, signal_type, payload, priority)
  VALUES (p_profile_id, p_from_agent, p_to_agent, p_signal_type, p_payload, p_priority)
  RETURNING id;
$$;

-- ─── RLS: ligada SEM policies → só service_role acessa (backend) ─────────────
ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits             ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks              ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_records     ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals      ENABLE ROW LEVEL SECURITY;

-- ─── Seed dos perfis (espelha users.json) ────────────────────────────────────
INSERT INTO profiles (id, name, email, role) VALUES
  ('user-gusta-001', 'Gustavo Vicente', 'gustav0.v1c3nt3@gmail.com', 'admin'),
  ('user-amiga-002', 'Convidada',       'amiga@youli.app',          'user')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- FIM. Tabelas multi-usuário prontas. Lembre de criar um profile para cada
-- novo usuário registrado (o backend faz isso ao ligar a sincronização de
-- profiles — hoje o profile vive em JSON local; ver follow-up no handoff).
-- ═══════════════════════════════════════════════════════════════════════════
