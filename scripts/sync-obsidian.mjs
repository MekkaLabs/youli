#!/usr/bin/env node
/**
 * sync-obsidian.mjs — Sincronia incremental de um vault Obsidian
 * para o MemoryEngine do Youli (Zep + pgvector + cache).
 *
 * Uso:
 *   node scripts/sync-obsidian.mjs \
 *     --vault /Users/gustavovicente/Documents/youli-obsidian \
 *     --api  http://localhost:3002 \
 *     --cookie "youli_session=<userId>:<token>" \
 *     [--dry-run] [--batch 50] [--state ~/.youli-obsidian-sync.json] \
 *     [--max-bytes 200000]
 *
 * Env vars equivalentes (use no .env do shell):
 *   YOULI_VAULT_PATH        → --vault
 *   YOULI_API_URL           → --api  (default http://localhost:3002)
 *   YOULI_SYNC_COOKIE       → --cookie (obrigatório se não passar via CLI)
 *   YOULI_SYNC_STATE_PATH   → --state (default ~/.youli-obsidian-sync.json)
 *
 * Estado:
 *   Mantém SHA-256 do conteúdo de cada nota em `state.json`. Notas com hash
 *   inalterado são puladas. Notas deletadas no vault NÃO são removidas do
 *   Youli (idempotente, conservador). Para purgar, use a UI ou um endpoint
 *   futuro de cleanup.
 *
 * Frontmatter suportado (YAML no topo do .md):
 *   ---
 *   area: metas          # mapeado para `area` no MemoryRecord
 *   tags: [projeto, mvp] # ou linha-a-linha (-projeto / -mvp)
 *   type: fact           # fact | pattern | event | preference
 *   ---
 *
 * Saída (stdout):
 *   - Linha por nota: [created]/[updated]/[skipped]/[error] externalId
 *   - Resumo final com totais e tempo
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import os from 'node:os';

// ---------- CLI parsing ----------

function parseArgs(argv) {
  const out = { dryRun: false, batch: 50, maxBytes: 200_000 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    switch (k) {
      case '--vault':    out.vault = v; i++; break;
      case '--api':      out.api = v.replace(/\/+$/, ''); i++; break;
      case '--cookie':   out.cookie = v; i++; break;
      case '--state':    out.state = v; i++; break;
      case '--batch':    out.batch = Math.max(1, Math.min(200, parseInt(v, 10))); i++; break;
      case '--max-bytes': out.maxBytes = Math.max(1024, parseInt(v, 10)); i++; break;
      case '--dry-run':  out.dryRun = true; break;
      case '--help':
      case '-h':
        printHelpAndExit();
      default:
        if (k.startsWith('--')) {
          console.error(`Unknown flag: ${k}`);
          printHelpAndExit(1);
        }
    }
  }
  return out;
}

function printHelpAndExit(code = 0) {
  console.log(`sync-obsidian — sincroniza vault Obsidian → Youli MemoryEngine

Uso:
  node scripts/sync-obsidian.mjs --vault <PATH> --api <URL> --cookie <COOKIE>

Flags:
  --vault     path local do vault              (ou env YOULI_VAULT_PATH)
  --api       URL base da API                  (ou env YOULI_API_URL,        default http://localhost:3002)
  --cookie    "youli_session=<token>"          (ou env YOULI_SYNC_COOKIE)
  --state     arquivo de estado                (ou env YOULI_SYNC_STATE_PATH, default ~/.youli-obsidian-sync.json)
  --batch     notas por requisição             (default 50, max 200)
  --max-bytes tamanho máx por nota             (default 200000 bytes)
  --dry-run   simula sem enviar
  --help      mostra esta mensagem
`);
  process.exit(code);
}

// ---------- Frontmatter parsing (YAML simples) ----------

function parseFrontmatter(raw) {
  if (!raw.startsWith('---\n') && !raw.startsWith('---\r\n')) {
    return { meta: {}, body: raw };
  }
  const end = raw.indexOf('\n---', 4);
  if (end < 0) return { meta: {}, body: raw };
  const block = raw.slice(4, end);
  const body = raw.slice(end + 4).replace(/^\r?\n/, '');

  const meta = {};
  let currentListKey = null;
  for (const lineRaw of block.split(/\r?\n/)) {
    const line = lineRaw;
    if (currentListKey) {
      const m = line.match(/^\s*-\s+(.+?)\s*$/);
      if (m) {
        meta[currentListKey] = meta[currentListKey] || [];
        meta[currentListKey].push(stripQuotes(m[1]));
        continue;
      }
      currentListKey = null;
    }
    const kv = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const val = kv[2].trim();
    if (!val) {
      currentListKey = key;
      continue;
    }
    if (val.startsWith('[') && val.endsWith(']')) {
      meta[key] = val
        .slice(1, -1)
        .split(',')
        .map((s) => stripQuotes(s.trim()))
        .filter(Boolean);
    } else {
      meta[key] = stripQuotes(val);
    }
  }
  return { meta, body };
}

function stripQuotes(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// ---------- File walker ----------

const IGNORED_DIRS = new Set(['.obsidian', '.trash', '.git', 'node_modules']);

async function walk(dir, baseDir, out = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORED_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) await walk(full, baseDir, out);
    else if (e.isFile() && e.name.endsWith('.md')) {
      out.push({ full, rel: path.relative(baseDir, full) });
    }
  }
  return out;
}

// ---------- State management ----------

async function loadState(statePath) {
  try {
    const raw = await fs.readFile(statePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { version: 1, files: {} };
  }
}

async function saveState(statePath, state) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(state, null, 2));
}

function sha256(s) {
  return createHash('sha256').update(s).digest('hex');
}

// ---------- API call ----------

async function postBatch({ api, cookie, vault, notes }) {
  const res = await fetch(`${api}/api/memory/sync-obsidian`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({ vault, notes }),
  });
  const ok = res.ok;
  let body = null;
  try { body = await res.json(); } catch {}
  return { ok, status: res.status, body };
}

// ---------- Main ----------

async function main() {
  const args = parseArgs(process.argv);
  const vault = args.vault || process.env.YOULI_VAULT_PATH;
  const api = args.api || process.env.YOULI_API_URL || 'http://localhost:3002';
  const cookie = args.cookie || process.env.YOULI_SYNC_COOKIE;
  const statePath =
    args.state || process.env.YOULI_SYNC_STATE_PATH || path.join(os.homedir(), '.youli-obsidian-sync.json');

  if (!vault) {
    console.error('ERRO: --vault é obrigatório (ou env YOULI_VAULT_PATH).');
    process.exit(2);
  }
  if (!args.dryRun && !cookie) {
    console.error('ERRO: --cookie é obrigatório fora de --dry-run (ou env YOULI_SYNC_COOKIE).');
    process.exit(2);
  }

  const vaultStat = await fs.stat(vault).catch(() => null);
  if (!vaultStat || !vaultStat.isDirectory()) {
    console.error(`ERRO: vault não encontrado: ${vault}`);
    process.exit(2);
  }

  console.log(`📂 Vault:  ${vault}`);
  console.log(`🌐 API:    ${api}`);
  console.log(`📝 State:  ${statePath}`);
  console.log(`📦 Batch:  ${args.batch}${args.dryRun ? '  (DRY RUN)' : ''}`);
  console.log('');

  const state = await loadState(statePath);
  const files = await walk(vault, vault);
  console.log(`🔍 ${files.length} arquivos .md encontrados`);

  const changed = [];
  let unchanged = 0;
  for (const f of files) {
    const raw = await fs.readFile(f.full, 'utf8');
    const trimmed = raw.length > args.maxBytes ? raw.slice(0, args.maxBytes) : raw;
    const hash = sha256(trimmed);
    if (state.files[f.rel]?.hash === hash) {
      unchanged++;
      continue;
    }
    const { meta, body } = parseFrontmatter(trimmed);
    if (!body.trim()) continue; // pula notas vazias

    const tags = Array.isArray(meta.tags)
      ? meta.tags
      : typeof meta.tags === 'string'
        ? meta.tags.split(/[, ]+/).filter(Boolean)
        : undefined;

    changed.push({
      externalId: f.rel,
      text: body,
      area: typeof meta.area === 'string' ? meta.area : undefined,
      tags,
      type: ['fact', 'pattern', 'event', 'preference'].includes(meta.type) ? meta.type : undefined,
      modifiedAt: new Date().toISOString(),
      _hash: hash, // só para state, removido antes do POST
    });
  }

  console.log(`✏️  ${changed.length} mudaram desde a última sync (${unchanged} inalterados)`);
  console.log('');

  if (args.dryRun) {
    for (const n of changed) {
      console.log(`[dry-run] ${n.externalId}  area=${n.area ?? '-'}  tags=${(n.tags ?? []).join(',')}`);
    }
    console.log(`\n✅ DRY-RUN concluído. Nenhum dado foi enviado.`);
    return;
  }

  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  const start = Date.now();

  // Envia em batches.
  for (let i = 0; i < changed.length; i += args.batch) {
    const slice = changed.slice(i, i + args.batch);
    const notes = slice.map(({ _hash, ...n }) => n);
    const { ok, status, body } = await postBatch({
      api,
      cookie,
      vault: path.basename(vault),
      notes,
    });

    if (!ok) {
      console.error(`❌ Batch ${i / args.batch + 1} falhou: HTTP ${status}`);
      if (body) console.error(JSON.stringify(body, null, 2));
      totalErrors += slice.length;
      continue;
    }

    const results = body?.results ?? [];
    const summary = body?.summary ?? {};
    totalCreated += summary.created ?? 0;
    totalUpdated += summary.updated ?? 0;
    totalSkipped += summary.skipped ?? 0;
    totalErrors  += summary.errors  ?? 0;

    for (const r of results) {
      const tag = r.action === 'created' ? '🆕' : r.action === 'updated' ? '🔄' : r.action === 'skipped' ? '⏭️ ' : '❌';
      console.log(`${tag} ${r.externalId}${r.error ? `  — ${r.error}` : ''}`);
      // Atualiza state somente em sucesso.
      if (r.action === 'created' || r.action === 'updated') {
        const original = slice.find((n) => n.externalId === r.externalId);
        if (original) {
          state.files[r.externalId] = {
            hash: original._hash,
            syncedAt: new Date().toISOString(),
          };
        }
      }
    }
  }

  await saveState(statePath, state);

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log('');
  console.log(`✅ Sync concluído em ${elapsed}s`);
  console.log(`   created=${totalCreated}  updated=${totalUpdated}  skipped=${totalSkipped}  errors=${totalErrors}`);
  console.log(`   state salvo em ${statePath}`);
}

main().catch((err) => {
  console.error('Erro fatal:', err);
  process.exit(1);
});
