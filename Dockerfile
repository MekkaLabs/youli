# ─────────────────────────────────────────────────────────────────────────────
# Youli API — imagem de produção (monorepo npm workspaces)
# Alvo: host com DISCO PERSISTENTE (Railway / Render / Fly.io).
# Monte um volume persistente em: /app/apps/api/src/repositories/.data
# (guarda users.json, db por-usuário, tokens Strava/Zepp/Google).
#
# Build context = RAIZ do repositório (precisa de packages/* e do package.json raiz).
# apps/mobile é excluído via .dockerignore (a API não depende dele).
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

# Copia o repo (o .dockerignore remove node_modules, .next, .data, apps/mobile…)
COPY . .

# Instala dependências do workspace (apps/api + packages/*).
# O postinstall da raiz remove node_modules/react-native (inofensivo aqui).
RUN npm install --no-audit --no-fund

# Build apenas da API.
RUN npm run build -w @youli/api

# A API lê a porta de process.env.PORT (injetada pelo host); fallback 3002.
EXPOSE 3002
WORKDIR /app/apps/api
CMD ["npm", "run", "start"]
