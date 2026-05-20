# Second Brain — Integração Youli ↔ Obsidian

Este documento descreve a integração **funcional** entre o vault Obsidian
e o MemoryEngine do Youli. A sincronia é **incremental, idempotente e local**
— o vault permanece no seu computador, apenas o conteúdo é indexado.

## Vault canônico

```
/Users/gustavovicente/Documents/youli-obsidian
```

Estrutura PARA padrão:
- `00 - Inbox/` — entrada rápida
- `10 - Projects/` — projetos ativos (incl. youli-mvp)
- `20 - Areas/` — áreas de vida contínuas
- `30 - Resources/` — refs e runbooks
- `40 - Archive/` — concluído
- `50 - MOCs/` — mapas de conteúdo
- `60 - Daily/` — daily notes
- `70 - Templates/` — templates
- `80 - Attachments/` — anexos

## Como funciona

1. Você edita notas no Obsidian normalmente.
2. Roda `scripts/sync-obsidian.mjs` (manualmente, via cron, ou via Shortcut).
3. O script:
   - Caminha pelo vault, lê todos os `.md`
   - Calcula SHA-256 do conteúdo de cada nota
   - Compara com o estado salvo em `~/.youli-obsidian-sync.json`
   - **Só envia notas que mudaram**
   - Faz POST em batch para `POST /api/memory/sync-obsidian`
4. A API:
   - Valida com Zod
   - Faz **upsert idempotente** por `externalId` (= caminho relativo da nota)
   - Indexa em 3 camadas: Zep (grafo temporal), pgvector (busca semântica),
     cache em memória
5. Os 10 agentes (Leonardo, Franklin, …) recebem essas memórias
   automaticamente como contexto quando o usuário interage. **Sócrates**
   (agente de insights) prioriza notas do vault.

## Setup inicial

### 1. Variáveis de ambiente

Adicione ao seu shell rc (`~/.zshrc` ou `~/.bashrc`):

```bash
export YOULI_VAULT_PATH="/Users/gustavovicente/Documents/youli-obsidian"
export YOULI_API_URL="http://localhost:3002"          # ou seu domínio prod
export YOULI_SYNC_COOKIE="youli_session=<userId>:<token>"
```

Para pegar o cookie em dev:
1. Acesse `http://localhost:3002/login` e faça login
2. DevTools → Application → Cookies → copie o valor de `youli_session`
3. Cole no formato `youli_session=<valor>` em `YOULI_SYNC_COOKIE`

### 2. Dry-run para validar

```bash
node scripts/sync-obsidian.mjs --dry-run
```

Saída esperada: lista de arquivos que serão sincronizados, sem enviar nada.

### 3. Primeira sincronia

```bash
node scripts/sync-obsidian.mjs
```

Na primeira execução, **todas** as notas vão ser indexadas. Próximas execuções
só processam o que mudou.

## Frontmatter opcional

O script reconhece YAML no topo das notas:

```markdown
---
area: metas
tags: [projeto, mvp]
type: fact
---

# Plano Q2

Conteúdo da nota...
```

| Campo  | Descrição                                | Default |
|--------|------------------------------------------|---------|
| `area` | Área de vida (`dashboard`, `tarefas`, `metas`, etc.) | `general` |
| `tags` | Lista de tags. Aceita `[a, b]` ou linha-a-linha (`- a`) | — |
| `type` | `fact` \| `pattern` \| `event` \| `preference` | `fact` |

## Buscar memórias do vault

Via API, com cookie de sessão:

```bash
# Todas as memórias da origem 'obsidian'
curl -H "Cookie: $YOULI_SYNC_COOKIE" \
  "$YOULI_API_URL/api/memory?source=obsidian&limit=50"

# Busca semântica em notas do vault
curl -H "Cookie: $YOULI_SYNC_COOKIE" \
  "$YOULI_API_URL/api/memory?q=youli%20arquitetura&source=obsidian"

# Filtrar por tag
curl -H "Cookie: $YOULI_SYNC_COOKIE" \
  "$YOULI_API_URL/api/memory?tags=projeto,mvp"
```

## Cron diário (opcional)

Editar `crontab -e`:

```cron
# Sync a cada hora durante o dia
0 8-23 * * * /usr/local/bin/node /Users/gustavovicente/Documents/Youli/scripts/sync-obsidian.mjs >> ~/youli-sync.log 2>&1
```

## Troubleshooting

### "ERRO: vault não encontrado"
Cheque `YOULI_VAULT_PATH`. O caminho precisa existir e ser diretório.

### "HTTP 401" no batch
Cookie expirou. Faça login de novo e atualize `YOULI_SYNC_COOKIE`.

### "0 mudaram desde a última sync" mas você editou notas
Se passou `--state /tmp/...` por engano, o estado anterior está em
`~/.youli-obsidian-sync.json`. Delete o `.youli-obsidian-sync.json` para
forçar reindexação completa:

```bash
rm ~/.youli-obsidian-sync.json
node scripts/sync-obsidian.mjs
```

### Notas grandes truncadas
O default é 200 KB por nota. Use `--max-bytes 500000` para subir o limite,
ou divida a nota.

### Notas deletadas no vault continuam no Youli
Por design (conservador). Não há cleanup automático. Para remover:

```bash
# Remover por externalId (caminho relativo da nota no vault)
curl -X DELETE \
  -H "Cookie: $YOULI_SYNC_COOKIE" \
  "$YOULI_API_URL/api/memory/by-external?externalId=10%20Projects/youli-mvp.md"

# Ou remover por id direto
curl -X DELETE \
  -H "Cookie: $YOULI_SYNC_COOKIE" \
  "$YOULI_API_URL/api/memory/mem_obsidian_abc12345"
```

Apenas o registro local é apagado — o índice semântico em pgvector/Zep
expira naturalmente ou é sobrescrito no próximo upsert do mesmo externalId.

## Arquivos relacionados

- `scripts/sync-obsidian.mjs` — CLI de sincronia
- `apps/api/app/api/memory/sync-obsidian/route.ts` — endpoint batch
- `apps/api/app/api/memory/route/route.ts` — GET/POST de memória individual
- `apps/api/src/services/kernel/memory-connectors.ts` — upsert por externalId
- `packages/memory/src/index.ts` — MemoryEngine com filtro por origem
- `packages/shared/src/index.ts` — `MemorySource` e `MemoryRecord`
- `apps/api/src/services/agents/agent-executor.ts` — hidratação automática
  do `memoryContext` para os 10 agentes
