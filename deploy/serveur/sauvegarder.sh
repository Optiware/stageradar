#!/usr/bin/env bash
# Sauvegarde complète de la base dans ./sauvegardes, lancée chaque nuit par cron.
# Restauration : voir le README (« Sauvegardes »).
. "$(dirname "$0")/commun.sh"

CONSERVER_JOURS=14
mkdir -p sauvegardes
chmod 700 sauvegardes

cible="sauvegardes/stageradar-$(date +%F).dump"
# supabase_admin est le super-utilisateur de l'image : lui seul voit tous les schémas.
compose exec -T db pg_dump -h 127.0.0.1 -U supabase_admin -d postgres -Fc >"$cible.partiel"
mv "$cible.partiel" "$cible"

find sauvegardes -name 'stageradar-*.dump' -mtime +"$CONSERVER_JOURS" -delete
echo "Sauvegarde écrite : $cible ($(du -h "$cible" | cut -f1))"
