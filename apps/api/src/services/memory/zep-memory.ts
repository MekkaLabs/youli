/**
 * ZEP MEMORY ENGINE v3
 * Inspirado no MiroFish: memória de grafo temporal com relações cross-entidade
 *
 * Zep Cloud: https://app.getzep.com/ (tier gratuita disponível)
 * Fallback: pgvector (MemoryEngine v2 existente)
 *
 * Diferença vs pgvector:
 * - Zep mantém GRAFO de relações entre memórias (não só vetores isolados)
 * - Temporal: sabe QUANDO cada memória foi criada e como evoluiu
 * - Cross-entity: "hábito de exercício" ↔ "meta de saúde" ↔ "produtividade"
 */

const ZEP_BASE_URL = 'https://api.getzep.com/api/v2';

export interface ZepFact {
  uuid: string;
  content: string;
  score?: number;
  created_at?: string;
  valid_at?: string;
  name?: string;
}

export interface ZepSearchResult {
  fact: ZepFact;
  score: number;
}

export interface ZepMemoryInput {
  roleType: 'user' | 'assistant' | 'system';
  role: string;   // Nome do agente ou "user"
  content: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  sourceEntityId: string;
  targetEntityId: string;
  relationType: string; // "impacts", "correlates_with", "blocks", "enables"
  weight: number;       // 0-1
  context: string;
}

/**
 * Verifica se Zep está configurado
 */
function hasZep(): boolean {
  return !!process.env.ZEP_API_KEY;
}

/**
 * Headers padrão para API do Zep
 */
function zepHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Api-Key ${process.env.ZEP_API_KEY}`,
  };
}

// ──────────────────────────────────────────────
// SESSION MANAGEMENT
// ──────────────────────────────────────────────

/**
 * Garante que a sessão Zep existe para o usuário
 */
export async function ensureZepSession(userId: string): Promise<void> {
  if (!hasZep()) return;

  try {
    const res = await fetch(`${ZEP_BASE_URL}/sessions/${userId}`, {
      headers: zepHeaders(),
    });

    if (res.status === 404) {
      // Cria sessão
      await fetch(`${ZEP_BASE_URL}/sessions`, {
        method: 'POST',
        headers: zepHeaders(),
        body: JSON.stringify({
          session_id: userId,
          metadata: { product: 'youli', version: '3.0' },
        }),
      });
    }
  } catch (err) {
    console.warn('[Zep] ensureSession error:', err);
  }
}

// ──────────────────────────────────────────────
// MEMORY OPERATIONS
// ──────────────────────────────────────────────

/**
 * Adiciona memórias à sessão Zep (grafo temporal)
 * Zep extrai automaticamente entidades, fatos e relações
 */
export async function addZepMemory(
  userId: string,
  messages: ZepMemoryInput[]
): Promise<void> {
  if (!hasZep()) return;

  try {
    await ensureZepSession(userId);

    const payload = {
      messages: messages.map((m) => ({
        role_type: m.roleType,
        role: m.role,
        content: m.content,
        metadata: m.metadata || {},
      })),
    };

    await fetch(`${ZEP_BASE_URL}/sessions/${userId}/memory`, {
      method: 'POST',
      headers: zepHeaders(),
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('[Zep] addMemory error:', err);
  }
}

/**
 * Busca memórias relevantes via grafo semântico do Zep
 * Muito mais rico que pgvector puro: considera relações entre entidades
 */
export async function searchZepMemory(
  userId: string,
  query: string,
  limit = 8
): Promise<ZepSearchResult[]> {
  if (!hasZep()) return [];

  try {
    const res = await fetch(
      `${ZEP_BASE_URL}/sessions/${userId}/memory/search?text=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: zepHeaders() }
    );

    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    console.warn('[Zep] searchMemory error:', err);
    return [];
  }
}

/**
 * Recupera contexto de memória atual (fatos extraídos pelo Zep)
 */
export async function getZepContext(userId: string): Promise<string> {
  if (!hasZep()) return '';

  try {
    const res = await fetch(
      `${ZEP_BASE_URL}/sessions/${userId}/memory`,
      { headers: zepHeaders() }
    );

    if (!res.ok) return '';
    const data = await res.json();

    // Zep retorna "context" como string resumida das memórias relevantes
    return data.context || '';
  } catch (err) {
    console.warn('[Zep] getContext error:', err);
    return '';
  }
}

// ──────────────────────────────────────────────
// USER GRAPH (Knowledge Graph do usuário)
// ──────────────────────────────────────────────

/**
 * Adiciona fato ao grafo de conhecimento do usuário
 * (Zep User Graph — persiste além de sessões)
 */
export async function addUserFact(
  userId: string,
  fact: string,
  area: string
): Promise<void> {
  if (!hasZep()) return;

  try {
    await fetch(`${ZEP_BASE_URL}/users/${userId}/facts`, {
      method: 'POST',
      headers: zepHeaders(),
      body: JSON.stringify({
        facts: [{ content: `[${area.toUpperCase()}] ${fact}` }],
      }),
    });
  } catch (err) {
    console.warn('[Zep] addUserFact error:', err);
  }
}

/**
 * Busca fatos do usuário por área de vida
 */
export async function getUserFacts(
  userId: string,
  query?: string
): Promise<ZepFact[]> {
  if (!hasZep()) return [];

  try {
    const url = query
      ? `${ZEP_BASE_URL}/users/${userId}/facts?text=${encodeURIComponent(query)}`
      : `${ZEP_BASE_URL}/users/${userId}/facts`;

    const res = await fetch(url, { headers: zepHeaders() });
    if (!res.ok) return [];
    const data = await res.json();
    return data.facts || [];
  } catch (err) {
    console.warn('[Zep] getUserFacts error:', err);
    return [];
  }
}

// ──────────────────────────────────────────────
// CROSS-ENTITY CORRELATION (GraphRAG leve)
// ──────────────────────────────────────────────

/**
 * Registra uma correlação descoberta entre áreas de vida
 * Ex: "Quando exercício aumenta, produtividade de tarefas sobe 23%"
 */
export async function recordLifeCorrelation(
  userId: string,
  sourceArea: string,
  targetArea: string,
  correlation: string,
  strength: 'weak' | 'moderate' | 'strong'
): Promise<void> {
  const fact = `CORRELAÇÃO ${strength.toUpperCase()} [${sourceArea}→${targetArea}]: ${correlation}`;
  await addUserFact(userId, fact, 'correlation');
}

/**
 * Recupera correlações conhecidas para um agente
 * Ex: Sócrates usa isso para gerar insights cross-área
 */
export async function getLifeCorrelations(userId: string): Promise<ZepFact[]> {
  return getUserFacts(userId, 'CORRELAÇÃO');
}
