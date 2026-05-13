/**
 * GET  /api/settings/orchestrator → retorna config atual
 * PATCH /api/settings/orchestrator → atualiza nome/emoji do orquestrador
 *
 * Config persiste no perfil do usuário no Supabase ou local
 */

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_ORCHESTRATOR } from '@/services/agents/agent-definitions';

// Em produção, isso viria do Supabase profile
// Por ora, usa variável de ambiente ou padrão
function getCurrentConfig() {
  return {
    name: process.env.ORCHESTRATOR_NAME || DEFAULT_ORCHESTRATOR.name,
    emoji: process.env.ORCHESTRATOR_EMOJI || DEFAULT_ORCHESTRATOR.emoji,
    description: DEFAULT_ORCHESTRATOR.description,
    personality: DEFAULT_ORCHESTRATOR.personality,
    availableNames: [
      { name: 'Youli', emoji: '🤖', description: 'Seu assistente pessoal Youli' },
      { name: 'Jarvis', emoji: '⚡', description: 'Assistente de alta performance' },
      { name: 'Atlas', emoji: '🌍', description: 'Visionário de longo prazo' },
      { name: 'Mentor', emoji: '🦅', description: 'Guia sábio e experiente' },
      { name: 'Spark', emoji: '✨', description: 'Motivador energético' },
      { name: 'Nexus', emoji: '🔮', description: 'Conector de padrões e insights' },
      { name: 'Echo', emoji: '🎯', description: 'Foco e clareza absoluta' },
      { name: 'Sage', emoji: '📿', description: 'Sabedoria e equilíbrio' },
    ],
    agents: Object.entries(
      (await import('@/services/agents/agent-definitions')).AGENT_DEFINITIONS
    ).map(([area, agent]) => ({
      area,
      name: agent.name,
      fullName: agent.fullName,
      emoji: agent.emoji,
      color: agent.color,
      domain: agent.domain,
      tagline: agent.tagline,
    })),
  };
}

export async function GET() {
  try {
    const config = await getCurrentConfig();
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, emoji } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name é obrigatório' }, { status: 400 });
    }

    // Em produção: salvar no Supabase profile
    // Por ora, retorna confirmação
    return NextResponse.json({
      success: true,
      config: {
        name: name.trim(),
        emoji: emoji || '🤖',
        message: `Orquestrador renomeado para ${name}!`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao atualizar configuração' }, { status: 500 });
  }
}
