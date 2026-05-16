import { NextRequest, NextResponse } from 'next/server';
import { listVersions, undoToVersion } from '@/services/agents/life-versioning';

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get('userId') ?? 'default';
  const area = req.nextUrl.searchParams.get('area') ?? undefined;
  const versions = listVersions(userId, area);
  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, userId, versionId } = body;
  if (action === 'undo') {
    const version = undoToVersion(userId, versionId);
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    return NextResponse.json({ version });
  }
  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
