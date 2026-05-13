-- ═══════════════════════════════════════════════════════════════════════
-- YOULI — Seed de demonstração
-- Rode APÓS criar seu usuário em auth.users e pegar o ID
-- ═══════════════════════════════════════════════════════════════════════

-- 1. Substitua 'PROFILE_ID' abaixo pelo id retornado do insert de profiles
-- 2. Cole no SQL Editor do Supabase

do $$
declare
  p_id uuid := (select id from profiles limit 1); -- pega o primeiro perfil
begin

-- Tasks demo
insert into tasks (profile_id, title, next_step, status, priority) values
  (p_id, 'Programar novos aplicativos', 'Definir escopo e iniciar arquitetura base.', 'todo', 5),
  (p_id, 'Ir à Vivo resolver problema de celular', 'Levar documento e protocolo anterior.', 'todo', 4),
  (p_id, 'Estudar Supabase + pgvector', 'Assistir documentação oficial e implementar.', 'doing', 5);

-- Goals demo
insert into goals (profile_id, title, progress) values
  (p_id, 'Conseguir ganhar R$10.000 com internet', 15),
  (p_id, 'Lançar YOULI MVP em 8 semanas', 35);

-- Habits demo
insert into habits (profile_id, title, frequency, streak) values
  (p_id, 'Treinar (triathlon, jiu e muaythai)', 'daily', 3),
  (p_id, 'Estudar programação', 'daily', 5),
  (p_id, 'Dormir 00:00', 'daily', 2),
  (p_id, 'Leitura técnica 30min', 'daily', 7);

-- Insights demo
insert into insights (profile_id, summary, actions, energy) values
  (p_id, 'Seu foco sobe quando treino e estudo são executados no mesmo dia.',
   ARRAY['Manter janela fixa de treino', 'Reservar 60-90min para estudo técnico'], 'high');

-- Calendar demo
insert into calendar_events (profile_id, source, title, starts_at, ends_at) values
  (p_id, 'native', 'Bloco de Programação', now(), now() + interval '90 minutes'),
  (p_id, 'native', 'Treino (triathlon / luta)', now() + interval '3 hours', now() + interval '4 hours'),
  (p_id, 'native', 'Vivo - resolver celular', now() + interval '6 hours', now() + interval '7 hours');

-- Fitness demo
insert into fitness_activities (profile_id, source, type, duration_min, intensity, started_at) values
  (p_id, 'strava', 'Triathlon', 70, 'high', now() - interval '1 day'),
  (p_id, 'strava', 'Jiu-Jitsu', 50, 'high', now() - interval '2 days');

-- Financial accounts demo
insert into financial_accounts (profile_id, institution, type, balance) values
  (p_id, 'Nubank', 'checking', 8420.50),
  (p_id, 'Itaú', 'savings', 12500.00),
  (p_id, 'Inter', 'credit', -2100.25);

-- Connections demo
insert into connections (profile_id, provider, status, synced_at) values
  (p_id, 'strava', 'connected', now()),
  (p_id, 'open_finance', 'connected', now()),
  (p_id, 'google_calendar', 'connected', now()),
  (p_id, 'native_calendar', 'connected', now())
on conflict (profile_id, provider) do update set status = excluded.status, synced_at = excluded.synced_at;

end $$;
