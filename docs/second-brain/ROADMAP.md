# Roadmap (repo mirror)

> Mirror local para registrar evolução de roadmap quando o vault Obsidian não está acessível neste ambiente.

## 2026-05-15

### Linha de produto (macro)
- Copilot/Orchestrator como “núcleo” de automações: catálogo de workflows, fila de aprovações, checkpoints e relatórios (incl. weekly pipeline).
- “Kernel” do backend como base de execução: registry de funções, policy de modelo, plugin executor, conectores de memória, compressão de contexto e observabilidade.
- Mobile como cockpit unificado: tabs por área (tarefas, hábitos, metas, calendário, financeiro, fitness, insights) + cards de ação/resposta do agente.

### Milestones sugeridos
- M1: Contratos estáveis de API (versioning + payloads) para Copilot/Orchestrator.
- M2: Observabilidade mínima (event stream + métricas) e diagnóstico (diff/snapshots) em produção.
- M3: UX “happy path” no Mobile (1 ação agente → 1 resposta → 1 insight/efeito visível).

## 2026-05-16

### Linha de produto (macro)
- Integrações de saúde como alavanca de “evidências”: conectar (OAuth) → sincronizar → transformar em insights (fitness bridge) → exibir evolução/life-score no Mobile.
- Mobile mais “pronto pra produção”: acessibilidade como camada transversal (tema + provider) e i18n como fundação (pt-BR + idiomas).

### Milestones sugeridos
- M4: Integrações (Strava/Zepp) estáveis: fluxo de auth, refresh, sync incremental e observabilidade.
- M5: Modelo de “evolution history / life score” versionado (contratos + cálculo + explicabilidade).
