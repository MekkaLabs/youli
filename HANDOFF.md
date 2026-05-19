# 📋 YOULI — HANDOFF COMPLETO
> Atualizado em: 2026-05-18 | Inicie o próximo chat com: "Leia o HANDOFF.md e vamos continuar o desenvolvimento"

---

## 🧠 O QUE É O YOULI

**Youli** é um Personal Cognitive Operating System — app iOS + dashboard web que centraliza hábitos, metas, tarefas, finanças, fitness, calendário, foco e insights em um único fluxo, com 10 personas históricas como agentes IA (Leonardo da Vinci, Benjamin Franklin, etc.).

**Repositório:** `https://github.com/MekkaLabs/youli.git` (org: MekkaLabs)
**Workspace local:** `/Users/gustavovicente/Documents/Youli`
**AIOS_CORE_PATH:** `/Users/gustavovicente/Documents/aiox-core`
**SQUADS_PATH:** `/Users/gustavovicente/Downloads/squads`

---

## 🏗️ ARQUITETURA DO MONOREPO

```
Youli/
├── apps/
│   ├── mobile/          ← Expo 54 + React Native 0.81.5 + Expo Router 6
│   └── api/             ← Next.js 15.3.2 (App Router) + TypeScript
├── packages/
│   ├── shared/          ← Tipos TypeScript compartilhados
│   ├── orchestrator/    ← @youli/orchestrator
│   ├── memory/          ← @youli/memory
│   └── integrations/    ← @youli/integrations
├── docs/second-brain/   ← ADRs, ROADMAP, SPRINT, WEEKLY_REVIEW
├── HANDOFF.md           ← Este arquivo
└── TESTFLIGHT_DEPLOY.md ← Guia Expo Go + EAS + TestFlight
```

---

## 📱 MOBILE — STACK

| Item | Versão |
|------|--------|
| Expo | ~54.0.0 |
| React Native | 0.81.5 |
| Expo Router | ~6.0.23 |
| Reanimated | ~4.1.1 |
| react-native-svg | 15.12.1 |
| AsyncStorage | 2.2.0 |
| Expo Notifications | ~0.32.17 |
| Padrão componentes | Atomic Design (atoms/molecules/organisms/templates) |
| Estado global | Context + useReducer (sem Zustand/Redux) |
| i18n | Engine zero-dep própria (pt-BR, en, es, zh) |
| Tema | ThemeProvider (dark/light/system) |
| Acessibilidade | AccessibilityProvider (WCAG AA) |

### Telas (`apps/mobile/app/`)

| Arquivo | Rota | Descrição |
|---------|------|-----------|
| `index.tsx` | `/` | Redirect auth→dashboard ou login |
| `login.tsx` | `/login` | Login + cadastro (público) |
| `admin.tsx` | `/admin` | Painel admin (role=admin only) |
| `(tabs)/dashboard.tsx` | `/` | Leonardo — visão sistêmica |
| `(tabs)/habitos.tsx` | `/habitos` | Aristóteles — hábitos + streaks |
| `(tabs)/metas.tsx` | `/metas` | Alexandre — objetivos |
| `(tabs)/tarefas.tsx` | `/tarefas` | Franklin — tarefas |
| `(tabs)/financeiro.tsx` | `/financeiro` | Adam Smith — finanças |
| `(tabs)/fitness.tsx` | `/fitness` | Hipócrates — saúde |
| `(tabs)/calendario.tsx` | `/calendario` | Newton — agenda |
| `(tabs)/insights.tsx` | `/insights` | Sócrates — insights IA |
| `(tabs)/focus.tsx` | `/foco` | Tesla — timer Pomodoro/Deep Work/Custom |
| `(tabs)/perfil.tsx` | `/perfil` | Marco Aurélio — perfil + XP |
| `(tabs)/simular.tsx` | `/simular` | Simulador de vida |
| `life-score.tsx` | `/life-score` | Score SWE-CI com SVG arc animado |
| `evolution-history.tsx` | `/evolution-history` | Histórico por área |
| `sweci-settings.tsx` | `/sweci-settings` | Toggles flags SWE-CI |
| `integrations.tsx` | `/integrations` | Strava + Zepp + roadmap |
| `accessibility-settings.tsx` | `/accessibility-settings` | Config acessibilidade |
| `onboarding/index.tsx` | `/onboarding` | Onboarding v2 (language picker + steps) |
| `vision.tsx` | `/vision` | Vision board |

### Hooks principais (`apps/mobile/src/hooks/`)

```
useAuth.ts          ← login/logout/register + AuthProvider + useAuthContext
useSWECI.ts         ← life-health score, getAreaGap(), cache 5min, dedup
useI18n.ts          ← t(), setLanguage(), SUPPORTED_LANGUAGES
useHabits.ts        ← CRUD hábitos + stats (useMemo)
useGoals.ts         ← CRUD metas + stats (useMemo)
useTasks.ts         ← CRUD tarefas com filtros
useHealth.ts        ← fitness (Strava + Zepp aggregados via /api/fitness/summary)
useNotifications.ts ← push (dailyDigest 8h, weeklyCI dom 9h, gapAlert immediato)
useXP.ts            ← sistema XP e achievements
useCalendar.ts, useFinance.ts, useInsights.ts, ...
```

---

## 🖥️ API — STACK

| Item | Versão |
|------|--------|
| Next.js | 15.3.2 (App Router) |
| TypeScript | strict |
| Supabase | ^2.49.8 (ainda em mock/local) |
| Redis | ioredis ^5.6.1 |
| Banco local | JSON em `src/repositories/.data/` |
| Auth | Cookie `youli_session=userId:role` (30 dias) |

### Rotas principais da API (90+ no total)

**Auth:**
- `POST /api/auth/login` — público
- `POST /api/auth/register` — público (cria role=user)
- `POST /api/auth/logout`
- `GET  /api/auth/me`

**Admin (role=admin only):**
- `GET|POST /api/admin/users`
- `PATCH|DELETE /api/admin/users/:id`

**SWE-CI:**
- `GET|POST /api/copilot/life-health` — score agregado
- `GET|POST /api/copilot/evolution-history` — histórico (?area=all&days=30)
- `GET /api/copilot/runtime-config` + `PATCH` — flags SWE-CI
- `POST /api/copilot/weekly-pipeline`
- `POST /api/copilot/evaluate-all`

**Integrações:**
- `GET /api/integrations/status`
- `GET /api/fitness/summary`
- `GET|POST /api/integrations/strava/*` (auth/callback/sync)
- `GET|POST /api/integrations/zepp/*`

---

## 🔐 AUTENTICAÇÃO

### Fluxo
1. `users.json` → registry de usuários (id, name, email, password, role)
2. Login → Cookie `youli_session=userId:role` (30 dias)
3. Mobile → AsyncStorage `@youli:session` → `{user, token}`
4. `useAuthContext()` disponível em qualquer tela

### Credenciais de teste

| Usuário | Email | Senha | Role |
|---------|-------|-------|------|
| Gustavo (admin) | `gustav0.v1c3nt3@gmail.com` | `youli2024` | `admin` |
| Convidada | `amiga@youli.app` | `youli2024` | `user` |

> Criar/editar usuários: app → Perfil → 👑 Admin

### Arquivos de auth
```
apps/api/src/services/auth.ts                    ← validateCredentials, createUser, getAllUsers...
apps/api/src/repositories/.data/users.json       ← registry (NÃO commitar senhas reais)
apps/api/app/api/auth/login/route.ts
apps/api/app/api/auth/register/route.ts
apps/api/app/api/admin/users/route.ts
apps/api/app/api/admin/users/[userId]/route.ts
apps/mobile/src/hooks/useAuth.ts                 ← hook + AuthProvider + useAuthContext
apps/mobile/app/login.tsx                        ← tela login/cadastro
apps/mobile/app/admin.tsx                        ← painel admin CRUD usuários
```

---

## 🤖 SWE-CI — 10 AGENTES DE SCORING

Todos em `apps/api/src/services/agents/`. Todos flags habilitados por padrão em `runtime-config.ts`.

```
life-gap-analyzer.ts        ← detecta gaps nas 10 áreas de vida
anc-scorer.ts               ← Abstração-Necessidade-Coerência
maintainability-scorer.ts   ← sustentabilidade do ritmo de vida
parallel-evaluator.ts       ← avalia 10 áreas em Promise.all()
ci-weekly-pipeline.ts       ← pipeline CI semanal completo
life-evolution-tracker.ts   ← registra pontos de evolução
requirements-doc-generator  ← docs de requisitos para gaps
failure-attribution.ts      ← atribuição de falhas
goal-checkpoint.ts          ← checkpoint de objetivos
life-ci-loop.ts             ← loop de CI contínuo
```

---

## 📁 BANCO DE DADOS LOCAL

`apps/api/src/repositories/.data/`
```
db.json       ← dados do perfil Gusta (hábitos, metas, tarefas, etc.)
users.json    ← registry multi-usuário
```

Quando Supabase estiver ativo: `hasSupabase() → Supabase, else → db.json` (fallback automático).

**Schema Supabase criado:** `apps/api/supabase/migrations/001_youli_schema.sql`  
(profiles, habits, habit_logs, goals, tasks, evolution_points, memories pgvector 1536, focus_sessions)

---

## 🚀 COMO RODAR

```bash
# API
cd apps/api && npm run dev   # → http://localhost:3002

# Mobile (Expo Go — mais rápido, sem Apple Developer)
cd apps/mobile && npx expo start --tunnel
# Instalar Expo Go no iPhone → escanear QR code
# --tunnel funciona mesmo em redes diferentes
```

---

## 📦 VARIÁVEIS DE AMBIENTE

### `apps/api/.env.local`
```env
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3002
ANTHROPIC_API_KEY=sk-ant-...          ← OBRIGATÓRIO p/ copilot IA funcionar
NEXT_PUBLIC_SUPABASE_URL=             ← opcional por enquanto
NEXT_PUBLIC_SUPABASE_ANON_KEY=        ← opcional por enquanto
SUPABASE_SERVICE_ROLE_KEY=            ← opcional por enquanto
STRAVA_CLIENT_ID=YOUR_ID
STRAVA_CLIENT_SECRET=YOUR_SECRET
ZEPP_CLIENT_ID=YOUR_ID
ZEPP_CLIENT_SECRET=YOUR_SECRET
ORCHESTRATOR_NAME=Jarvis
YOULI_PROFILE_ID=user-gusta-001
```

### `apps/mobile` — via `eas.json`
```json
"development": { "EXPO_PUBLIC_API_URL": "http://localhost:3002" }
"preview":     { "EXPO_PUBLIC_API_URL": "https://youli-api-xxx.vercel.app" }
"production":  { "EXPO_PUBLIC_API_URL": "https://api.youli.app" }
```

---

## ✅ TODOS OS SPRINTS CONCLUÍDOS

| Sprint | O que foi feito |
|--------|----------------|
| F–H | SWE-CI core: Life CI Loop, Gap Analyzer, ANC, Maintainability, Parallel Evaluator, CI Weekly Pipeline, Goal Checkpoint, Failure Attribution |
| I–K | Telas mobile melhoradas + useSWECI centralizado + /life-score + /evolution-history + /sweci-settings + todos flags habilitados |
| L | Strava OAuth2 + Zepp OAuth2 + fitness-bridge + /api/integrations/status + /api/fitness/summary |
| M | i18n: engine zero-dep + 4 idiomas + 19 namespaces (pt-BR, en, es, zh) |
| N | Acessibilidade: AccessibilityProvider + WCAG AA + /accessibility-settings |
| O | UX: EmptyState + QuickStats + FAB + TodayFocusCard |
| P | Push Notifications: dailyDigest 8h + weeklyCI dom 9h + habitReminder + goalDeadlineAlert |
| Q | Onboarding v2: language picker como Step -1 |
| R | Focus Screen: timer Pomodoro/Deep Work/Custom + ring SVG Reanimated + Vibration |
| S | Performance: useMemo stats + React.memo cards + useSWECI deduplication inflight |
| T | Dark/Light Theme: ThemeProvider + darkPalette + lightPalette + toggleTheme |
| U | App Store Readiness: app.json completo + eas.json 3 perfis |
| V | TypeScript: 0 erros (npx tsc --noEmit) |
| W | Supabase Real: schema SQL + repositórios com fallback + /api/evolution/record |
| P1 | 15 itens UX: intention input focus, i18n simular, SVG arc animado life-score, timestamps reais habitos, EmptyState financeiro, CTA calendário, dedup metas, scores SWECI perfil, dist+HR fitness, greeting time-aware, dismissal insights AsyncStorage, badge filtros tarefas |
| Auth | Multi-usuário: users.json + auth.ts reescrito + /api/auth/register + /api/admin/users + login.tsx + useAuth.ts + admin.tsx + proteção de rotas |
| Assets | icon.png (1024×1024) + splash.png (1284×2778) + adaptive-icon.png + favicon.png gerados |

---

## 🔄 MUDANÇAS PENDENTES DE COMMIT

```bash
git add -A
git commit -m "Sprint Auth: multi-user + login screen + admin panel + assets + P1 UX"
git push origin main
```

**Novos arquivos (nunca commitados):**
- `apps/mobile/app/login.tsx`
- `apps/mobile/app/admin.tsx`
- `apps/mobile/app/index.tsx` (modificado)
- `apps/mobile/src/hooks/useAuth.ts`
- `apps/mobile/assets/` (icon.png, splash.png, etc.)
- `apps/mobile/eas.json`
- `apps/api/src/services/auth.ts` (reescrito)
- `apps/api/src/repositories/.data/users.json`
- `apps/api/app/api/admin/users/route.ts`
- `apps/api/app/api/admin/users/[userId]/route.ts`
- `apps/api/app/api/auth/register/route.ts`
- `apps/api/vercel.json`
- `HANDOFF.md`, `TESTFLIGHT_DEPLOY.md`

---

## 🎯 PRÓXIMAS PRIORIDADES

### Imediato (testar amanhã)
1. **Commitar** tudo pendente (comando acima)
2. **Rodar** `cd apps/api && npm run dev` + `cd apps/mobile && npx expo start --tunnel`
3. Sua amiga instala **Expo Go** → escaneia QR → acessa `amiga@youli.app / youli2024`

### Curto prazo
4. **Deploy Vercel** (API pública): [vercel.com](https://vercel.com) → Add Project → repo `MekkaLabs/youli` → root `apps/api` → adicionar `ANTHROPIC_API_KEY` nas env vars
5. Após Vercel: atualizar `eas.json` preview `EXPO_PUBLIC_API_URL` com a URL real
6. **Personalizar amiga**: painel admin → editar "Convidada" com nome/email real dela

### Médio prazo
7. **Supabase real**: [app.supabase.com](https://app.supabase.com) → new project → rodar migration SQL → preencher env vars
8. **Strava real**: [strava.com/settings/api](https://strava.com/settings/api) → preencher `STRAVA_CLIENT_ID/SECRET`
9. **ANTHROPIC_API_KEY** real: [console.anthropic.com](https://console.anthropic.com)
10. **EAS Build** (app independente, sem Expo Go): `npx eas-cli init` + `npx eas-cli build --profile preview --platform ios` (requer Apple Developer US$99/ano)

---

## ⚠️ PONTOS DE ATENÇÃO

1. `ANTHROPIC_API_KEY=mock` → copilot retorna mock até ter chave real
2. `app.json` tem EAS projectId placeholder → rodar `npx eas-cli init` para gerar real
3. Supabase não está ativo → dados ficam em `db.json` local (reiniciam no redeploy)
4. Strava/Zepp OAuth precisam de URL pública no callback → só funciona após Vercel
5. `foco.tsx` foi renomeado para `focus.tsx` → arquivo antigo pode existir, deletar se necessário

---

## 🛠️ COMANDOS ÚTEIS

```bash
# TypeScript check
cd apps/mobile && npx tsc --noEmit
cd apps/api && npx tsc --noEmit

# Rodar tudo (monorepo root)
npm run dev

# Reset banco local (apaga dados, recria defaults)
rm apps/api/src/repositories/.data/db.json

# Ver usuários cadastrados
cat apps/api/src/repositories/.data/users.json

# Commit tudo
git add -A && git commit -m "feat: [descrição]" && git push origin main
```

---

## 📐 PADRÕES DE CÓDIGO

- **Componentes:** Atomic Design — atoms → molecules → organisms → templates → screens
- **Estilos:** `StyleSheet.create()` inline, nunca hex hardcoded fora dos estilos
- **Cores:** paleta em `tokens.ts` e `themeColors.ts`
- **Hooks:** `useCallback` em handlers, `useMemo` em cálculos pesados
- **API routes:** sempre `NextResponse.json()`, verificar auth com `getCurrentUserFromCookie()`
- **TypeScript:** strict, `as any` só para tipos de rotas do Expo Router

---

*Para continuar: abra novo chat no Cowork, selecione a pasta Youli, e diga "Leia o HANDOFF.md e vamos continuar o desenvolvimento".*
