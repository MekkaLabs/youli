/**
 * POST /api/open-finance/connect — conecta banco via Open Banking Brasil (Pluggy/Belvo)
 * GET  /api/open-finance/connect — lista bancos disponíveis
 *
 * Estado atual:
 *  - Quando PLUGGY/BELVO não estão configurados (env vazia), opera em modo
 *    MOCK e devolve `status: 'pending_mock'` para o cliente saber que o
 *    dado é simulado. Sem mascarar o mock como "connected".
 *  - Erros sempre logados via `logError`.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { jsonError, logError, parseJsonBody, requireAuth } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SupportedBank {
  id: string;
  name: string;
  logo: string;
  color: string;
  type: 'digital' | 'traditional' | 'investment';
  popular: boolean;
}

const SUPPORTED_BANKS: SupportedBank[] = [
  { id: 'nubank',    name: 'Nubank',           logo: '💜', color: '#820AD1', type: 'digital',      popular: true  },
  { id: 'itau',      name: 'Itaú',             logo: '🔶', color: '#E87722', type: 'traditional',  popular: true  },
  { id: 'bradesco',  name: 'Bradesco',         logo: '🔴', color: '#CC092F', type: 'traditional',  popular: true  },
  { id: 'bb',        name: 'Banco do Brasil',  logo: '🟡', color: '#F9C700', type: 'traditional',  popular: true  },
  { id: 'inter',     name: 'Banco Inter',      logo: '🟠', color: '#FF7A00', type: 'digital',      popular: true  },
  { id: 'c6',        name: 'C6 Bank',          logo: '⬛', color: '#111111', type: 'digital',      popular: false },
  { id: 'xp',        name: 'XP Investimentos', logo: '⚡', color: '#1A1A2E', type: 'investment',   popular: false },
  { id: 'santander', name: 'Santander',        logo: '🔴', color: '#EC0000', type: 'traditional',  popular: false },
  { id: 'caixa',     name: 'Caixa Econômica',  logo: '🔵', color: '#005CA9', type: 'traditional',  popular: false },
  { id: 'picpay',    name: 'PicPay',           logo: '💚', color: '#11C76F', type: 'digital',      popular: false },
];

const BANK_IDS = SUPPORTED_BANKS.map((b) => b.id) as [string, ...string[]];

const ConnectSchema = z.object({
  bankId: z.enum(BANK_IDS, { message: 'bankId inválido' }),
});

type ProviderMode = 'mock' | 'pluggy' | 'belvo';

function resolveProvider(): ProviderMode {
  const raw = (process.env.OPEN_FINANCE_PROVIDER || 'mock').toLowerCase();
  if (raw === 'pluggy') {
    if (process.env.PLUGGY_CLIENT_ID && process.env.PLUGGY_CLIENT_SECRET) return 'pluggy';
    logError('open-finance/connect', new Error('PLUGGY_CLIENT_ID/SECRET ausentes — caindo para mock'));
    return 'mock';
  }
  if (raw === 'belvo') {
    if (process.env.BELVO_SECRET_ID && process.env.BELVO_SECRET_PASSWORD) return 'belvo';
    logError('open-finance/connect', new Error('BELVO_SECRET_ID/PASSWORD ausentes — caindo para mock'));
    return 'mock';
  }
  return 'mock';
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.response;
  return NextResponse.json({ banks: SUPPORTED_BANKS, provider: resolveProvider() });
}

export async function POST(req: Request) {
  const auth = await requireAuth();
  if (auth.error) return auth.response;

  const parsed = await parseJsonBody(req, ConnectSchema);
  if (!parsed.ok) return parsed.response;
  const { bankId } = parsed.data;
  const bank = SUPPORTED_BANKS.find((b) => b.id === bankId)!;

  const provider = resolveProvider();
  const isMock = provider === 'mock';

  try {
    // TODO(open-finance): integrar Pluggy/Belvo SDK quando credenciais estiverem configuradas.
    // Por enquanto retorna dado simulado com status honesto (`pending_mock`) para
    // o cliente exibir o badge "modo demo".
    const connection = {
      id: `conn_${bankId}_${Date.now()}`,
      userId: auth.user.id,
      provider,
      bankId,
      bankName: bank.name,
      bankLogo: bank.logo,
      bankColor: bank.color,
      status: isMock ? 'pending_mock' : 'pending',
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      mockNote: isMock
        ? 'Conexão simulada. Configure PLUGGY/BELVO no .env para conectar de verdade.'
        : undefined,
      accounts: [
        {
          id: `acc_${bankId}_1`,
          name: 'Conta corrente',
          type: 'checking' as const,
          balance: 4850 + Math.random() * 5000,
          currency: 'BRL',
        },
        ...(['nubank', 'c6', 'inter'].includes(bankId)
          ? [{
              id: `acc_${bankId}_2`,
              name: 'Conta poupança',
              type: 'savings' as const,
              balance: 12000 + Math.random() * 8000,
              currency: 'BRL',
            }]
          : []),
      ],
    };
    return NextResponse.json({ connection, success: true, isMock });
  } catch (err) {
    return jsonError('Falha na conexão com o banco', 500, err, 'POST /api/open-finance/connect');
  }
}
