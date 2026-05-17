#!/usr/bin/env bash
set -euo pipefail

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Erro: rode dentro de um repositório git."
  exit 1
fi

usage() {
  cat <<'USAGE'
Uso:
  scripts/obsidian_sync_suggest.sh [--since "<data>"] [--range "<A..B>"]

Opções:
  --since   Período para capturar commits (default: hoje 00:00).
  --range   Range de revisão para diff (ex: origin/main..HEAD). Substitui --since.
USAGE
}

since=""
range=""
while [[ $# -gt 0 ]]; do
  case "${1}" in
    --since)
      since="${2:-}"
      shift 2
      ;;
    --range)
      range="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: ${1}"
      usage
      exit 2
      ;;
  esac
done

today_midnight="$(date +%Y-%m-%d) 00:00"
if [[ -z "${since}" ]]; then
  since="${today_midnight}"
fi

echo "== Arquivos alterados (git status) =="
git status --short

echo
echo "== Sugestão de atualização no segundo cérebro =="

affected_worktree="$(git status --porcelain | awk '{print $2}')"
affected_commits=""

if [[ -n "${range}" ]]; then
  echo "(inclui commits via range: ${range})"
  affected_commits="$(git diff --name-only "${range}" || true)"
else
  echo "(inclui commits desde: ${since})"
  affected_commits="$(git log --since="${since}" --pretty=format: --name-only || true)"
fi

affected_all="$(printf '%s\n%s\n' "${affected_worktree}" "${affected_commits}" | sed '/^$/d' | sort -u)"

if [ -z "${affected_all}" ]; then
  echo "Nenhuma mudança encontrada (working tree limpo e sem commits no período)."
  exit 0
fi

while IFS= read -r f; do
  case "$f" in
    *README*|*ARCHITECTURE*|*AGENTS*|*DEPLOY*)
      echo "- Atualizar Overview/Architecture/References por causa de: $f"
      ;;
    docs/stories/*|*story-*.md)
      echo "- Atualizar Stories/Roadmap por causa de: $f"
      ;;
    src/app/api/*|apps/api/*|api/*)
      echo "- Atualizar Modules + Operations (APIs) por causa de: $f"
      ;;
    src/app/*|apps/mobile/*|src/components/*)
      echo "- Atualizar Modules (UI/UX) por causa de: $f"
      ;;
    prisma/*|supabase/*|*schema*)
      echo "- Atualizar Architecture + Operations (dados/migrations) por causa de: $f"
      ;;
    scripts/*)
      echo "- Atualizar Operations/Runbooks por causa de: $f"
      ;;
    *)
      echo "- Revisar se precisa nota no segundo cérebro: $f"
      ;;
  esac
done <<< "${affected_all}"
