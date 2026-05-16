import { NextResponse } from 'next/server';
import type { UserProfile } from '@youli/shared';
import { readDb, writeDb } from '../../../../src/repositories/local-db';

export async function GET() {
  return NextResponse.json(readDb().profile);
}

function validatePatch(body: Partial<UserProfile>): string | null {
  if (body.humanDesign) {
    if (typeof body.humanDesign.enabled !== 'undefined' && typeof body.humanDesign.enabled !== 'boolean') {
      return 'humanDesign.enabled inválido';
    }
    if (typeof body.humanDesign.consentAccepted !== 'undefined' && typeof body.humanDesign.consentAccepted !== 'boolean') {
      return 'humanDesign.consentAccepted inválido';
    }
    if (typeof body.humanDesign.mode !== 'undefined' && body.humanDesign.mode !== 'off' && body.humanDesign.mode !== 'assistive') {
      return 'humanDesign.mode inválido';
    }
  }
  return null;
}

async function updateProfile(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<UserProfile>;
  const err = validatePatch(body);
  if (err) return NextResponse.json({ error: err }, { status: 400 });
  const db = readDb();
  db.profile = {
    ...db.profile,
    ...body,
    humanDesign: {
      ...(db.profile.humanDesign || { enabled: false, consentAccepted: false, mode: 'off' as const }),
      ...(body.humanDesign || {})
    },
    aiPersonalization: body.aiPersonalization || db.profile.aiPersonalization
  };
  writeDb(db);
  return NextResponse.json(db.profile);
}

export async function POST(req: Request) {
  return updateProfile(req);
}

export async function PATCH(req: Request) {
  return updateProfile(req);
}
