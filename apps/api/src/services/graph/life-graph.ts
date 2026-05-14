/**
 * LIFE GRAPH SERVICE — GraphRAG leve para o Youli
 * Mapeia correlações entre entidades de vida e alimenta os agentes com contexto de grafo
 *
 * Inspirado no MiroFish: agentes com memória de grafo + relações temporais
 */

import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type RelationType =
  | 'impacts'         // A tem impacto direto em B
  | 'correlates_with' // A e B sobem/caem juntos
  | 'blocks'          // A impede progresso de B
  | 'enables'         // A facilita B
  | 'contradicts';    // A e B estão em conflito

export interface LifeRelation {
  sourceLabel: string;
  sourceArea: string;
  relationType: RelationType;
  strength: number;
  targetLabel: string;
  targetArea: string;
  evidence?: string;
  confidence?: number;
}

export interface GraphContext {
  relations: LifeRelation[];
  summary: string;  // Resumo legível para passar ao agente
}

// ──────────────────────────────────────────────
// REGISTRO DE RELAÇÕES
// ──────────────────────────────────────────────

/**
 * Registra uma relação descoberta (pode ser chamado pelos agentes)
 */
export async function recordRelation(
  profileId: string,
  relation: Omit<LifeRelation, 'confidence'> & { confidence?: number; discoveredBy?: string }
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;

  try {
    // Upsert: se a relação já existe, incrementa observação
    const { data: existing } = await sb
      .from('life_relationships')
      .select('id, observation_count, strength')
      .eq('profile_id', profileId)
      .eq('source_label', relation.sourceLabel)
      .eq('target_label', relation.targetLabel)
      .eq('relation_type', relation.relationType)
      .single();

    if (existing) {
      await sb.from('life_relationships').update({
        observation_count: existing.observation_count + 1,
        strength: Math.min(1, existing.strength + 0.05), // Força cresce com observações
        last_confirmed_at: new Date().toISOString(),
        evidence: relation.evidence,
      }).eq('id', existing.id);
    } else {
      await sb.from('life_relationships').insert({
        profile_id: profileId,
        source_type: 'area',
        source_label: relation.sourceLabel,
        source_area: relation.sourceArea,
        relation_type: relation.relationType,
        strength: relation.strength,
        target_type: 'area',
        target_label: relation.targetLabel,
        target_area: relation.targetArea,
        evidence: relation.evidence,
        confidence: relation.confidence || 0.6,
        discovered_by: relation.discoveredBy || 'system',
      });
    }
  } catch (err) {
    console.warn('[LifeGraph] recordRelation error:', err);
  }
}

/**
 * Retorna o contexto de grafo para uma área — usado pelos agentes
 */
export async function getAreaGraphContext(
  profileId: string,
  area: string,
  minStrength = 0.3
): Promise<GraphContext> {
  const sb = getSupabase();
  if (!sb) return { relations: [], summary: '' };

  try {
    const { data } = await sb.rpc('get_area_relationships', {
      p_profile_id: profileId,
      p_area: area,
      p_min_strength: minStrength,
    });

    const relations: LifeRelation[] = (data || []).map((r: any) => ({
      sourceLabel: r.source_label,
      sourceArea: r.source_area,
      relationType: r.relation_type as RelationType,
      strength: r.strength,
      targetLabel: r.target_label,
      targetArea: r.target_area,
      evidence: r.evidence,
      confidence: r.confidence,
    }));

    const summary = buildGraphSummary(area, relations);
    return { relations, summary };
  } catch (err) {
    console.warn('[LifeGraph] getAreaGraphContext error:', err);
    return { relations: [], summary: '' };
  }
}

/**
 * Correlações automáticas: analisa dados do usuário e descobre relações
 * Chamado após updates de hábitos, tarefas, finanças, fitness
 */
export async function autoDiscoverCorrelations(
  profileId: string,
  snapshot: {
    tasks?: any[];
    habits?: any[];
    goals?: any[];
    fitness?: any;
    finances?: any;
  }
): Promise<LifeRelation[]> {
  const discovered: LifeRelation[] = [];

  // Regra 1: Hábitos fortes → produtividade alta
  const strongHabits = snapshot.habits?.filter((h) => h.streak >= 7) || [];
  const completedTasks = snapshot.tasks?.filter((t) => t.status === 'done') || [];

  if (strongHabits.length >= 3 && completedTasks.length >= 5) {
    const rel: LifeRelation = {
      sourceLabel: 'Hábitos Consistentes',
      sourceArea: 'habitos',
      relationType: 'enables',
      strength: 0.75,
      targetLabel: 'Alta Produtividade',
      targetArea: 'tarefas',
      evidence: `${strongHabits.length} hábitos com streak ≥7 dias correlacionados com ${completedTasks.length} tarefas concluídas`,
    };
    discovered.push(rel);
    await recordRelation(profileId, { ...rel, discoveredBy: 'system' });
  }

  // Regra 2: Atividade física → metas em progresso
  const weeklyActivities = snapshot.fitness?.weeklyActivities || 0;
  const goalsOnTrack = snapshot.goals?.filter((g) => g.progress >= 50) || [];

  if (weeklyActivities >= 3 && goalsOnTrack.length > 0) {
    const rel: LifeRelation = {
      sourceLabel: 'Atividade Física Regular',
      sourceArea: 'fitness',
      relationType: 'correlates_with',
      strength: 0.65,
      targetLabel: 'Progresso em Metas',
      targetArea: 'metas',
      evidence: `${weeklyActivities} treinos/semana correlacionados com ${goalsOnTrack.length} metas em progresso`,
    };
    discovered.push(rel);
    await recordRelation(profileId, { ...rel, discoveredBy: 'hipocrates' });
  }

  // Regra 3: Finanças negativas bloqueiam bem-estar
  if (snapshot.finances) {
    const { balance, expenses, income } = snapshot.finances;
    const savingsRate = income > 0 ? (income - expenses) / income : 0;

    if (savingsRate < 0.1) {
      const rel: LifeRelation = {
        sourceLabel: 'Taxa de Poupança Baixa',
        sourceArea: 'financeiro',
        relationType: 'blocks',
        strength: 0.7,
        targetLabel: 'Liberdade e Tranquilidade',
        targetArea: 'perfil',
        evidence: `Taxa de poupança de ${(savingsRate * 100).toFixed(0)}% — abaixo do mínimo recomendado de 20%`,
      };
      discovered.push(rel);
      await recordRelation(profileId, { ...rel, discoveredBy: 'adam' });
    }
  }

  return discovered;
}

// ──────────────────────────────────────────────
// HELPER
// ──────────────────────────────────────────────

function buildGraphSummary(area: string, relations: LifeRelation[]): string {
  if (relations.length === 0) return '';

  const lines: string[] = [`Conexões da área ${area}:`];

  for (const r of relations.slice(0, 5)) {
    const isSource = r.sourceArea === area;
    const other = isSource ? `${r.targetLabel} (${r.targetArea})` : `${r.sourceLabel} (${r.sourceArea})`;
    const verb = {
      impacts: isSource ? 'impacta' : 'é impactado por',
      correlates_with: 'se correlaciona com',
      blocks: isSource ? 'bloqueia' : 'é bloqueado por',
      enables: isSource ? 'facilita' : 'é facilitado por',
      contradicts: 'contradiz',
    }[r.relationType] || r.relationType;

    lines.push(`• ${isSource ? r.sourceLabel : r.targetLabel} ${verb} ${other} (força: ${(r.strength * 100).toFixed(0)}%)`);
    if (r.evidence) lines.push(`  Evidência: ${r.evidence}`);
  }

  return lines.join('\n');
}
