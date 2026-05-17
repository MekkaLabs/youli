# Weekly Review (repo mirror)

> Mirror local para alimentar o review semanal com os principais sinais do dia.

## 2026-05-15

### Ganhos
- Grande aceleração de escopo em backend (Copilot/Orchestrator + kernel/agents) e em mobile (telas por área + componentes novos).
- Padronização inicial via `agent-os` para reduzir entropia.

### Pontos de atenção
- Aumento de superfície de manutenção: muitos endpoints e módulos novos sem evidência aqui de testes/contratos.
- Necessidade de “north star”: quais workflows são prioridade vs. “catalogo amplo” sem uso real.

### Perguntas para o review
- Quais 3 fluxos de usuário mais importantes para validar ponta-a-ponta na próxima semana?
- Quais endpoints são “internos/experimento” vs. “contrato público” (versionamento e SLA)?
- Quais métricas definem sucesso do Orchestrator (latência, taxa de aprovação, impacto em hábitos/metas)?

