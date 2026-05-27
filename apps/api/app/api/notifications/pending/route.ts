/**
 * GET /api/notifications/pending
 * Retorna notificações pendentes do sistema Youli
 * Por ora retorna mock — integração com Supabase realtime na Semana 5
 */
import { NextResponse } from 'next/server';
import { logError, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    // TODO(notifications): buscar do Supabase quando signal_bus estiver em prod
    const notifications = [
      {
        id: '1',
        type: 'habit_reminder',
        title: 'Hábitos pendentes',
        message: 'Você tem hábitos para completar hoje',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        read: false,
        agent: 'Aristóteles',
        agentEmoji: '🏛️',
      },
    ];

    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.read).length,
    });
  } catch (err) {
    logError('GET /api/notifications/pending', err);
    return NextResponse.json({ notifications: [], unreadCount: 0 }, { status: 200 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  try {
    // body reservado para uso futuro (marcar como lida, criar notif custom)
    void (await req.json().catch(() => ({})));
    return NextResponse.json({ success: true });
  } catch (err) {
    logError('POST /api/notifications/pending', err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
}
