#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PRETTIER="./node_modules/.bin/prettier"
ESLINT="./node_modules/.bin/eslint"

collect_changed() {
  {
    git diff --name-only --diff-filter=d HEAD 2>/dev/null || true
    git diff --cached --name-only --diff-filter=d 2>/dev/null || true
    git ls-files --others --exclude-standard 2>/dev/null || true
  } | sort -u
}

PRETTIER_FILES=()
LINT_FILES=()

while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.css|*.json|*.md)
      PRETTIER_FILES+=("$file")
      ;;
  esac
  case "$file" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
      LINT_FILES+=("$file")
      ;;
  esac
done < <(collect_changed)

pids=()
fail=0

if [ "${#PRETTIER_FILES[@]}" -gt 0 ]; then
  echo "Prettier (changed files)..."
  "$PRETTIER" --write "${PRETTIER_FILES[@]}" &
  pids+=($!)
fi

if [ "${#LINT_FILES[@]}" -gt 0 ]; then
  echo "ESLint (changed files)..."
  "$ESLINT" --cache --cache-location .eslintcache "${LINT_FILES[@]}" &
  pids+=($!)
fi

if [ "${#PRETTIER_FILES[@]}" -eq 0 ] && [ "${#LINT_FILES[@]}" -eq 0 ]; then
  echo "No changed source files — skipping Prettier/ESLint."
fi

echo "Tests and build (parallel)..."
npm run test:run &
pids+=($!)
npm run build &
pids+=($!)

for pid in "${pids[@]}"; do
  if ! wait "$pid"; then
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  exit 1
fi

echo "Verify passed."
