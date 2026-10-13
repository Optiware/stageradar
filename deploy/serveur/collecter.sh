#!/usr/bin/env bash
# Lance une collecte des offres. Appelé par cron toutes les 6 heures ; utilisable à la main :
#
#   ssh root@serveur /opt/stageradar/collecter.sh
#   ssh root@serveur /opt/stageradar/collecter.sh --a-blanc --source moloco
. "$(dirname "$0")/commun.sh"

# Une seule collecte à la fois : si la précédente tourne encore, celle-ci est abandonnée.
exec 9>"$RACINE/.collecte.verrou"
if ! flock -n 9; then
  echo "$(date -Is) Une collecte est déjà en cours."
  exit 0
fi

echo "$(date -Is) Début de la collecte"
compose --profile collecte run --rm -T collecteur node collect.mjs "$@"
echo "$(date -Is) Fin de la collecte"
