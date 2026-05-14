#!/bin/bash
# ======================================================
# YOULI — Setup Git Remote + Push para GitHub
# Execute: bash ~/Documents/Youli/scripts/git-push.sh
# ======================================================

cd ~/Documents/Youli

echo "🔍 Verificando git..."
git log --oneline -3

echo ""
echo "📡 Configurando remote..."
echo "Qual é o nome do seu repositório no GitHub?"
echo "  (Ex: para github.com/seuUser/youli → digite: seuUser/youli)"
read -p "→ " REPO_PATH

git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/${REPO_PATH}.git"

echo ""
echo "🚀 Fazendo push para GitHub..."
git push -u origin main

echo ""
echo "✅ Pronto! Acesse: https://github.com/${REPO_PATH}"
