# YOULI MVP

Personal Cognitive Operating System mobile-first com engine invisível de orquestração via AIOX Core + Squads.

## Estrutura

- `apps/mobile`: React Native + Expo (TypeScript)
- `apps/api`: Next.js API (orquestração, dashboard, tarefas, metas, hábitos, insights)
- `packages/shared`: tipagem e modelos de domínio
- `packages/orchestrator`: conexão com AIOX Core + squads e roteamento invisível
- `packages/memory`: memory engine inicial + roteamento contextual
- `packages/integrations`: adaptadores mockáveis de calendário e fitness
- `scripts/setup-aios.mjs`: autodetecta e configura AIOX core/squads com backup de `.env.local`

## Etapa Obrigatória Cumprida

- AIOX Core localizado e instalado via `npm ci` em:
  - `/Users/gustavovicente/Documents/aiox-core`
- Squads localizados em:
  - `/Users/gustavovicente/Downloads/squads`
- Configuração segura:
  - backup automático de `.env.local` se já existir
  - sem sobrescrita destrutiva de arquivos existentes

## Variáveis de ambiente

Use `.env.example` como base:

- `NEXT_PUBLIC_API_URL`
- `AIOS_CORE_PATH`
- `SQUADS_PATH`
- `SUPABASE_*`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `OPEN_FINANCE_PROVIDER` (`mock` | `pluggy` | `belvo`)
- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `BELVO_SECRET_ID`
- `BELVO_SECRET_PASSWORD`

## Execução

```bash
npm install
npm run setup:aios
npm run dev
```

Separado:

```bash
npm run dev:api
npm run dev:mobile
```

## Funcionalidades MVP atuais

- Perfil pessoal (estrutura de dados pronta)
- Dashboard principal com visão do dia/energia/progresso/insights
- Sistema de metas (modelo + endpoint + tela)
- Sistema de tarefas (modelo + endpoint + tela)
- Hábitos (modelo + endpoint + tela)
- Insights (modelo + endpoint + tela)
- Calendário mockável (arquitetura adaptador + tela)
- Fitness/Strava mockável (arquitetura adaptador)
- Squads invisíveis (roteamento interno no orchestrator)
- Dispatcher de intents para AIOX Core (`/api/orchestrator/dispatch`) incluindo intents de Open Finance
- Memory engine inicial (gravação + recuperação contextual por score simples)

## Estado das integrações

- Google Calendar: adaptador mock no MVP
- Apple Calendar: preparado via interface de adaptador
- Strava: adaptador mock no MVP
- Open Finance: provider abstraction via `OpenFinanceProvider` com seleção por env
- Supabase e Redis: estrutura pronta para conexão por env

## Critérios de aceitação

- Projeto executável localmente
- API Next.js funcional
- App Expo funcional
- Dashboard/tarefas/metas/hábitos/insights/calendário funcional em MVP
- Base de orquestração com squads integrada
- Memória contextual inicial implementada

## Próximos passos sugeridos (V1.1)

1. Persistência real em Supabase (RLS + tabelas para todas entidades)
2. Redis para fila de execução de workflows dos squads
3. Embeddings reais (OpenAI) para memory engine
4. Priorização/decomposição de tarefas por IA via endpoints dedicados
5. Onboarding completo com gravação de perfil
6. Conectores reais Google/Apple/Strava via OAuth
