import { NextRequest, NextResponse } from 'next/server';
import { listVersions, undoToVersion } from '@/services/agents/life-versioning';
import { jsonError, requireAuth } from '@/lib/http';

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const area = req.nextUrl.searchParams.get('area') ?? undefined;
    const versions = listVersions(auth.user.id, area);
    return NextResponse.json({ versions });
  } catch (err) {
    return jsonError('Erro ao listar versões', 500, err, 'GET /api/copilot/versions');
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    const body = (await req.json().catch(() => ({}))) as { action?: string; versionId?: string };
    const { action, versionId } = body;
    if (action === 'undo') {
      if (!versionId) {
        return NextResponse.json({ error: 'versionId é obrigatório' }, { status: 400 });
      }
      const version = undoToVersion(auth.user.id, versionId);
      if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });
      return NextResponse.json({ version });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return jsonError('Erro ao processar versão', 500, err, 'POST /api/copilot/versions');
  }
}
