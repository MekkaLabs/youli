# HANDOFF COMPLETO — Youli (para nova aba)

> **Data:** 2026-05-28 · **Branch:** `claude/priceless-cray-231c32` · **HEAD:** `5317338` (pushed)
> **Repo:** github.com/MekkaLabs/youli
> **Worktree de trabalho:** `/Users/gustavovicente/Documents/Youli/.claude/worktrees/priceless-cray-231c32`
> (NÃO trabalhar no checkout principal `/Users/gustavovicente/Documents/Youli` — está no `main` em `7236a96`)

Este documento dá contexto total para retomar o trabalho do zero numa nova sessão.
Complementos: `HANDOFF.md` (arquitetura base original), `HANDOFF-SESSAO-2026-05-20.md`
(sessões 1-6 detalhadas), e `docs/second-brain/*` (SYSTEM-REPORT, PREMORTEM, DEPLOY, ROADMAP).

---

## 1. O QUE É O YOULI

Personal OS de IA, multi-usuário, multi-agente. Monorepo npm (workspaces).
- **`apps/api`** — Next.js 15.5 (App Router), ~90 rotas, porta 3002. Backend + dashboards web (`/system/*`, `/admin`).
- **`apps/mobile`** — Expo SDK 54 / RN 0.81 / expo-router 6. Cockpit principal do usuário.
- **`packages/`** — `@youli/shared` (tipos), `@youli/memory`, `@youli/orchestrator`, `@youli/integrations`.

**Golden path:** Mobile (CopilotBar/VoiceInput) ou Web (`/system` copiloto) → backend orquestrador
(10 agentes-persona) → ação concreta → persistência (Supabase + JSON por-usuário) → sync mobile (20s) → UI.

---

## 2. ESTADO ATUAL — VALIDADO

| Check | Status |
|---|---|
| `npm run typecheck` | ✅ 0 erros |
| `npm run lint` | ✅ exit 0 — **0 errors**, 73 warnings |
| `npm run build -w @youli/api` | ✅ 91 rotas, exit 0 |
| CI (GitHub Actions) | ✅ typecheck + lint + build em todo push/PR |
| Supabase | ✅ ATIVO (`YOULI_USE_SUPABASE=true`), isolado por usuário |
| Obsidian → Supabase | ✅ 17 notas sincronizadas, idempotente |
| Auth/segurança golden path | ✅ todas rotas mutativas com `requireAuth`/`requireAdmin` |

**App funciona end-to-end no teste local/tunnel** (multi-usuário + Supabase + Obsidian + auth).
Falta: deploy hospedado + integrações OAuth (credenciais) + refino visual.

---

## 3. O QUE JÁ FOI FEITO (cronológico, 7 grandes blocos)

### Sessões 1-2 — Qualidade & segurança base
Tipagem de `any` (api+mobile), `catch {}` → `logWarn`, prune Obsidian, patch CVE Next.

### Sessão 3 — Multi-usuário + Auth (P0 do premortem)
- **`7ca0466` Auth assinada:** token HMAC-SHA256 + expiração 30d (antes era `userId:role` texto plano — forjável). Senhas com scrypt + upgrade transparente de legado. Role SEMPRE do servidor.
- **`ba50132` Persistência multi-usuário:** `local-db` virou por-usuário (`.data/users/{userId}.json`). `readDb(userId)`/`writeDb(userId)`. Owner (`user-gusta-001`) herda o db.json legado; novos usuários começam limpos.
- **`105286a` Agentes personalizados:** orquestrador lê perfil do usuário logado (`enrichContext`).
- **`8e06c76` Painel admin web** + gate por papel.

### Sessão 4 — Supabase + integrações por usuário
- **`350c04c`** Schema multi-usuário (migration 002) alinhado ao código (profile_id TEXT, RLS sem policies = só service_role acessa).
- **`3f57e66`** Strava + Zepp por usuário + **fix bug OAuth** (era JSON, Strava exige form-urlencoded). State assinado curto carrega userId no callback.

### Sessão 5 — Memória/Obsidian + Google Calendar
- **`f4a0cf6` + `2992df8`** SupabaseMemoryConnector (memory_records); migration 003 (source/external_id/tags/area + índice único). Obsidian persiste no Supabase. Fix: id UUID (era determinístico, inválido em Postgres).
- **`1cc8f68`** Google Calendar por usuário (OAuth2 form-urlencoded, access_type=offline).

### Sessão 6 — Deploy-prep + Hardening
- **`814881c`** Dockerfile (build da raiz, exclui mobile) + DEPLOY.md + rate limit (login/register) + CI inicial. next.config limpo.

### Sessão 7 (ATUAL) — Estabilização para beta
- **`88bf6e8` (P0):** 3 rotas do golden path estavam SEM auth (`voice/command`, `orchestrate/confirm`, `copilot/agent/[area]`) — impersonação + caminhos não-funcionais. Fechado + identidade do servidor.
- **`c6cfd64` (P1):** +13 rotas mutativas ganharam `requireAuth`/`requireAdmin`. Audit limpo: só restam públicas login/register/logout.
- **`9040dda`:** lint 24 errors → 0 (dynamic imports documentados, JSX entities, config eslint API). CI passa a rodar lint.
- **`b64b32b`:** Zod (`parseJsonBody`) em 6 rotas do golden path — payload malformado vira 422, não 500. Rate limit em orchestrate (30/min) + voice/command (20/min).
- **`5317338`:** sweep unused-vars mobile (85 → 73 warnings).

---

## 4. DECISÕES ARQUITETURAIS CRÍTICAS (não reverter sem entender)

1. **Deploy = host com disco persistente** (Railway/Render/Fly), **NÃO Vercel**. O design grava estado em `.data/` (auth users, profile, calendar, fitness, tokens). Serverless apagaria. Decisão tomada com o usuário.
2. **Persistência híbrida:** tasks/goals/habits/insights/memória → **Supabase**. profile/calendar/fitness/auth-users/tokens → **JSON por-usuário** (`.data/`). Migrar esses 3 ao Supabase só seria necessário no Vercel (exigiria tornar readDb/writeDb async — refactor grande).
3. **Mobile no beta = Expo Go via tunnel** (sem build EAS).
4. **`YOULI_SESSION_SECRET` é OBRIGATÓRIA em produção** — `auth.ts` lança erro sem ela.
5. **Identidade vem SEMPRE do servidor** — rotas nunca confiam em `profileId`/`role` do body.
6. **Config eslint do API** usa parser TS direto (não `extends:next/core-web-vitals`, que tem circular reference bug em monorepo).

---

## 5. CONFIGURAÇÃO / SEGREDOS

`apps/api/.env.local` (gitignored, já configurado pelo usuário):
- `NEXT_PUBLIC_SUPABASE_URL=https://zpzwqpowvkavregozioz.supabase.co` ✅
- `SUPABASE_SERVICE_ROLE_KEY=sb_secret_...` ✅ (a SECRET, não a publishable)
- `YOULI_USE_SUPABASE=true` ✅
- `YOULI_SESSION_SECRET=...` ✅ (gerado)
- `ANTHROPIC_API_KEY=sk-ant-...` ✅
- `STRAVA_CLIENT_ID/SECRET` ❌ (falta — usuário cria em strava.com/settings/api, callback domain = localhost)
- `GOOGLE_CLIENT_ID/SECRET` ❌ (falta — Google Cloud Console)
- `ZEPP_CLIENT_ID/SECRET` ❌ (falta)

**Supabase migrations** (rodar no SQL Editor, em ordem): `002_multiuser_schema.sql` + `003_memory_obsidian.sql` — JÁ APLICADAS pelo usuário ✅.

**Usuários seed:** `gustav0.v1c3nt3@gmail.com` (admin) / `amiga@youli.app` (user) — senha `youli2024`.

---

## 6. COMO RODAR

```bash
cd /Users/gustavovicente/Documents/Youli/.claude/worktrees/priceless-cray-231c32

# Subir API (porta 3002)
cd apps/api && npm run dev

# Validações
npm run typecheck            # raiz, workspaces
npm run lint                 # raiz, workspaces (exit 0 hoje)
npm run build -w @youli/api  # build produção

# Smoke auth (com API no ar) — usar /usr/bin/curl (zsh: 'path' é alias)
TOKEN=$(/usr/bin/curl -s -X POST localhost:3002/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"gustav0.v1c3nt3@gmail.com","password":"youli2024"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
/usr/bin/curl -s -H "Authorization: Bearer $TOKEN" localhost:3002/api/tasks

# Sync Obsidian (vault em ~/Documents/youli-obsidian, 17 notas)
node scripts/sync-obsidian.mjs --vault /Users/gustavovicente/Documents/youli-obsidian \
  --api http://localhost:3002 --cookie "youli_session=$TOKEN"   # +--prune p/ remover deletadas
```

> ⚠️ Mobile via tunnel: `cd apps/mobile && npx expo start --tunnel`. NÃO rodar expo em background sem TTY (trava). Detalhes em HANDOFF-SESSAO-2026-05-20.md.

---

## 7. PRÓXIMAS MELHORIAS (fila priorizada)

### Em aberto da sessão 7 (continuar daqui)
| Prio | Item | Notas |
|------|------|-------|
| P1 | **Concluir sweep unused-vars** | 43 warnings `no-unused-vars` restantes + 24 `exhaustive-deps`. Meta: chegar a 0 e ativar `--max-warnings 0` no CI (comentário já está no ci.yml). |
| P1 | **`react-hooks/exhaustive-deps` (24)** | Cada um é potencial stale closure — auditar caso a caso (alguns intencionais). |
| P2 | **Zod nas demais rotas** | 6 do golden path feitas; ~43 rotas ainda usam `req.json()` cru. Aplicar `parseJsonBody` gradualmente. |

### Roadmap maior (do PREMORTEM, todos opcionais)
| Prio | Item |
|------|------|
| - | **Google Calendar end-to-end** — usuário cria credenciais no Google Cloud, validar fluxo (código pronto). |
| - | **Deploy** Railway/Render/Fly (DEPLOY.md tem passo a passo) + apontar `EXPO_PUBLIC_API_URL` mobile. |
| - | **Refino visual** dos dashboards web (usuário pediu para voltar nisso) e mobile. |
| - | **Sentry** / observabilidade estruturada (precisa dep + DSN). |
| - | **Migrar profile/calendar/fitness → Supabase** (só se for pra Vercel). |
| - | Tokens de integração criptografados (hoje JSON plano em `.data/`). |
| - | Criptografia PII / compliance (escala). |

---

## 8. ARMADILHAS CONHECIDAS

- **Runtime `.data/*.json` sempre aparece modificado** no git status (db.json, users.json, orchestrator-*.json). É gitignored e esperado — NÃO commitar, NÃO reverter.
- **zsh:** `path` é alias de `$PATH`. Em loops de smoke usar outra variável (`p`, `entry`) e `/usr/bin/curl` se o PATH corromper.
- **expo start em background sem TTY trava** ("non-interactive mode").
- **API lint** (`next lint`) sem `.eslintrc.json` pede prompt interativo e trava — o arquivo já existe (parser TS).
- **Foto hardcoded:** removida do dashboard web (era do Gustavo); usa iniciais como fallback.

---

## 9. ESTRUTURA DE ARQUIVOS-CHAVE

```
apps/api/
  src/lib/http.ts              — requireAuth/requireAdmin/parseJsonBody/jsonError/logError
  src/lib/rate-limit.ts        — enforceRateLimit (in-memory)
  src/services/auth.ts         — signSession/verifySession (HMAC), hash senha, signOAuthState
  src/repositories/local-db.ts — readDb(userId)/writeDb(userId), seed por-usuário
  src/repositories/store.ts    — tasks/goals/habits/insights/memory (Supabase + fallback local)
  src/services/kernel/memory-connectors.ts — SupabaseMemoryConnector
  src/services/integrations/   — strava.ts, zepp.ts, google-calendar.ts (todos per-user)
  src/services/agents/         — orchestrator, agent-executor, definitions (10 personas)
  app/api/                     — ~90 rotas. Golden path: copilot/*, voice/command, system/interpret
  app/system/[section]/page.tsx — dashboard web do usuário (gated)
  app/admin/page.tsx           — painel admin (CRUD usuários)
  supabase/migrations/         — 002 (schema), 003 (memória)
  .eslintrc.json               — config TS parser
  middleware.ts                — gate de formato de token (Edge)

apps/mobile/
  src/services/auth-token.ts   — interceptor global de fetch (Bearer)
  src/hooks/useAuth.ts         — login/register usa data.token assinado
  src/organisms/CopilotBar/    — chat com orquestrador (SSE)
  src/molecules/VoiceInput/    — voz (STT opcional dynamic import)

Dockerfile + .dockerignore     — deploy (build da raiz)
.github/workflows/ci.yml       — typecheck + lint + build
docs/second-brain/             — SYSTEM-REPORT, PREMORTEM, DEPLOY, ROADMAP, SPRINT, ADRS
scripts/sync-obsidian.mjs      — sync vault → Supabase
```

---

## 10. PRIMEIRA AÇÃO RECOMENDADA NA NOVA ABA

`git log --oneline -8` para confirmar HEAD em `5317338`, depois `npm run lint` para ver os 73 warnings.
O caminho de continuação mais natural: **terminar o sweep de unused-vars + auditar os 24 exhaustive-deps**
para zerar warnings e travar regressão no CI. Alternativa: usuário pode querer **refino visual** (mencionou
que voltaria nisso) ou **deploy**. Perguntar a direção se não estiver claro.

> Tudo commitado e pushed. Working tree limpo (exceto runtime `.data/`). CI verde.
