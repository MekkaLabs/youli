-- ═══════════════════════════════════════════════════════════════════════════
-- YOULI — Memória / Obsidian no Supabase (aditivo ao 002_multiuser_schema.sql)
--
-- Estende memory_records com os campos que o MemoryConnector usa para o sync
-- do Obsidian (source/external_id/tags/area) + upsert idempotente por nota.
--
-- COMO USAR: cole no SQL Editor do projeto e rode. Idempotente (IF NOT EXISTS).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE memory_records
  ADD COLUMN IF NOT EXISTS source      TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS tags        JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS area        TEXT;

-- Upsert por nota do Obsidian: uma memória por (usuário, externalId).
CREATE UNIQUE INDEX IF NOT EXISTS idx_memory_user_external
  ON memory_records (user_id, external_id)
  WHERE external_id IS NOT NULL;

-- Filtro frequente por origem (ex.: só Obsidian).
CREATE INDEX IF NOT EXISTS idx_memory_user_source
  ON memory_records (user_id, source);
