/**
 * POST /api/open-finance/connect — conecta banco via Open Banking Brasil (Pluggy/Belvo)
 * GET  /api/open-finance/connect — lista bancos disponíveis
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORTED_BANKS = [
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

export async function GET() {
  return NextResponse.json({ banks: SUPPORTED_BANKS });
}

export async function POST(req: Request) {
  try {
    const { bankId } = await req.json();
    const bank = SUPPORTED_BANKS.find(b => b.id === bankId);
    if (!bank) return NextResponse.json({ error: 'Banco não suportado' }, { status: 400 });

    // TODO: integrar Pluggy SDK — por ora retorna mock de conexão bem-sucedida
    const connection = {
      id: `conn_${bankId}_${Date.now()}`,
      bankId,
      bankName: bank.name,
      bankLogo: bank.logo,
      bankColor: bank.color,
      status: 'connected',
      connectedAt: new Date().toISOString(),
      lastSync: new Date().toISOString(),
      accounts: [
        { id: `acc_${bankId}_1`, name: 'Conta corrente', type: 'checking', balance: 4850 + Math.random() * 5000, currency: 'BRL' },
        ...(['nubank','c6','inter'].includes(bankId) ? [
          { id: `acc_${bankId}_2`, name: 'Conta poupança', type: 'savings', balance: 12000 + Math.random() * 8000, currency: 'BRL' },
        ] : []),
      ],
    };
    return NextResponse.json({ connection, success: true });
  } catch {
    return NextResponse.json({ error: 'Falha na conexão' }, { status: 500 });
  }
}
