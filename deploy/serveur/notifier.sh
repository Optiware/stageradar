#!/usr/bin/env bash
# Envoie les notifications en attente (retenues pendant les heures calmes) et, s'il est l'heure,
# le résumé du jour. Appelé par cron chaque heure ; utilisable à la main :
#
#   ssh root@serveur /opt/stageradar/notifier.sh
. "$(dirname "$0")/commun.sh"

compose --profile collecte run --rm -T collecteur node collect.mjs --notifier
