import { createClient } from '@supabase/supabase-js';

const url  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key  = process.env.SUPABASE_SERVICE_ROLE_KEY!; // service_role — só no backend

if (!url || !key) {
  console.warn('[supabase] NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados. Usando fallback local.');
}

export const supabase = url && key ? createClient(url, key, {
  auth: { persistSession: false },
}) : null;

/**
 * Helper: usa Supabase apenas quando o cliente existe E o opt-in explícito
 * YOULI_USE_SUPABASE=true está ligado. Default: false (persistência JSON local).
 * Isso mantém as env vars do Supabase configuradas para o futuro sem forçar
 * o uso antes de o schema estar aplicado/acessível.
 */
export const hasSupabase = () => Boolean(supabase) && process.env.YOULI_USE_SUPABASE === 'true';

// Tipo auxiliar para perfil do Supabase → UserProfile do @youli/shared
export function rowToProfile(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    age: row.age,
    avatarUrl: row.avatar_url,
    timezone: row.timezone,
    energyProfile: row.energy_profile,
    objectives: row.objectives ?? [],
    routine: row.routine ?? [],
    preferences: row.preferences ?? [],
    projects: row.projects ?? [],
    lifeAreas: row.life_areas ?? [],
    behaviorPatterns: row.behavior_patterns ?? [],
    persistentContext: row.persistent_context ?? [],
    activeModules: row.active_modules ?? [],
    integrations: row.integrations ?? {},
  };
}
