-- ═══════════════════════════════════════════════════════════════════════
-- YOULI — Schema Supabase completo
-- Execute no SQL Editor do seu projeto Supabase
-- ═══════════════════════════════════════════════════════════════════════

-- Extensões
create extension if not exists "uuid-ossp";
create extension if not exists "vector";        -- pgvector para memória semântica

-- ── Profiles ────────────────────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade,
  name          text not null default 'Usuário',
  email         text,
  role          text default 'Member',
  age           int,
  avatar_url    text,
  timezone      text not null default 'America/Sao_Paulo',
  energy_profile text not null default 'medium' check (energy_profile in ('low','medium','high')),
  objectives    text[] default '{}',
  routine       text[] default '{}',
  preferences   text[] default '{}',
  projects      text[] default '{}',
  life_areas    text[] default '{}',
  behavior_patterns text[] default '{}',
  persistent_context text[] default '{}',
  active_modules text[] default '{}',
  integrations  jsonb default '{"strava":"disconnected","openFinance":"disconnected","calendar":"disconnected","nativeCalendar":"disconnected"}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ── Tasks ────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  title      text not null,
  next_step  text,
  status     text not null default 'todo' check (status in ('todo','doing','done')),
  priority   int  not null default 3 check (priority between 1 and 5),
  goal_id    uuid,
  habit_id   uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists tasks_profile_status on tasks(profile_id, status);
create index if not exists tasks_profile_priority on tasks(profile_id, priority desc);

-- ── Goals ────────────────────────────────────────────────────────────────
create table if not exists goals (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid references profiles(id) on delete cascade not null,
  objective_id text,
  title        text not null,
  progress     int not null default 0 check (progress between 0 and 100),
  due_date     date,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index if not exists goals_profile on goals(profile_id);

-- ── Habits ───────────────────────────────────────────────────────────────
create table if not exists habits (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  goal_id    uuid references goals(id) on delete set null,
  title      text not null,
  frequency  text not null default 'daily' check (frequency in ('daily','weekly')),
  streak     int not null default 0,
  last_done  date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists habits_profile on habits(profile_id);

-- ── Habit Logs ───────────────────────────────────────────────────────────
create table if not exists habit_logs (
  id         uuid primary key default uuid_generate_v4(),
  habit_id   uuid references habits(id) on delete cascade not null,
  profile_id uuid references profiles(id) on delete cascade not null,
  done_at    date not null default current_date,
  created_at timestamptz default now(),
  unique (habit_id, done_at)
);

-- ── Insights ─────────────────────────────────────────────────────────────
create table if not exists insights (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  summary    text not null,
  actions    text[] default '{}',
  energy     text not null default 'medium' check (energy in ('low','medium','high')),
  created_at timestamptz default now()
);
create index if not exists insights_profile_created on insights(profile_id, created_at desc);

-- ── Memory (pgvector) ────────────────────────────────────────────────────
create table if not exists memories (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  type       text not null default 'fact' check (type in ('fact','pattern','event','preference')),
  text       text not null,
  embedding  vector(1536),          -- dimensão OpenAI/Claude embeddings
  score      float,
  metadata   jsonb default '{}',
  created_at timestamptz default now()
);
create index if not exists memories_profile on memories(profile_id);
-- Índice HNSW para busca vetorial eficiente
create index if not exists memories_embedding_hnsw
  on memories using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ── Calendar Events ──────────────────────────────────────────────────────
create table if not exists calendar_events (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  source     text not null default 'native',
  title      text not null,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  created_at timestamptz default now()
);
create index if not exists calendar_profile_starts on calendar_events(profile_id, starts_at);

-- ── Fitness Activities ───────────────────────────────────────────────────
create table if not exists fitness_activities (
  id           uuid primary key default uuid_generate_v4(),
  profile_id   uuid references profiles(id) on delete cascade not null,
  source       text not null default 'strava',
  type         text not null,
  duration_min int not null,
  intensity    text not null default 'medium' check (intensity in ('low','medium','high')),
  started_at   timestamptz not null,
  created_at   timestamptz default now()
);
create index if not exists fitness_profile_started on fitness_activities(profile_id, started_at desc);

-- ── Financial Accounts ───────────────────────────────────────────────────
create table if not exists financial_accounts (
  id              uuid primary key default uuid_generate_v4(),
  profile_id      uuid references profiles(id) on delete cascade not null,
  institution     text not null,
  type            text not null check (type in ('checking','savings','credit')),
  balance         numeric(14,2) not null default 0,
  currency        text not null default 'BRL',
  last_updated_at timestamptz default now()
);

-- ── Financial Transactions ───────────────────────────────────────────────
create table if not exists financial_transactions (
  id          uuid primary key default uuid_generate_v4(),
  account_id  uuid references financial_accounts(id) on delete cascade not null,
  profile_id  uuid references profiles(id) on delete cascade not null,
  description text not null,
  amount      numeric(14,2) not null,
  category    text,
  occurred_at timestamptz not null default now(),
  created_at  timestamptz default now()
);
create index if not exists txn_profile_occurred on financial_transactions(profile_id, occurred_at desc);

-- ── Connections ──────────────────────────────────────────────────────────
create table if not exists connections (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid references profiles(id) on delete cascade not null,
  provider   text not null check (provider in ('strava','open_finance','google_calendar','native_calendar')),
  status     text not null default 'disconnected' check (status in ('connected','disconnected')),
  synced_at  timestamptz,
  unique (profile_id, provider)
);

-- ── Squad Executions ─────────────────────────────────────────────────────
create table if not exists squad_executions (
  id          uuid primary key default uuid_generate_v4(),
  profile_id  uuid references profiles(id) on delete cascade not null,
  workflow_id text not null,
  squad       text not null,
  status      text not null default 'queued' check (status in ('queued','running','done','error')),
  input       jsonb default '{}',
  output      jsonb default '{}',
  started_at  timestamptz default now(),
  finished_at timestamptz
);
create index if not exists squad_exec_profile on squad_executions(profile_id, started_at desc);

-- ── Updated_at trigger automático ────────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ begin
  create trigger trg_profiles_updated before update on profiles
    for each row execute function update_updated_at();
  exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_tasks_updated before update on tasks
    for each row execute function update_updated_at();
  exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_goals_updated before update on goals
    for each row execute function update_updated_at();
  exception when duplicate_object then null;
end $$;

do $$ begin
  create trigger trg_habits_updated before update on habits
    for each row execute function update_updated_at();
  exception when duplicate_object then null;
end $$;

-- ── Row Level Security ───────────────────────────────────────────────────
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table goals enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table insights enable row level security;
alter table memories enable row level security;
alter table calendar_events enable row level security;
alter table fitness_activities enable row level security;
alter table financial_accounts enable row level security;
alter table financial_transactions enable row level security;
alter table connections enable row level security;
alter table squad_executions enable row level security;

-- Policies: usuário só acessa seus próprios dados via service_role key (API backend)
-- Para acesso direto do usuário autenticado:
create policy "own profile" on profiles for all using (auth.uid() = user_id);
create policy "own tasks" on tasks for all using (
  profile_id in (select id from profiles where user_id = auth.uid())
);
create policy "own goals" on goals for all using (
  profile_id in (select id from profiles where user_id = auth.uid())
);
create policy "own habits" on habits for all using (
  profile_id in (select id from profiles where user_id = auth.uid())
);
create policy "own memories" on memories for all using (
  profile_id in (select id from profiles where user_id = auth.uid())
);

-- ── Função busca semântica ────────────────────────────────────────────────
create or replace function match_memories(
  query_embedding vector(1536),
  profile_id_filter uuid,
  match_count int default 5,
  match_threshold float default 0.7
)
returns table (id uuid, text text, type text, similarity float, created_at timestamptz)
language plpgsql as $$
begin
  return query
  select m.id, m.text, m.type,
         1 - (m.embedding <=> query_embedding) as similarity,
         m.created_at
  from memories m
  where m.profile_id = profile_id_filter
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) > match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
end; $$;

-- ── Seed: perfil padrão (ajuste o user_id após criar sua conta) ──────────
-- insert into profiles (user_id, name, email, role, age, timezone, energy_profile,
--   objectives, routine, life_areas, behavior_patterns, active_modules)
-- values (
--   'SEU_AUTH_USER_ID_AQUI',
--   'Gustavo Vicente', 'gustav0.v1c3nt3@gmail.com', 'Admin Master', 33,
--   'America/Sao_Paulo', 'high',
--   ARRAY['Ganhar R$10.000 com internet', 'Manter rotina de alta performance'],
--   ARRAY['Treino diário', 'Programação', 'Estudo', 'Fechamento do dia 00:00'],
--   ARRAY['Negócios Digitais', 'Saúde', 'Execução', 'Finanças'],
--   ARRAY['Alta energia após treino', 'Executa melhor com tarefas claras'],
--   ARRAY['overview','tarefas','habitos','metas','financeiro','calendario','insights','fitness','perfil','memoria','orquestracao']
-- );
