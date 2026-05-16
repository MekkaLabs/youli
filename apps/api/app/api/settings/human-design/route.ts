import { NextResponse } from 'next/server';
import type { HumanDesignSettings } from '@youli/shared';
import { readDb, writeDb } from '../../../../src/repositories/local-db';

function isValidDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function validateHumanDesignPatch(input: Partial<HumanDesignSettings>): string | null {
  if (typeof input.enabled !== 'undefined' && typeof input.enabled !== 'boolean') return 'enabled inválido';
  if (typeof input.consentAccepted !== 'undefined' && typeof input.consentAccepted !== 'boolean') return 'consentAccepted inválido';
  if (typeof input.mode !== 'undefined' && input.mode !== 'off' && input.mode !== 'assistive') return 'mode inválido';

  if (input.birthData) {
    if (typeof input.birthData.date !== 'undefined' && !isValidDate(input.birthData.date)) return 'birthData.date inválido';
    if (typeof input.birthData.time !== 'undefined' && !isValidTime(input.birthData.time)) return 'birthData.time inválido';
    if (typeof input.birthData.location !== 'undefined' && !input.birthData.location.trim()) return 'birthData.location inválido';
  }

  return null;
}

export async function GET() {
  const db = readDb();
  return NextResponse.json(
    db.profile.humanDesign || {
      enabled: false,
      consentAccepted: false,
      mode: 'off',
    }
  );
}

export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<HumanDesignSettings>;
  const error = validateHumanDesignPatch(body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const db = readDb();
  const current = db.profile.humanDesign || { enabled: false, consentAccepted: false, mode: 'off' as const };
  db.profile.humanDesign = {
    ...current,
    ...body,
    birthData: body.birthData ? { ...(current.birthData || {}), ...body.birthData } : current.birthData,
    chart: body.chart ? { ...(current.chart || {}), ...body.chart } : current.chart,
  };
  writeDb(db);
  return NextResponse.json(db.profile.humanDesign);
}
