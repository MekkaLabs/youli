# ADRs (repo mirror)

> Mirror local de ADRs/propostas. Status “Proposto” até consolidar no vault Obsidian.

## 2026-05-15 — Proposto: Adotar “agent-os standards” como guia interno

### Contexto
- Entraram documentos e índice de padrões em `agent-os/standards/*` e comandos auxiliares em `.claude/commands/agent-os/*`.

### Decisão
- Usar `agent-os/standards/*` como referência padrão para arquitetura, padrões de API e UI mobile.

### Consequências
- Facilita consistência e revisão, mas exige disciplina para manter os padrões sincronizados com o código.

## 2026-05-15 — Proposto: Estruturar Copilot/Orchestrator via rotas Next + serviços internos

### Contexto
- Crescimento de rotas em `apps/api/app/api/copilot/*` e serviços em `apps/api/src/services/agents/*` e `apps/api/src/services/kernel/*`.

### Decisão
- Consolidar o Orchestrator como camada de serviços (agents/kernel) exposta por rotas HTTP bem definidas (copilot/*).

### Consequências
- Bom para modularizar e instrumentar, mas aumenta a necessidade de governança (versioning, auth, quotas e compatibilidade).

## 2026-05-16 — Proposto: Padronizar integrações (Strava/Zepp) com OAuth + sync + “fitness bridge”

### Contexto
- Entraram rotas de auth/callback/sync e status em `apps/api/app/api/integrations/*`.
- Serviços de integração e agregação em `apps/api/src/services/integrations/*` (incl. bridge).

### Decisão
- Tratar integrações como pipeline: (1) OAuth + refresh (2) sync incremental (3) normalização em “snapshot” (4) agregação/insights via bridge (5) superfície de API enxuta para o Mobile.

### Consequências
- Facilita adicionar novos providers (ex.: outros wearables), mas aumenta complexidade operacional (retries, limites, observabilidade, consistência de dados).

## 2026-05-16 — Proposto: Tornar Acessibilidade + i18n camadas first-class no Mobile

### Contexto
- Entrou provider de acessibilidade e tema acessível (`apps/mobile/src/accessibility/*`, `apps/mobile/src/theme/accessibleTheme.ts`).
- Entrou i18n com múltiplos locais + provider (`apps/mobile/src/i18n/*`).

### Decisão
- Aplicar a11y e i18n como dependências globais (providers) e exigir que novos componentes/telas usem strings traduzidas e tokens do tema.

### Consequências
- Melhora UX e expansão internacional, mas exige disciplina e revisão contínua (strings faltantes, labels/role, contraste, regressões).
