#!/usr/bin/env bash
# Script de restart do Youli Dev Server.
# Funciona em qualquer máquina — resolve a raiz do projeto a partir do
# diretório onde o script vive (não depende mais de `~/Documents/Youli`).
#
# Uso:
#   ./restart-dev.sh           # API + Mobile
#   ./restart-dev.sh api       # só API
#   ./restart-dev.sh mobile    # só Mobile

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR"
TARGET="${1:-all}"

API_PORT="${API_PORT:-3002}"
EXPO_PORT="${EXPO_PORT:-8081}"

echo "🔄 Parando servidores Youli..."

# Remove eventuais git locks (sem falhar se não existirem)
rm -f "$ROOT/.git/HEAD.lock" "$ROOT/.git/index.lock" 2>/dev/null || true

# Mata processos antigos
pkill -f "next-server" 2>/dev/null || true
pkill -f "next dev"    2>/dev/null || true
pkill -f "expo start"  2>/dev/null || true
sleep 1

API_PID=""
MOBILE_PID=""

if [[ "$TARGET" == "all" || "$TARGET" == "api" ]]; then
  echo "📦 Iniciando API (Next.js) na porta $API_PORT..."
  (cd "$ROOT/apps/api" && npm run dev) &
  API_PID=$!
  echo "   API PID: $API_PID"
fi

if [[ "$TARGET" == "all" || "$TARGET" == "mobile" ]]; then
  echo "📱 Iniciando Mobile (Expo)..."
  (cd "$ROOT/apps/mobile" && npx expo start) &
  MOBILE_PID=$!
  echo "   Mobile PID: $MOBILE_PID"
fi

echo ""
echo "✅ Servidores iniciados!"
[[ -n "$API_PID"    ]] && echo "   API:    http://localhost:$API_PORT"
[[ -n "$MOBILE_PID" ]] && echo "   Expo:   http://localhost:$EXPO_PORT"
echo ""
echo "Para parar: kill ${API_PID:-} ${MOBILE_PID:-}"

wait
