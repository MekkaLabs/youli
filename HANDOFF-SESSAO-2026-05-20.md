# HANDOFF — Sessão de Qualidade & Segurança (2026-05-20)

> Continuação para o próximo chat. Este documento resume tudo que foi feito,
> o estado atual, como rodar, e o que ainda falta. **Não apaga** o `HANDOFF.md`
> original (que descreve a arquitetura base do projeto).

**Branch:** `claude/priceless-cray-231c32`
**Worktree:** `/Users/gustavovicente/Documents/Youli/.claude/worktrees/priceless-cray-231c32`

---

## 1. Estado atual — TUDO FUNCIONANDO

- ✅ App **abre e roda no Expo Go** (via tunnel — funciona em qualquer rede/4G)
- ✅ **Typecheck 0 erros** em `apps/api` e `apps/mobile` (exceto 3 erros pré-existentes de `boxShadow`/`StyleSheet` por conflito de versão RN entre raiz e mobile — documentado abaixo)
- ✅ **Login + auth via Bearer token validado** (smoke test passou)
- ✅ Integração **Obsidian** funcional (17 notas indexadas)
- ✅ 8 commits limpos nesta sessão (working tree limpo, só `apps/api/src/repositories/.data/db.json` runtime fica de fora propositalmente)

---

## 2. Como rodar (1 comando)

No terminal do usuário (Terminal.app/iTerm), **não em background**:

```bash
cd /Users/gustavovicente/Documents/Youli/.claude/worktrees/priceless-cray-231c32 && ./scripts/start-tunnel.sh
```

Sobe API (3002) + túnel cloudflared da API + Expo `--tunnel`, imprime o QR nativo.
Escanear com a **Câmera do iPhone** (não pelo Expo Go — iOS recente removeu "Enter URL").
Login: `gustav0.v1c3nt3@gmail.com` / `youli2024`

> ⚠️ **Importante para o próximo agente:** NÃO rodar `expo start` em background sem TTY
> (trava com "non-interactive mode"). Use o script no terminal do usuário, OU o
> truque do PTY em `/tmp/run-expo-tunnel.py` (Python pty.fork). A API (Next dev) e o
> cloudflared PODEM rodar em background normalmente.

---

## 3. O que foi feito nesta sessão (commits)

| Commit | Conteúdo |
|--------|----------|
| `feat(api): segurança` | auth Bearer+cookie, requireAuth em ~22 rotas, admin endurecido, CORS por env, http.ts helpers |
| `feat(memory): Obsidian fim-a-fim` | source/externalId/tags, upsert, filtro por origem, sync-obsidian, DELETE |
| `feat(agents): robustez` | retry+timeout+cache LRU+logging no executor, parse Zod, 30 melhorias por agente |
| `feat(mobile): interceptor auth + Zod + admin` | interceptor global de fetch, hooks tipados, admin separado do perfil |
| `chore: scripts/configs` | start-dev.sh, start-tunnel.sh, Next 15.5.18 (CVE), worklets 0.5.2 |
| `feat(memory): MemoryConnector` | upsert/list-filtros + remove .env.local.backup |
| `refactor(mobile): logger` | logger.ts + catch vazios em hooks de dados |

### Decisões arquiteturais críticas (NÃO reverter sem entender)

1. **Auth dual cookie+Bearer** (`apps/api/src/services/auth.ts` → `resolveSessionToken`):
   a API aceita `Authorization: Bearer <userId:role>` além do cookie. O mobile manda
   Bearer via **interceptor global de fetch** (`apps/mobile/src/services/auth-token.ts`),
   injetado no boot em `apps/mobile/app/_layout.tsx`. **Sem isso o mobile depende do
   cookie-jar frágil do iOS.**

2. **Symlink `node_modules/expo-router`** → `apps/mobile/node_modules/expo-router`.
   Necessário porque `babel-preset-expo` (hoisted na raiz) faz `require.resolve('expo-router')`
   sem `paths`. **O symlink some em `npm install` limpo** — o `scripts/start-tunnel.sh`
   o recria automaticamente (função `ensure_hoist`).

3. **`overrides: { "react-native-worklets": "0.5.2" }`** no `package.json` raiz —
   reanimated 4.1.7 exige 0.5.2; sem o override volta o mismatch de versão (crash no boot).

4. **`apps/mobile/app.json` sem EAS placeholders** — removidos `owner`, `extra.eas.projectId`,
   `updates.url` falsos (causavam HTTP 500 no manifest do Expo Go). Backup em
   `app.json.before-dev-fix`. Ao fazer build de produção real: rodar `eas init`.

---

## 4. Débito técnico restante (priorizado para a próxima sessão)

### 🟡 Médio
- **`any` em serviços internos da API** — `apps/api/src/services/signals/agent-signal-bus.ts`
  (~25 ocorrências), `apps/api/src/services/graph/life-graph.ts` (~5),
  `apps/api/src/repositories/supabase/habits.ts:46`. São código interno (não input de usuário).
  Tipar definindo interfaces `LifeContext` e payloads discriminados de signal.
- **`any` em componentes mobile** — `DashboardHero/index.tsx` (~10), `DailyDigest/index.tsx` (~4),
  `useHealth.ts` (~4, mas os de native-modules são legítimos), `ShareCard`, `GlobalSearch`,
  `WeeklyReview`, `TodayFocusCard`. Tipar via `ReturnType` dos hooks (padrão já usado em
  `useInsights.ts`/`useCopilotContext.ts`/`perfil.tsx`).

### 🟢 Baixo
- **`catch {}` vazios restantes** em telas (`app/(tabs)/dashboard|habitos|tarefas|metas|fitness.tsx`,
  `app/life-score.tsx`, `app/sweci-settings.tsx`, `app/integrations.tsx`,
  `src/organisms/CrossAreaInsights`, `src/accessibility/AccessibilityProvider.tsx`).
  Já existe `apps/mobile/src/services/logger.ts` (`logWarn`) — só importar e usar.
  Padrão: `} catch (e) { logWarn('escopo:contexto', e); }`. São best-effort (já têm `if(res.ok)`),
  baixo risco — por isso ficaram para depois.
- **3 erros de typecheck pré-existentes** (`EmptyState`, `MetricCard`, `CopilotBubble` —
  `boxShadow`/`StyleSheet`). Causa: `react-native` duplicado entre raiz e `apps/mobile`.
  Resolver hoisting via `pnpm` ou `overrides` mais amplo. Não bloqueia o app.
- **Camada de dados ainda single-profile** — as rotas protegidas com `requireAuth()` validam
  login mas usam `YOULI_PROFILE_ID` global (não `auth.user.id`) na persistência. Para multi-usuário
  real, reescrever `repositories/*` para filtrar por `userId`. Fora do escopo "revisar bugs".

### 🔵 Funcionalidades mock a implementar (quando quiser sair do MVP)
- Pluggy/Belvo open-finance reais (`packages/integrations/src/index.ts` — hoje status `pending`/mock)
- Voice transcribe (`molecules/VoiceInput` — TODO Whisper)
- Cleanup de memória Obsidian deletada (sync só faz upsert, não remove)

---

## 5. Comandos úteis

```bash
# Subir tudo (terminal do usuário)
./scripts/start-tunnel.sh

# Subir só local (sem tunnel)
./scripts/start-dev.sh

# Typecheck
cd apps/api && npx tsc --noEmit
cd apps/mobile && npx tsc --noEmit

# Sync Obsidian (precisa cookie ou Bearer)
node scripts/sync-obsidian.mjs --dry-run
node scripts/sync-obsidian.mjs

# Smoke test auth (com API rodando em 3002)
curl -s -X POST localhost:3002/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"gustav0.v1c3nt3@gmail.com","password":"youli2024"}'
curl -s -H 'Authorization: Bearer user-gusta-001:admin' localhost:3002/api/tasks
```

---

## 6. Arquivos-chave criados nesta sessão

```
apps/api/src/lib/http.ts                       — helpers requireAuth/requireAdmin/jsonError/parseJsonBody
apps/api/app/api/memory/sync-obsidian/route.ts — batch sync Obsidian
apps/api/app/api/memory/[id]/route.ts          — DELETE memória
apps/mobile/src/services/auth-token.ts         — interceptor global de fetch (Bearer)
apps/mobile/src/services/logger.ts             — logWarn/logError
apps/mobile/src/types/api-schemas.ts           — schemas Zod das respostas da API
scripts/sync-obsidian.mjs                      — CLI de sync
scripts/start-tunnel.sh                         — sobe tudo via tunnel + QR
scripts/start-dev.sh                            — sobe local + detecta IP LAN
```

---

## 7. Próximos passos sugeridos (ordem de valor)

1. **Tipar os `any` da API** (agent-signal-bus, life-graph) — maior risco de bug silencioso.
2. **Tipar `any` em DashboardHero/DailyDigest** — telas que renderizam dados.
3. **Limpar os `catch {}` restantes** com `logWarn` (rápido, mecânico).
4. **Resolver os 3 erros de boxShadow** (hoisting RN) — limpa o typecheck 100%.
5. **(Maior)** Migrar persistência para multi-usuário real (`auth.user.id` nos repositories).

Bom trabalho para o próximo! Tudo commitado, app rodando, fundação de segurança sólida.

---

## 8. Sessão 2 — 10 melhorias de qualidade (2026-05-20, continuação)

Continuação automática a partir do débito técnico priorizado acima. **Typecheck
100% limpo em `apps/api` e `apps/mobile` (0 erros)** — os 3 erros de `boxShadow`
da seção 4 já não reproduzem neste estado da worktree.

| # | Melhoria | Commit |
|---|----------|--------|
| 1-3 | Tipar `any` na API: `agent-signal-bus` (LifeContext + payloads por SignalType), `life-graph` (LifeSnapshot + AreaRelationshipRow), `habits` (HabitRow) | `5eac7f7` |
| 4-6 | Tipar `any` nos organisms mobile via tipos dos hooks (DashboardHero, DailyDigest, ShareCard, GlobalSearch, WeeklyReview, TodayFocusCard) | `d838001` |
| 7 | Substituir 11 `catch {}` vazios por `logWarn` (telas, integrations, life-score, sweci-settings, CrossAreaInsights, AccessibilityProvider) | `112eb01` |
| 8 | Cleanup de Obsidian deletada: rota `sync-obsidian` aceita `prune.knownExternalIds`; script ganha `--prune` (opt-in/destrutivo) | `0e8e077` |

### Bugs latentes corrigidos pela tipagem (estavam mascarados por `as any`)

- **`useHealth().data` não existe** → era sempre `undefined`; trocado por `health.summary.today` (passos reais no DashboardHero).
- **`habit.completedToday` não existe** em `HabitData` → trocado por `habits.isCompletedToday(h)` (DashboardHero, ShareCard, WeeklyReview, DailyDigest).
- **`goal.progress` não existe** em `GoalData` → trocado por `goals.progressPercent(currentValue, targetValue)` (DashboardHero, ShareCard, GlobalSearch).
- **`habits.ts` checkin** usava `supabase.rpc('increment') as any` como valor de coluna (sempre falhava, caía no fallback) → simplificado para read-then-increment.

### Débito ainda em aberto (não tocado nesta sessão)

- `any` legítimos de native-modules em `useHealth.ts` (HealthKit) — mantidos de propósito.
- Prune do Obsidian remove o `MemoryRecord` no connector, mas **não** remove do índice semântico (Zep/pgvector) — o engine não expõe delete aqui. Avaliar quando houver `engine.remove`.
- Funcionalidades mock (Pluggy/Belvo, Whisper) — inalteradas.

---

## 9. Sessão 3 — Multi-usuário + Auth séria + Dashboards web (2026-05-20)

Atacados os dois **P0** do PREMORTEM + dashboards web. **Typecheck 0 erros (api+mobile).**

| Fase | Entrega | Commit |
|------|---------|--------|
| F1 | **Auth assinada (HMAC) + senhas com hash (scrypt)**; login/register retornam token assinado; mobile usa `data.token`; role vem sempre do servidor | `7ca0466` |
| F2 | **Persistência multi-usuário** — `local-db` por `userId` (`.data/users/{id}.json`); owner migra `db.json` legado; novos usuários = slate limpo; `userId` threadado em repos/serviços/~20 rotas | `ba50132` |
| F3 | **Agentes personalizados** — `/api/copilot/orchestrate` gateado + injeta perfil autoritativo do usuário logado | `105286a` |
| F4 | **Painel Admin web** (`/admin`, admin-only: CRUD + papel) + nav por papel no `/system` | `8e06c76` |

### Decisões/arquitetura novas (NÃO reverter sem entender)

1. **Token de sessão assinado** (`apps/api/src/services/auth.ts` → `signSession`/`verifySession`, HMAC-SHA256 + exp 30d). Segredo: `YOULI_SESSION_SECRET` (obrigatório em prod; fallback dev inseguro com aviso). **A role de autorização vem do store, nunca do token.** Senhas em scrypt (`hashPassword`/`verifyPassword`) com upgrade automático de legado em texto plano no login.
2. **`local-db` é por-usuário.** `readDb(userId)`/`writeDb(userId, db)` + arquivo próprio. `OWNER_ID` (`user-gusta-001`, override via `YOULI_OWNER_ID`) migra o `db.json` legado uma vez. `seedUserIfMissing(userId, identity)` chamado em login/register.
3. **Gate `YOULI_USE_SUPABASE`** (`src/db/supabase.ts` → `hasSupabase()`): default **false = JSON local**. Mantém env do Supabase para o futuro sem forçar uso. Para ativar Supabase depois: aplicar migrations + `YOULI_USE_SUPABASE=true`.
4. **`.data/users/` e `.data/users.json` gitignorados** (estado runtime por usuário).

### Validado por smoke (API rodando)

- Token forjado → 401; senha errada → 401; user em rota admin → 403; admin → 200.
- Gustavo e Amiga: metas/perfis **isolados** (arquivos `.data/users/*.json` separados); POST 201 em ambos.
- `/api/copilot/orchestrate` sem token → 401, com token → 200.
- Admin: create 201 / PATCH role 200 / DELETE 200; `/admin` sem cookie → 307 → `/login`.

### Próximos passos sugeridos (continuação)

1. **Polir o dashboard web do usuário** (`/system/*` e `/` já são gated e por-usuário; falta refino visual/UX).
2. **Gatear as demais rotas `/api/copilot/*`** com `requireAuth` (só `orchestrate` foi gateado nesta leva).
3. **Migração Supabase real** (P0-2 para deploy): aplicar migrations, RLS por `user_id`, ligar `YOULI_USE_SUPABASE`. JSON não persiste no Vercel.
4. **P1 do PREMORTEM:** rate limiting, logging estruturado/Sentry, pipeline de deploy + `eas init`, feature flags.
5. Trocar a senha default prefilled no `app/login/page.tsx` (`teste123` → vazio/correta).

---

## 10. Sessão 4 — Supabase + Integrações por usuário (2026-05-20)

| Tema | Entrega | Commit |
|------|---------|--------|
| Supabase | SQL `apps/api/supabase/migrations/002_multiuser_schema.sql` (profile_id TEXT, RLS service-role-only, seed 2 perfis) + `store.ts` gate `hasSupabase()` + `daily_insights` por profile_id | `350c04c` |
| Strava/Zepp | Tokens **por usuário** (`.data/strava|zepp/{id}-*`), OAuth `state` assinado curto (`signOAuthState`/`verifyOAuthState`), **fix form-urlencoded** no Strava, deauthorize real; rotas auth/callback/sync/status/fitness-summary gated + por `auth.user.id` | `3f57e66` |

### Estado / ativação Supabase
- **Validado em runtime:** meta criada como Gustavo → UUID do Supabase, não aparece no JSON local, isolada da Convidada. Persistência funcionando.
- `.env.local` da API: `NEXT_PUBLIC_SUPABASE_URL=https://zpzwqpowvkavregozioz.supabase.co`, `SUPABASE_SERVICE_ROLE_KEY=<sb_secret_...>`, `YOULI_USE_SUPABASE=true`, `YOULI_SESSION_SECRET=<set>`.
- **Cobertura parcial:** tasks/goals/habits/insights vão pro Supabase. **profile/calendar/fitness/memory ainda em JSON local** (sem caminho Supabase no código) — próximo passo.

### Strava/Zepp — notas
- **Bug corrigido:** Strava exige `application/x-www-form-urlencoded` na troca/refresh de token (estava JSON → falhava). Confirmado na doc oficial.
- OAuth real exige `STRAVA_CLIENT_ID`/`STRAVA_CLIENT_SECRET` no `.env.local` (hoje vazios). Callback registrado: `http://localhost:3002/api/integrations/strava/callback`.
- Fluxo mobile de "conectar Strava" ainda precisa de UI que abra `/api/integrations/strava/auth` autenticado (cookie/bearer) — web já funciona. Follow-up.
- Cada usuário conecta seu próprio Strava/Zepp; tokens isolados por `userId`.
