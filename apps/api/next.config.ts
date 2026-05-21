import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  // Habilita type-checking nas rotas (next/link, useRouter etc.)
  typedRoutes: true,
  // Monorepo: raiz para o file tracing (silencia warning e corrige deploy).
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  // Garante que pacotes do monorepo sejam tratados como transpiled.
  transpilePackages: [
    '@youli/shared',
    '@youli/orchestrator',
    '@youli/memory',
    '@youli/integrations',
  ],
  // Compilador: remove console.* exceto error/warn em produção.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production'
      ? { exclude: ['error', 'warn'] }
      : false,
  },
};

export default nextConfig;
