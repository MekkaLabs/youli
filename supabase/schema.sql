create extension if not exists "pgcrypto";

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'America/Sao_Paulo',
  energy_profile text not null default 'medium',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists visions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references user_profiles(id) on delete cascade,
  title text not null,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists objectives (
  id uuid primary key default gen_random_uuid(),
  vision_id uuid not null references visions(id) on delete cascade,
  title text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references objectives(id) on delete cascade,
  title text not null,
  due_date date,
  progress int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete set null,
  title text not null,
  frequency text not null,
  streak int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references goals(id) on delete set null,
  objective_id uuid references objectives(id) on delete set null,
  habit_id uuid references habits(id) on delete set null,
  title text not null,
  next_step text,
  status text not null default 'todo',
  priority int not null default 3,
  created_at timestamptz not null default now()
);

create table if not exists daily_insights (
  id uuid primary key default gen_random_uuid(),
  summary text not null,
  actions jsonb not null default '[]'::jsonb,
  energy text not null default 'medium',
  created_at timestamptz not null default now()
);

create table if not exists memory_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  type text not null,
  text text not null,
  embedding jsonb,
  score numeric,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_status_priority on tasks(status, priority desc);
create index if not exists idx_goals_objective on goals(objective_id);
create index if not exists idx_habits_goal on habits(goal_id);
create index if not exists idx_memory_user_type on memory_records(user_id, type);
