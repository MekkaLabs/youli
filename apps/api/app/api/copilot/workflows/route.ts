import { NextRequest, NextResponse } from 'next/server';
import { LifeArea } from '@/services/agents/agent-definitions';
import {
  AreaWorkflowDefinition,
  activateWorkflow,
  listWorkflowBundles,
  rollbackWorkflow,
  updateWorkflowDraft
} from '@/services/agents/workflow-catalog';

const VALID_AREAS: LifeArea[] = [
  'dashboard',
  'tarefas',
  'habitos',
  'metas',
  'financeiro',
  'fitness',
  'calendario',
  'insights',
  'foco',
  'perfil',
];

export async function GET() {
  return NextResponse.json({ workflows: listWorkflowBundles() });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const area = body?.area as LifeArea | undefined;
  if (!area || !VALID_AREAS.includes(area)) {
    return NextResponse.json({ error: 'area invalida' }, { status: 400 });
  }
  const action = body?.action as 'update_draft' | 'activate' | 'rollback' | undefined;
  if (!action) {
    return NextResponse.json({ error: 'action invalida' }, { status: 400 });
  }

  if (action === 'update_draft') {
    const patch = body?.patch as Partial<AreaWorkflowDefinition> | undefined;
    if (!patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'patch invalido' }, { status: 400 });
    }
    const updated = updateWorkflowDraft(area, patch);
    return NextResponse.json({ area, draft: updated });
  }

  if (action === 'activate') {
    const active = activateWorkflow(area);
    return NextResponse.json({ area, active });
  }

  const rolled = rollbackWorkflow(area);
  return NextResponse.json({ area, active: rolled });
}
