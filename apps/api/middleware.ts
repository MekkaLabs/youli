import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware de auth.
 *
 * IMPORTANTE: o middleware roda no Edge runtime, então NÃO podemos
 * importar serviços que usem `fs` (como `getCurrentUserFromCookie`).
 * Aqui fazemos apenas a checagem de FORMATO do token. A validação
 * de existência real do usuário é responsabilidade de cada rota
 * via `requireAuth()` em `src/lib/http.ts`.
 *
 * Política:
 *  - Rotas públicas: /login, /api/auth/*, callbacks de OAuth, _next, favicon
 *  - Tudo o mais exige cookie de sessão com formato válido
 *  - Diferenciação API vs página: API devolve 401 JSON, página redireciona p/ /login
 *  - Removido o bypass de /api/system/seed (era brecha de segurança)
 */

const COOKIE_NAME = 'youli_session';

const PUBLIC_PREFIXES = [
  '/login',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/logout',
  '/api/auth/me',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/robots.txt',
];

// Webhooks / callbacks OAuth precisam continuar abertos —
// segurança vem do `state` e da assinatura do provider, não do cookie.
const PUBLIC_WEBHOOK_PREFIXES = [
  '/api/integrations/strava/callback',
  '/api/integrations/zepp/callback',
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  if (PUBLIC_WEBHOOK_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return true;
  return false;
}

function isValidTokenFormat(token: string | undefined): boolean {
  if (!token) return false;
  // Formato esperado pelo auth.ts: `<userId>:<...>`
  const [userId] = token.split(':');
  return Boolean(userId && userId.length > 0);
}

function unauthorizedApi() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

function redirectToLogin(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  if (req.nextUrl.pathname && req.nextUrl.pathname !== '/') {
    url.searchParams.set('next', req.nextUrl.pathname);
  }
  return NextResponse.redirect(url);
}

// ---- CORS dinâmico ----

function parseAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOWED_ORIGINS || '';
  const explicit = raw.split(',').map((s) => s.trim()).filter(Boolean);
  if (explicit.length > 0) return explicit;
  // Dev fallback — sem isso o mobile/web local não consegue chamar a API.
  if (process.env.NODE_ENV !== 'production') {
    return [
      'http://localhost:3000',
      'http://localhost:3002',
      'http://localhost:8081',
      'http://localhost:19006',
    ];
  }
  return [];
}

function applyCors(req: NextRequest, res: NextResponse): NextResponse {
  const origin = req.headers.get('origin');
  if (origin && parseAllowedOrigins().includes(origin)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Vary', 'Origin');
  }
  return res;
}

/** Extrai o token da request: cookie OU Authorization: Bearer. */
function extractToken(req: NextRequest): string | undefined {
  const cookieToken = req.cookies.get(COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;
  const authz = req.headers.get('authorization');
  if (authz && /^bearer\s+/i.test(authz)) {
    const t = authz.replace(/^bearer\s+/i, '').trim();
    if (t) return t;
  }
  return undefined;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Preflight CORS.
  if (req.method === 'OPTIONS' && pathname.startsWith('/api/')) {
    return applyCors(req, new NextResponse(null, { status: 204 }));
  }

  if (isPublic(pathname)) {
    return applyCors(req, NextResponse.next());
  }

  const token = extractToken(req);
  const isApi = pathname.startsWith('/api/');

  if (!isValidTokenFormat(token)) {
    return applyCors(req, isApi ? unauthorizedApi() : redirectToLogin(req));
  }

  return applyCors(req, NextResponse.next());
}

export const config = {
  matcher: [
    // Tudo, exceto assets estáticos comuns.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|css|js|woff|woff2|ttf|eot)$).*)',
  ],
};
