#!/bin/bash
# Script de restart do Youli Dev Server
# Execute: bash ~/Documents/Youli/restart-dev.sh

echo "🔄 Parando servidores Youli..."

# Remove git locks se existirem
rm -f ~/Documents/Youli/.git/HEAD.lock ~/Documents/Youli/.git/index.lock 2>/dev/null

# Para processos Next.js do Youli
pkill -f "next-server" 2>/dev/null
pkill -f "next dev" 2>/dev/null
sleep 1

echo "📦 Iniciando API (Next.js)..."
cd ~/Documents/Youli/apps/api && npm run dev &
API_PID=$!
echo "API PID: $API_PID"

echo "📱 Iniciando Mobile (Expo)..."
cd ~/Documents/Youli/apps/mobile && npx expo start &
MOBILE_PID=$!
echo "Mobile PID: $MOBILE_PID"

echo ""
echo "✅ Servidores iniciados!"
echo "   API:    http://localhost:3000"
echo "   Expo:   http://localhost:8081"
echo ""
echo "Para parar: kill $API_PID $MOBILE_PID"

wait
