# System Report — Youli

> Fotografia técnica completa do sistema em **2026-05-20**.
> Documentação viva — ler junto de [ROADMAP](./ROADMAP.md), [SPRINT](./SPRINT.md), [ADRS](./ADRS.md) e os HANDOFFs na raiz (`HANDOFF.md`, `HANDOFF-SESSAO-2026-05-20.md`).
> Companheiro: [PREMORTEM.md](./PREMORTEM.md) (modos de falha + backlog de melhorias).

---

## 1. Visão geral

Personal OS **single-user**, **multi-agente**. Backend Next.js (App Router) serve ~90+ rotas; app mobile Expo/React Native consome via `fetch` com interceptor de auth. Persistência **híbrida** (JSON local + Supabase como fallback, ainda não ativo em produção). IA via Claude (Anthropic) com **signal bus** entre agentes, **GraphRAG-lite** de correlações e **MemoryEngine** (Zep/pgvector/cache).

## 2. Monorepo & tooling

- **Workspaces npm** (`apps/*`, `packages/*`); sem Turbo/Nx. Dev via `concurrently` (`dev:api` + `dev:mobile`).
- **Scripts raiz**: `dev`, `build/lint/typecheck/test` rodam `--workspaces --if-present` (`test` é no-op — não há testes).
- **`postinstall` hack**: remove `node_modules/react-native` da raiz para resolver duplicação de RN (origem dos antigos erros de `boxShadow`; hoje typecheck limpo).
- **Override**: `react-native-worklets@0.5.2` (exigido por reanimated 4.1).
- **TypeScript** strict (`tsconfig.base.json`, ES2022, path aliases para os 4 packages).

## 3. Backend — `apps/api`

- **Next.js ^15.5.18** (CVE patcheada), runtime `nodejs`, dev na porta **3002**, `typedRoutes` on.
- **Rotas (~90+)** por domínio:
  - auth (6), admin (2)
  - copilot / orchestrator / agents (38+)
  - memory (4, inclui `sync-obsidian` com prune opt-in)
  - life-data — tasks / goals / habits / fitness / calendar / insights (30+)
  - integrations — Strava / Zepp / tools / status (11)
  - open-finance (4), system / seed / modules (4), simulate (2), voice/command (1), dashboard / profile / settings (10+)
- **Helpers** `src/lib/http.ts`: `requireAuth()`, `requireAdmin()`, `parseJsonBody(req, zodSchema)`, `jsonError`, `logError/logWarn`. Padrão: `const auth = await requireAuth(); if (auth.error) return auth.response;`.
- **Services** (`src/services/**`):
  - `agents/` — executor (retry + timeout + cache LRU 5min), orchestrator (LangGraph), 10 definitions, planner / CI weekly
  - `signals/agent-signal-bus.ts` — pub/sub tipado por `SignalType`
  - `graph/life-graph.ts` — correlações via RPC `get_area_relationships`
  - `kernel/` — memory-connectors, function-packs/registry, model-policy de tokens, memory-scoring
  - copilot (claude/life), simulator

## 4. Mobile — `apps/mobile`

- **Expo SDK 54, RN 0.81.5, expo-router 6.0.23, reanimated 4.1.1**.
- **Boot** (`app/_layout.tsx`): providers (ErrorBoundary, Gesture, SafeArea, Auth, Store, Theme, I18n, Accessibility, Toast) + instala o interceptor global de fetch (`src/services/auth-token.ts`) que injeta `Authorization: Bearer <token>`.
- **Design system**: ~16 atoms, ~15 molecules, ~23 organisms, templates. Rotas: ~9 tabs + ~10 modais.
- **Estado**: Context + `useReducer` (`src/store`), sem Redux/Zustand. Hooks de domínio (~23) persistem em AsyncStorage e sincronizam com a API (`SYNC_INTERVAL_MS=20s`), com **fallback de 3 camadas: API → cache → mock**. Recarrega no `AppState 'active'`.
- **i18n** próprio (pt-BR/en/es/zh); **a11y** (alto contraste, escala de fonte, reduced motion, UI simplificada).
- **Health** (`useHealth.ts`): HealthKit via `expo-health` → `/api/fitness/summary` (Zepp/Strava) → cache 1h → mock. `any` aqui é legítimo (native modules sem tipos).

## 5. Packages

| Package | Propósito |
|---|---|
| `@youli/shared` | Tipos de domínio (Task, Habit, Goal, MemoryRecord, UserProfile, PersonaId, enums). Pure types. |
| `@youli/memory` | MemoryEngine (embeddings/pgvector-ready, Zep, cache). |
| `@youli/orchestrator` | Catálogo de workflows (YAML + schema). |
| `@youli/integrations` | Contratos/mocks de Strava/Zepp/open-finance. |

## 6. Dados & persistência

- **JSON local** (`src/repositories/local-db.ts`, `.data/db.json`): estrutura única carregada/escrita em bloco. **Não atômico**; cap de **5000 memórias** (trunca silenciosamente).
- **Supabase** (`src/repositories/supabase/*`): padrão `if (!hasSupabase() || !YOULI_PROFILE_ID) usa local`. Migrations existem (`001_youli_schema`, seed, graph_relations) **mas não aplicadas**.
- **Single-profile**: persistência usa `YOULI_PROFILE_ID` global, **não** `auth.user.id`. Multi-user exige refatorar os repositories.

## 7. Auth & segurança (estado atual)

- **Sessão** = cookie `youli_session` no formato **`<userId>:<role>`** (httpOnly, sameSite=lax, 30d) **+ Bearer** equivalente para mobile.
- Usuários em JSON seed (gustav0… admin + amiga…), senha `youli2024`.
- ✅ `requireAuth/requireAdmin` cobrindo a maioria das rotas; CORS por env; CVE do Next patcheada.
- ⚠️ **Token sem assinatura/expiração**: `userId:role` em texto plano e previsível (ver PREMORTEM A1 — crítico).
- ⚠️ Tokens de Strava/Zepp em JSON **não criptografado**.
- ⚠️ Sem rate limiting.

## 8. Subsistema de IA

10 personas (Leonardo, Franklin, Aristóteles, Sócrates, Alexandre, Marco, Adam, Hipócrates…) mapeadas às áreas de vida. Executor com retry/timeout/cache. O **signal bus** gera "inteligência emergente" (ex.: streak quebrado → Sócrates analisa). O **life-graph** correlaciona áreas. O **Life CI Loop** (Assess → Gap → Plan → Execute → Review) faz o planejamento semanal. `model-policy` aloca tokens por modo (routing 200 → workflow_plan 1800).

## 9. Integrações

| Provider | Status |
|---|---|
| Strava | Real (OAuth2 → sync) |
| Zepp | Real (OAuth2 → sync) |
| Obsidian | Real (sync + prune opt-in) |
| Open Finance | Adapter (mock/Pluggy/Belvo, env-driven) — hoje mock |
| Google/Native Calendar | Stub (marcado "connected", sem sync real) |
| Voice (Whisper) | TODO — grava áudio, não transcreve |

## 10. Qualidade & operação

- **Testes: 0** (sem jest/vitest, sem `tests/`, sem `*.test.*`).
- **CI: nenhum** (`.github/workflows` ausente). Sem pre-commit hooks.
- **ESLint** instalado mas **sem config** (usa defaults).
- **Typecheck**: limpo (**0 erros** api + mobile) após a sessão de 2026-05-20.
- **Observabilidade**: só `console` via `logger.ts`; sem métricas/alertas/tracing.
- **Deploy**: `vercel.json` (api) e `eas.json` (mobile) existem; `app.json` teve placeholders EAS removidos (precisa `eas init` para build real).

## 11. Snapshot do que funciona hoje

App roda em Expo Go (tunnel), login + auth Bearer validados, Obsidian indexado, agentes respondem, dashboards renderizam com fallback. Fundação de segurança e tipagem sólida; **pronto para *hardening* e deploy — não para escala**.

---

*Gerado em 2026-05-20 (branch `claude/priceless-cray-231c32`). Próximos passos e riscos: ver [PREMORTEM.md](./PREMORTEM.md).*
