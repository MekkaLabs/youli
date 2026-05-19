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

## 2026-05-16

### Ganhos
- Integrações de saúde (Strava/Zepp) avançaram de “ideia” para rotas + serviços, com base para sync e agregação (bridge) e superfícies de status/resumo.
- Mobile ganhou fundações de a11y e i18n, além de telas para evolução/life-score e integração.

### Pontos de atenção
- Integrações são área de alto risco: falhas silenciosas, dados inconsistentes e UX ruim se não houver retries/telemetria.
- Internacionalização e acessibilidade podem “quebrar” sem disciplina (strings hardcoded, contraste, labels).

### Perguntas para o review
- Qual é o recorte mínimo do “Life Score/Evolution” que precisa estar correto e explicado para o usuário?
- Qual é a estratégia de sync (janela, incremental, dedupe) e como vamos medir “qualidade do dado”?
- Quais 5 telas/componentes do Mobile precisam de revisão de a11y/i18n primeiro?
