#!/usr/bin/env bash
# start-dev.sh — sobe API + Mobile (Expo) com EXPO_PUBLIC_API_URL configurado
# automaticamente para o IP LAN da sua máquina (necessário para Expo Go em
# celular físico, já que `localhost` no celular não enxerga seu Mac).
#
# Uso:
#   ./scripts/start-dev.sh                # API + Mobile
#   ./scripts/start-dev.sh api            # só API
#   ./scripts/start-dev.sh mobile         # só Mobile
#   API_PORT=3030 ./scripts/start-dev.sh  # porta da API custom

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TARGET="${1:-all}"
API_PORT="${API_PORT:-3002}"
EXPO_PORT="${EXPO_PORT:-8081}"

cd "$ROOT"

# ── 0. Sanity checks ──────────────────────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo "📦 node_modules ausente — rodando npm install (~2-3min)..."
  npm install --no-audit --no-fund
fi

# Detecta IP LAN (macOS/Linux). Cai pra localhost se nada funcionar.
detect_lan_ip() {
  local ip
  # macOS — interface Wi-Fi típica
  ip="$(ipconfig getifaddr en0 2>/dev/null || true)"
  if [ -z "$ip" ]; then ip="$(ipconfig getifaddr en1 2>/dev/null || true)"; fi
  # Linux fallback
  if [ -z "$ip" ]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  # Último recurso: pega primeiro IP não-loopback do ifconfig
  if [ -z "$ip" ]; then
    ip="$(ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -v '^127' | head -1 || true)"
  fi
  echo "${ip:-127.0.0.1}"
}

LAN_IP="$(detect_lan_ip)"
API_URL="http://${LAN_IP}:${API_PORT}"

# ── 1. Mata processos antigos ─────────────────────────────────────────
echo "🛑 Encerrando servidores antigos..."
pkill -f "next dev"     2>/dev/null || true
pkill -f "next-server"  2>/dev/null || true
pkill -f "expo start"   2>/dev/null || true
pkill -f "metro"        2>/dev/null || true
sleep 1

# ── 2. Sobe API ───────────────────────────────────────────────────────
if [[ "$TARGET" == "all" || "$TARGET" == "api" ]]; then
  echo ""
  echo "🚀 Iniciando API (Next.js) em http://localhost:${API_PORT}"
  echo "   LAN:   ${API_URL}    (use este URL no celular)"
  (cd "$ROOT/apps/api" && PORT="$API_PORT" npm run dev) &
  API_PID=$!
  echo "   PID: $API_PID"
fi

# ── 3. Sobe Mobile (Expo) com EXPO_PUBLIC_API_URL apontando pra LAN ──
if [[ "$TARGET" == "all" || "$TARGET" == "mobile" ]]; then
  echo ""
  echo "📱 Iniciando Mobile (Expo) com EXPO_PUBLIC_API_URL=${API_URL}"
  (
    cd "$ROOT/apps/mobile"
    EXPO_PUBLIC_API_URL="$API_URL" \
    npx expo start --port "$EXPO_PORT" --clear
  ) &
  MOBILE_PID=$!
  echo "   PID: $MOBILE_PID"
fi

# ── 4. Resumo ─────────────────────────────────────────────────────────
sleep 2
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ Pronto."
echo ""
[[ "$TARGET" == "all" || "$TARGET" == "api" ]] && {
  echo "   🌐 API local:   http://localhost:${API_PORT}"
  echo "   🌐 API LAN:     ${API_URL}"
}
[[ "$TARGET" == "all" || "$TARGET" == "mobile" ]] && {
  echo ""
  echo "   📱 Expo Dev Tools: http://localhost:${EXPO_PORT}"
  echo "   📱 Para celular físico (Expo Go):"
  echo "      - O Mac e o celular precisam estar na MESMA rede Wi-Fi"
  echo "      - Aguarde aparecer o QR code no terminal"
  echo "      - iPhone: abra a Câmera → aponta pro QR → toca na notificação"
  echo "      - Android: abre o app Expo Go → 'Scan QR code'"
  echo ""
  echo "   🧪 No simulador iOS:    pressione 'i' no terminal do Expo"
  echo "   🧪 No emulador Android: pressione 'a' no terminal do Expo"
  echo "   🌐 No browser (limitado): pressione 'w'"
}
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Para parar tudo: pressione Ctrl+C ou rode 'pkill -f \"next dev\"; pkill -f \"expo start\"'"
echo ""

# Mantém o script vivo até Ctrl+C
wait
