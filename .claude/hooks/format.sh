#!/bin/sh
# Formate (oxfmt) puis corrige le lint simple (oxlint --fix) du fichier
# que Claude vient de modifier. Ne bloque jamais Claude : sort toujours en 0.

file=$(jq -r '.tool_input.file_path // empty')
[ -z "$file" ] && exit 0
[ -f "$file" ] || exit 0

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.css)
    pnpm -s oxfmt "$file" >/dev/null 2>&1
    ;;
esac

case "$file" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs)
    pnpm -s oxlint --fix "$file" >/dev/null 2>&1
    ;;
esac

exit 0
