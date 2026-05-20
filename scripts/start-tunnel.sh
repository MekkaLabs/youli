#!/usr/bin/env bash
# start-tunnel.sh — Sobe Youli inteiro via TUNNEL (funciona em qualquer rede/4G).
#
# O que faz:
#   1. Mata processos antigos (next, expo, metro, cloudflared)
#   2. Garante symlinks/hoisting que o Expo precisa
#   3. Sobe a API (Next.js :3002) em background
#   4. Sobe um túnel cloudflared para a API → URL pública https
#   5. Sobe o Expo em --tunnel (FOREGROUND) com a API apontada pro túnel
#   6. O QR nativo do Expo aparece NESTE terminal — escaneie com a Câmera do iPhone
#
# Uso:
#   ./scripts/start-tunnel.sh
#
# Parar: Ctrl+C (encerra o Expo; os background são limpos no próximo run)

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
API_PORT="${API_PORT:-3002}"
cd "$ROOT"

API_LOG="/tmp/youli-api.log"
CF_LOG="/tmp/youli-cloudflared.log"

cleanup_old() {
  echo "🛑 Encerrando processos antigos..."
  pkill -9 -f "next dev"           2>/dev/null || true
  pkill -9 -f "next-server"        2>/dev/null || true
  pkill -9 -f "expo start"         2>/dev/null || true
  pkill -9 -f "metro"              2>/dev/null || true
  pkill -9 -f "cloudflared tunnel" 2>/dev/null || true
  sleep 2
}

ensure_hoist() {
  echo "🔗 Garantindo dependências (symlink expo-router + limpeza)..."
  # expo-router precisa ser resolvível a partir da raiz (babel-preset-expo)
  if [ ! -e "$ROOT/node_modules/expo-router" ]; then
    ln -s ../apps/mobile/node_modules/expo-router "$ROOT/node_modules/expo-router" 2>/dev/null || true
  fi
  # remove react-native duplicado da raiz (conflito de versão no monorepo)
  node -e "try{require('fs').rmSync('$ROOT/node_modules/react-native',{recursive:true,force:true})}catch(e){}"
  # limpa caches de bundler pra evitar lixo de runs antigos
  rm -rf "$ROOT/apps/mobile/.expo" "$ROOT/apps/mobile/node_modules/.cache" "$ROOT/node_modules/.cache" 2>/dev/null || true
}

start_api() {
  echo "🚀 Subindo API (Next.js) na porta $API_PORT..."
  ( cd "$ROOT/apps/api" && PORT="$API_PORT" npm run dev > "$API_LOG" 2>&1 ) &
  echo "   API PID: $!  (log: $API_LOG)"
  # Espera a API responder (compila on-demand na 1ª vez)
  echo -n "   aguardando API"
  for i in $(seq 1 60); do
    code=$(curl -sS -o /dev/null -w "%{http_code}" "http://localhost:$API_PORT/api/auth/me" --max-time 3 2>/dev/null || echo 000)
    if [ "$code" = "401" ] || [ "$code" = "200" ]; then echo " ✅"; return 0; fi
    echo -n "."; sleep 2
  done
  echo " ⚠️ API demorou — seguindo mesmo assim"
}

start_cf() {
  echo "☁️  Subindo túnel da API (cloudflared)..."
  : > "$CF_LOG"
  ( cloudflared tunnel --url "http://localhost:$API_PORT" --no-autoupdate > "$CF_LOG" 2>&1 ) &
  echo "   cloudflared PID: $!  (log: $CF_LOG)"
  echo -n "   aguardando URL pública"
  API_TUNNEL=""
  for i in $(seq 1 40); do
    API_TUNNEL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$CF_LOG" 2>/dev/null | head -1)
    if [ -n "$API_TUNNEL" ]; then echo " ✅"; break; fi
    echo -n "."; sleep 2
  done
  if [ -z "$API_TUNNEL" ]; then
    echo " ❌ cloudflared não gerou URL. Veja $CF_LOG"
    exit 1
  fi
  echo "   API pública: $API_TUNNEL"
  export EXPO_PUBLIC_API_URL="$API_TUNNEL"
}

start_expo() {
  echo ""
  echo "═══════════════════════════════════════════════════════════════"
  echo "📱 Subindo Expo em modo TUNNEL."
  echo "   API do app:  $EXPO_PUBLIC_API_URL"
  echo "   O QR vai aparecer abaixo — escaneie com a CÂMERA do iPhone."
  echo "   Login: gustav0.v1c3nt3@gmail.com / youli2024"
  echo "═══════════════════════════════════════════════════════════════"
  echo ""
  cd "$ROOT/apps/mobile"
  # Foreground: o QR nativo do Expo aparece neste terminal e funciona.
  EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" EXPO_NO_TELEMETRY=1 \
    exec npx expo start --tunnel --port 8081 --clear
}

trap cleanup_old EXIT
cleanup_old
ensure_hoist
start_api
start_cf
start_expo
