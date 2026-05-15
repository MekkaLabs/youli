import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    typedRoutes: true,
    // instrumentationHook removido — disponível por padrão no Next.js 15+
  },
};

export default nextConfig;
