#!/usr/bin/env bash
# Applique, dans l'ordre, les migrations qui ne l'ont pas encore été.
# Le suivi utilise la même table que la CLI Supabase (supabase_migrations.schema_migrations),
# ce qui laisse la porte ouverte à un retour vers Supabase hébergé.
. "$(dirname "$0")/commun.sh"

sql -q <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

# Sur le serveur, deployer.mjs copie les migrations ici ; depuis le dépôt, on lit supabase/migrations.
dossier=migrations
if [ ! -d "$dossier" ]; then dossier=../../supabase/migrations; fi

for fichier in "$dossier"/*.sql; do
  [ -e "$fichier" ] || continue
  base="$(basename "$fichier" .sql)"
  version="${base%%_*}"
  nom="${base#*_}"
  if ! [[ "$version" =~ ^[0-9]{14}$ ]]; then
    echo "Nom de migration inattendu : $fichier (attendu : AAAAMMJJHHMMSS_nom.sql)" >&2
    exit 1
  fi

  deja="$(sql -tA -v version="$version" <<'SQL'
select count(*) from supabase_migrations.schema_migrations where version = :'version';
SQL
)"
  if [ "$deja" != "0" ]; then continue; fi

  echo "Migration $base"
  # Une transaction par fichier : une migration qui échoue ne laisse rien derrière elle.
  {
    cat "$fichier"
    printf "\ninsert into supabase_migrations.schema_migrations (version, name) values (:'version', :'nom');\n"
  } | sql -q --single-transaction -v version="$version" -v nom="$nom"
done

# PostgREST garde le schéma en cache : on lui demande de le relire.
sql -q <<'SQL'
notify pgrst, 'reload schema';
SQL
echo "Migrations à jour."
