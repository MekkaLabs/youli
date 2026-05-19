# Sprint Notes (repo mirror)

> Mirror local para registrar mudanças do dia quando o vault Obsidian (`/Users/gustavovicente/Documents/youli-obsidian`) não está acessível neste ambiente.

## 2026-05-15

### Entregue / Mudou
- Expandiu bastante o backend (`apps/api`) com novas rotas e serviços para “Copilot/Orchestrator” (aprovações, auditoria/attribution, diff, jobs, requirements, runtime-config, workflow catalog, weekly pipeline).
- Evoluiu a camada de agentes no backend (`apps/api/src/services/agents/*`) com componentes para orquestração, observabilidade, scoring, guardrails, fila de aprovações e execução paralela.
- Reestruturou e ampliou o app mobile (`apps/mobile`) com novas tabs e telas (calendário, financeiro, fitness, foco, hábitos, insights, metas, perfil, simular, tarefas) e novos componentes/cards (ActionCard, ArchitectPlanCard, EvolutionChart, WeeklyPipelineReport etc.).
- Adicionou padrões e “agent-os standards” (`agent-os/standards/*`) e comandos auxiliares em `.claude/commands/agent-os/*` para discovery/injection/shape de specs.

### Riscos / Dívidas
- Superfície grande de API nova: checar autenticação/escopos (ex.: `admin-scope.ts`) e padronização de erros/contratos entre rotas.
- Coesão do “Orchestrator”: revisar limites entre `services/agents/*` e `services/kernel/*` para evitar duplicação.
- Mobile: garantir estado offline/retry e degradação de UX em falhas de rede (hooks de network status e cards novos).

### Próximos passos (sugestão)
- Definir “Definition of Done” do Copilot/Orchestrator: endpoints mínimos + métricas + guardrails.
- Criar/atualizar runbook de execução local e flags/config do runtime (onde habilita/desabilita recursos).
- Validar fluxo ponta-a-ponta: Mobile → API → Orchestrator (um caso feliz + um caso com aprovação pendente).

## 2026-05-16

### Entregue / Mudou
- Backend: adicionou endpoints e serviços para integrações de saúde (Strava/Zepp) + “fitness bridge” e um resumo de fitness (`apps/api/app/api/integrations/*`, `apps/api/app/api/fitness/summary/*`, `apps/api/src/services/integrations/*`).
- Backend (Copilot): novas rotas para histórico de evolução e “life/health” (`apps/api/app/api/copilot/evolution-history/*`, `apps/api/app/api/copilot/life-health/*`).
- Mobile: adicionou telas e cards voltados a evolução (ex.: `life-score`, `evolution-history`, integrações) e reforçou acessibilidade (provider + tema acessível) (`apps/mobile/src/accessibility/*`, `apps/mobile/src/theme/accessibleTheme.ts`).
- Mobile: adicionou i18n (pt-BR/en/es/zh) + provider e expandiu notificações e configurações (ex.: SWECI) (`apps/mobile/src/i18n/*`, `apps/mobile/src/services/notifications.ts`, `apps/mobile/app/sweci-settings.tsx`).

### Riscos / Dívidas
- Integrações OAuth + sync: validar renovação de token, rate limits, retries e armazenamento seguro (Strava/Zepp).
- Contratos Mobile↔API: garantir consistência de payloads/status (incl. “syncing”, “last synced at”) e erros amigáveis.
- Acessibilidade/i18n: revisar cobertura real (labels, contraste, strings faltantes) e fluxo de fallback por locale.

### Próximos passos (sugestão)
- Definir “happy path” de integrações: conectar → sync → exibir resumo + evolução no Mobile.
- Escrever runbook mínimo: como rodar sync local (variáveis/rotas) e como depurar falhas.
- Criar smoke tests (ou checklist) para rotas novas de integrações e Copilot (status + auth + payload).
