#!/bin/bash
# ─── YOULI: Instalar dependências mobile (rode no seu Mac) ───────────────────
set -e
echo "📦 Instalando dependências mobile do Youli..."

cd "$(dirname "$0")/../apps/mobile"

# Animações e gestos
npx expo install react-native-reanimated react-native-gesture-handler

# Safe area
npx expo install react-native-safe-area-context

# Design System — Tamagui (opcional, para o futuro)
# npm install @tamagui/core @tamagui/config tamagui @tamagui/animations-react-native @tamagui/font-inter

echo ""
echo "✅ Dependências instaladas!"
echo ""
echo "⚠️  Ação necessária:"
echo "   1. Abra .env.local e substitua 'sua_chave_aqui' pela sua ANTHROPIC_API_KEY"
echo "   2. Execute: npm run dev"
echo ""
echo "📱 Para rodar o mobile:"
echo "   cd apps/mobile && npx expo start"
