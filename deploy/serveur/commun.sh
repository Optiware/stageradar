#!/usr/bin/env bash
# Fonctions partagées par les scripts du serveur (installer.sh, migrer.sh, sauvegarder.sh).
set -euo pipefail

RACINE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$RACINE"

charger_env() {
  set -a
  # shellcheck disable=SC1091
  . "$RACINE/.env"
  set +a
}

compose() {
  docker compose --project-directory "$RACINE" "$@"
}

# psql dans le conteneur, avec le rôle `postgres` : celui qu'utilise Supabase pour les migrations.
# Le SQL se passe sur l'entrée standard (les variables `-v` ne sont pas remplacées avec `-c`).
sql() {
  compose exec -T db psql -h 127.0.0.1 -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"
}

# Attend qu'une adresse locale réponde (60 s au plus).
attendre() {
  local url="$1" essai
  for essai in $(seq 1 60); do
    if curl -fsS -o /dev/null "$url"; then return 0; fi
    sleep 1
  done
  echo "Pas de réponse de $url après 60 s." >&2
  return 1
}
