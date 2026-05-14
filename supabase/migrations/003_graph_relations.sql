-- ============================================================
-- MIGRAÇÃO 003: GraphRAG de Vida — Relações entre Entidades
-- Inspirado no MiroFish: agentes com memória de grafo
-- ============================================================

-- Extensão para grafos (já habilitada via uuid-ossp e vector)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- TABELA: life_relationships
-- Grafo de relações entre entidades de vida
-- Ex: hábito "Exercício" IMPACTS meta "Saúde Financeira"
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS life_relationships (
  id              UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Entidade de origem
  source_type     TEXT NOT NULL, -- 'habit' | 'task' | 'goal' | 'finance' | 'fitness' | 'insight'
  source_id       UUID,          -- FK opcional para a entidade específica
  source_label    TEXT NOT NULL, -- Nome legível (ex: "Exercício Diário")
  source_area     TEXT NOT NULL, -- Área de vida

  -- Relação
  relation_type   TEXT NOT NULL, -- 'impacts' | 'correlates_with' | 'blocks' | 'enables' | 'contradicts'
  strength        REAL DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1),
  direction       TEXT DEFAULT 'unidirectional', -- 'unidirectional' | 'bidirectional'

  -- Entidade de destino
  target_type     TEXT NOT NULL,
  target_id       UUID,
  target_label    TEXT NOT NULL,
  target_area     TEXT NOT NULL,

  -- Evidência e contexto
  evidence        TEXT,          -- Por que essa correlação existe
  confidence      REAL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  discovered_by   TEXT DEFAULT 'system', -- 'system' | nome do agente (ex: 'socrates')
  observation_count INT DEFAULT 1,       -- Quantas vezes essa relação foi observada

  -- Temporal
  first_seen_at   TIMESTAMPTZ DEFAULT NOW(),
  last_confirmed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,   -- NULL = permanente

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- TABELA: agent_signals
-- Bus de sinais entre agentes (inter-agent communication)
-- Ex: Franklin completa tarefa crítica → sinal para Alexandre
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_signals (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  from_agent    TEXT NOT NULL,   -- 'franklin' | 'aristoteles' | etc
  to_agent      TEXT NOT NULL,   -- 'alexandre' | 'socrates' | 'orchestrator' | '*' (broadcast)
  signal_type   TEXT NOT NULL,   -- 'task_completed' | 'habit_broken' | 'goal_at_risk' | 'insight_found' | 'alert'
  payload       JSONB DEFAULT '{}',
  priority      TEXT DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'

  -- Estado
  status        TEXT DEFAULT 'pending', -- 'pending' | 'processing' | 'delivered' | 'expired'
  processed_at  TIMESTAMPTZ,
  response      JSONB,           -- Resposta do agente receptor

  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);

-- ──────────────────────────────────────────────
-- TABELA: life_simulations
-- Histórico de simulações de trajetória
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS life_simulations (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  scenario_type TEXT NOT NULL,   -- 'current_trajectory' | 'what_if' | 'best_case' | 'worst_case'
  horizon_days  INT NOT NULL,    -- 30 | 60 | 90 | 180 | 365

  -- Seed: estado atual no momento da simulação
  seed_snapshot JSONB NOT NULL,  -- { tasks, habits, goals, finances, fitness }

  -- Parâmetros de cenário (para what-if)
  scenario_params JSONB DEFAULT '{}', -- Ex: { "habit_consistency": 0.9, "spending_reduction": 0.3 }

  -- Resultado
  predictions   JSONB NOT NULL,  -- Array de previsões por área
  summary       TEXT,
  confidence    REAL DEFAULT 0.7,
  generated_by  TEXT DEFAULT 'orchestrator', -- Agente que gerou

  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- ÍNDICES
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_life_rel_profile ON life_relationships(profile_id);
CREATE INDEX IF NOT EXISTS idx_life_rel_source ON life_relationships(source_area, source_type);
CREATE INDEX IF NOT EXISTS idx_life_rel_target ON life_relationships(target_area, target_type);
CREATE INDEX IF NOT EXISTS idx_life_rel_strength ON life_relationships(strength DESC);
CREATE INDEX IF NOT EXISTS idx_agent_signals_profile ON agent_signals(profile_id, status);
CREATE INDEX IF NOT EXISTS idx_agent_signals_to ON agent_signals(to_agent, status);
CREATE INDEX IF NOT EXISTS idx_simulations_profile ON life_simulations(profile_id, created_at DESC);

-- ──────────────────────────────────────────────
-- RLS (Row Level Security)
-- ──────────────────────────────────────────────
ALTER TABLE life_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_relationships" ON life_relationships
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_signals" ON agent_signals
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "users_own_simulations" ON life_simulations
  FOR ALL USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ──────────────────────────────────────────────
-- FUNÇÕES RPC (GraphRAG queries)
-- ──────────────────────────────────────────────

-- Busca relações de uma área específica (grafo egocêntrico)
CREATE OR REPLACE FUNCTION get_area_relationships(
  p_profile_id UUID,
  p_area TEXT,
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
  SELECT
    source_label, source_area, relation_type, strength,
    target_label, target_area, evidence, confidence
  FROM life_relationships
  WHERE profile_id = p_profile_id
    AND (source_area = p_area OR target_area = p_area)
    AND strength >= p_min_strength
  ORDER BY strength DESC, observation_count DESC
  LIMIT 20;
$$;

-- Sinalização cross-agente
CREATE OR REPLACE FUNCTION send_agent_signal(
  p_profile_id  UUID,
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

-- Atualiza trigger de updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER life_rel_updated_at
  BEFORE UPDATE ON life_relationships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
