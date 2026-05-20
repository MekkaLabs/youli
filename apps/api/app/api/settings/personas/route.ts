import { NextResponse } from 'next/server';
import type { PersonaId, PersonaPersonalization } from '@youli/shared';
import { PERSONA_AREA_MAP } from '../../../../src/services/agents/agent-definitions';
import { readDb, writeDb } from '../../../../src/repositories/local-db';
import { requireAuth } from '@/lib/http';

type PersonaPatch = {
  personaId: PersonaId;
  enabled?: boolean;
  humanDesignEnabled?: boolean;
};

function isPersonaId(value: string): value is PersonaId {
  return Object.prototype.hasOwnProperty.call(PERSONA_AREA_MAP, value);
}

function normalizePersonas(current: PersonaPersonalization[]): PersonaPersonalization[] {
  const map = new Map(current.map((p) => [p.personaId, p]));
  return (Object.keys(PERSONA_AREA_MAP) as PersonaId[]).map((personaId) => ({
    personaId,
    area: PERSONA_AREA_MAP[personaId],
    enabled: map.get(personaId)?.enabled ?? true,
    humanDesignEnabled: map.get(personaId)?.humanDesignEnabled ?? false
  }));
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const db = readDb(auth.user.id);
  const personas = normalizePersonas(db.profile.aiPersonalization?.personas || []);
  return NextResponse.json({ personas });
}

export async function PATCH(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  const body = (await req.json().catch(() => ({}))) as PersonaPatch | { personas?: PersonaPatch[] };
  const patches = Array.isArray((body as { personas?: PersonaPatch[] }).personas)
    ? (body as { personas?: PersonaPatch[] }).personas || []
    : [body as PersonaPatch];

  for (const patch of patches) {
    if (!patch || !isPersonaId(String(patch.personaId))) {
      return NextResponse.json({ error: 'personaId inválido' }, { status: 400 });
    }
    if (typeof patch.enabled !== 'undefined' && typeof patch.enabled !== 'boolean') {
      return NextResponse.json({ error: `enabled inválido para ${patch.personaId}` }, { status: 400 });
    }
    if (typeof patch.humanDesignEnabled !== 'undefined' && typeof patch.humanDesignEnabled !== 'boolean') {
      return NextResponse.json({ error: `humanDesignEnabled inválido para ${patch.personaId}` }, { status: 400 });
    }
  }

  const db = readDb(auth.user.id);
  const normalized = normalizePersonas(db.profile.aiPersonalization?.personas || []);
  const map = new Map(normalized.map((p) => [p.personaId, p]));

  for (const patch of patches) {
    const current = map.get(patch.personaId);
    if (!current) continue;
    map.set(patch.personaId, {
      ...current,
      area: PERSONA_AREA_MAP[patch.personaId],
      enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
      humanDesignEnabled: typeof patch.humanDesignEnabled === 'boolean' ? patch.humanDesignEnabled : current.humanDesignEnabled
    });
  }

  db.profile.aiPersonalization = { personas: normalizePersonas(Array.from(map.values())) };
  writeDb(auth.user.id, db);

  return NextResponse.json({ personas: db.profile.aiPersonalization.personas });
}
