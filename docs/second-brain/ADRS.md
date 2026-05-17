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

