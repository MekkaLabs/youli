-- ═══════════════════════════════════════════════════════════════════════════
-- YOULI — Schema SQL completo para Supabase
-- Execute no SQL Editor do Supabase: https://app.supabase.com
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Extensões ───────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";       -- para MemoryEngine pgvector
CREATE EXTENSION IF NOT EXISTS "pg_trgm";      -- para busca textual de hábitos/metas

-- ─── Profiles ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id                  TEXT PRIMARY KEY DEFAULT 'user-1',
  name                TEXT NOT NULL DEFAULT 'Usuário',
  email               TEXT,
  orchestrator_name   TEXT NOT NULL DEFAULT 'Youli',
  orchestrator_emoji  TEXT NOT NULL DEFAULT '✦',
  xp                  INTEGER NOT NULL DEFAULT 0,
  level               INTEGER NOT NULL DEFAULT 1,
  energy_profile      TEXT DEFAULT 'balanced',  -- morning | evening | balanced
  timezone            TEXT DEFAULT 'America/Sao_Paulo',
  language            TEXT DEFAULT 'pt-BR',
  theme               TEXT DEFAULT 'dark',       -- dark | light | system
  priority_areas      TEXT[] DEFAULT '{}',
  objectives          JSONB DEFAULT '[]',
  routine             JSONB DEFAULT '[]',
  preferences         JSONB DEFAULT '[]',
  persistent_context  JSONB DEFAULT '[]',
  active_modules      TEXT[] DEFAULT '{}',
  integrations        JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Habits ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  emoji       TEXT DEFAULT '🔥',
  color       TEXT DEFAULT '#7C3AED',
  category    TEXT DEFAULT 'Geral',
  frequency   TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly')),
  streak      INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  last_done   DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id    UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  profile_id  TEXT NOT NULL,
  done_at     DATE NOT NULL,
  UNIQUE (habit_id, done_at)
);

CREATE INDEX IF NOT EXISTS idx_habits_profile ON habits(profile_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit ON habit_logs(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_date ON habit_logs(done_at);

-- ─── Goals ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  emoji           TEXT DEFAULT '🎯',
  color           TEXT DEFAULT '#7C3AED',
  category        TEXT DEFAULT 'pessoal',
  description     TEXT,
  current_value   NUMERIC NOT NULL DEFAULT 0,
  target_value    NUMERIC NOT NULL DEFAULT 100,
  unit            TEXT DEFAULT '%',
  status          TEXT NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active', 'completed', 'paused', 'at_risk')),
  start_date      DATE DEFAULT CURRENT_DATE,
  deadline        DATE,
  milestones      JSONB DEFAULT '[]',
  weekly_updates  JSONB DEFAULT '[]',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_profile ON goals(profile_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  next_step   TEXT,
  status      TEXT NOT NULL DEFAULT 'todo'
              CHECK (status IN ('todo', 'in_progress', 'done', 'cancelled')),
  priority    INTEGER NOT NULL DEFAULT 3 CHECK (priority BETWEEN 1 AND 5),
  goal_id     UUID REFERENCES goals(id) ON DELETE SET NULL,
  habit_id    UUID REFERENCES habits(id) ON DELETE SET NULL,
  due_date    DATE,
  completed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_profile ON tasks(profile_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ─── Evolution Tracking ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evolution_points (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  area        TEXT NOT NULL,
  metric      TEXT NOT NULL,
  value       NUMERIC NOT NULL,
  label       TEXT,
  ts          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolution_profile_area ON evolution_points(profile_id, area);
CREATE INDEX IF NOT EXISTS idx_evolution_ts ON evolution_points(ts);

-- ─── Life Relationships (GraphRAG) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS life_relationships (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source_area     TEXT NOT NULL,
  target_area     TEXT NOT NULL,
  relationship    TEXT NOT NULL,  -- 'improves' | 'blocks' | 'correlates'
  strength        NUMERIC DEFAULT 0.5 CHECK (strength BETWEEN 0 AND 1),
  evidence        TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Memory (pgvector) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS memories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   VECTOR(1536),
  area        TEXT,
  source      TEXT,   -- 'habit' | 'goal' | 'copilot' | 'manual'
  importance  NUMERIC DEFAULT 0.5,
  ts          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_memories_profile ON memories(profile_id);
CREATE INDEX IF NOT EXISTS idx_memories_vec ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ─── Focus Sessions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS focus_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id  TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mode        TEXT NOT NULL DEFAULT 'pomodoro',  -- pomodoro | deepwork | custom
  duration_min INTEGER NOT NULL,
  completed   BOOLEAN DEFAULT TRUE,
  area        TEXT DEFAULT 'productivity',
  ts          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_focus_profile ON focus_sessions(profile_id);

-- ─── Default profile seed ────────────────────────────────────────────────────
INSERT INTO profiles (id, name, orchestrator_name, xp, level)
VALUES ('user-1', 'Usuário', 'Youli', 0, 1)
ON CONFLICT (id) DO NOTHING;

-- ─── RLS (Row Level Security) ────────────────────────────────────────────────
-- Habilite RLS nas tabelas para produção com auth Supabase real
-- ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- Policies:
-- CREATE POLICY "own data" ON habits FOR ALL USING (profile_id = auth.uid()::text);

-- ─── updated_at trigger ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER habits_updated_at  BEFORE UPDATE ON habits  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER goals_updated_at   BEFORE UPDATE ON goals   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated_at   BEFORE UPDATE ON tasks   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER profile_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
