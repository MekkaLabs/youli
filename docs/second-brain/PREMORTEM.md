# Premortem — Youli

> **2026-05-20.** Companheiro do [SYSTEM-REPORT.md](./SYSTEM-REPORT.md). Ler junto de [ROADMAP](./ROADMAP.md), [SPRINT](./SPRINT.md), [ADRS](./ADRS.md).
>
> **Método:** "Estamos N meses no futuro e o lançamento fracassou. Por quê?" Para cada horizonte listamos os modos de falha mais prováveis e derivamos as melhorias. Legenda de severidade: 🔴 crítico · 🟠 alto · 🟡 médio.

---

## Horizonte A — Beta multi-usuário falha (TestFlight + Vercel + Supabase) · ~2–4 semanas

1. **🔴 Forja de identidade (CRÍTICO).** O token é `userId:role` em texto plano. Qualquer um manda `Authorization: Bearer user-gusta-001:admin` e vira admin. No primeiro beta com >1 pessoa, isso é game over.
   → *Assinar tokens (JWT/HMAC) com segredo + expiração + refresh; nunca confiar na role vinda do cliente.*
2. **🔴 JSON db morre no serverless.** Vercel é FS efêmero/read-only por invocação. `writeDb()` não persiste — dados somem entre requests e deploys.
   → *Migrar persistência para Supabase ANTES do deploy (não dá para "beta com JSON").*
3. **🟠 Migração single→multi vaza dados.** Repos filtram por `YOULI_PROFILE_ID` global; sem isolar por `auth.user.id`, o usuário A vê dados do B.
   → *Refatorar repositories para `userId` + RLS no Supabase.*
4. **🟠 Deploy do monorepo quebra** (install command, env vars, path aliases no Vercel; `eas init` faltando no mobile).
   → *Pipeline de deploy documentado + smoke test pós-deploy.*
5. **🟡 Sem rate limit / sem observabilidade** → brute-force e impossibilidade de debugar incidentes do beta.
   → *Rate limit básico + logging estruturado + Sentry.*
6. **🟡 Voice quebra silenciosamente** (Whisper ausente) e **Life CI Loop gera lixo** com contexto ralo.
   → *Esconder voice atrás de feature flag; validar contexto do loop.*

## Horizonte B — Robustez do sistema falha · ~1–3 meses

1. **Sem testes = refator multi-user vira roleta.** Mudanças em auth/repos sem rede de segurança quebram em produção.
   → *Testes de integração nas rotas críticas (auth, repos, sync) + smoke E2E.*
2. **Corrupção concorrente do JSON / cap de 5000 memórias silencioso.**
   → *Após Supabase, escrita transacional + política explícita de retenção de memória.*
3. **Confiabilidade dos agentes.** Cache/retry existem, mas sem evals nem guardrails; respostas podem regredir sem ninguém notar.
   → *Eval suite de prompts + validação Zod das saídas + reforçar o fallback gracioso já existente.*
4. **Tokens de integração sem refresh/rotação/criptografia.**
   → *Refresh automático + segredos cifrados.*
5. **Sem CI/lint config.** Dívida e `any` voltam.
   → *GitHub Actions (typecheck + lint + test) + eslint config + pre-commit.*

## Horizonte C — Escala / produto real falha · 3–12 meses

1. **🔴 Custo de LLM explode.** Sem orçamento/medição por usuário, 90+ rotas chamando Claude viram prejuízo.
   → *Tracking de tokens/custo por usuário, caps, modelos menores por modo, cache agressivo.*
2. **Performance.** Rotas sem cache, sem paginação, N+1 no Supabase, índices pgvector não tunados.
   → *Cache (Redis já é dep via ioredis), paginação, tuning de índices.*
3. **🔴 Compliance de PII (saúde + finanças).** LGPD/GDPR: criptografia em repouso, export/delete de dados, gestão de segredos.
   → *Data lifecycle + criptografia + endpoints de portabilidade/remoção.*
4. **Retenção/produto.** Onboarding, notificações e o "moat" de personalização precisam provar valor.
   → *Métricas de ativação/retenção (framework See-Think-Do-Care).*
5. **Vendor lock-in** (Anthropic, Supabase, Zep).
   → *Abstrações já parciais (memory-connectors, integrations adapter); formalizar interfaces.*

---

## Backlog priorizado de melhorias (consolidado)

| # | Melhoria | Por quê (falha que evita) | Horizonte | Esforço | Impacto |
|---|----------|---------------------------|-----------|---------|---------|
| P0-1 | **Assinar tokens (JWT/HMAC) + expiração + refresh; role do servidor** | A1 forja de admin | Beta | M | Crítico |
| P0-2 | **Migrar persistência p/ Supabase (repos por `auth.user.id` + RLS)** | A2 JSON no serverless + A3 vazamento | Beta | G | Crítico |
| P1-1 | Rate limiting + logging estruturado + Sentry | A5 | Beta | M | Alto |
| P1-2 | Pipeline de deploy (Vercel env/install, `eas init`) + smoke test | A4 | Beta | M | Alto |
| P1-3 | Feature flags (esconder voice/Whisper e features mock) | A6 | Beta | P | Médio |
| P2-1 | Testes de integração (auth, repos, sync) + smoke E2E | B1 | Robustez | G | Alto |
| P2-2 | CI (Actions: typecheck+lint+test) + eslint config + pre-commit | B5 | Robustez | M | Alto |
| P2-3 | Criptografia/refresh de tokens de integração | B4 | Robustez | M | Médio |
| P2-4 | Evals + guardrails Zod nas saídas de agentes | B3 | Robustez | M | Médio |
| P3-1 | Tracking de custo/tokens de LLM por usuário + caps | C1 | Escala | M | Crítico |
| P3-2 | Cache/paginação/tuning pgvector | C2 | Escala | G | Alto |
| P3-3 | Compliance PII (cripto em repouso, export/delete) | C3 | Escala | G | Crítico |
| P3-4 | Métricas de ativação/retenção | C4 | Escala | M | Alto |

**Sequência recomendada:** `P0-1 → P0-2` (bloqueiam qualquer beta real) → `P1-*` (viabilizam o beta com segurança) → `P2-*` (sustentam evolução) → `P3-*` (preparam escala).

---

## Nota crítica

O achado **P0-1 (forja de token admin)** é a descoberta mais séria deste relatório: enquanto a role vier do cliente em texto plano, **não exponha a API a um segundo usuário**. Tratar antes de qualquer deploy multi-usuário.

*Gerado em 2026-05-20 (branch `claude/priceless-cray-231c32`).*
