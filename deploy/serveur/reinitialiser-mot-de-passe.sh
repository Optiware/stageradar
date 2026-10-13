#!/usr/bin/env bash
# Mot de passe oublié : en tire un nouveau pour le compte propriétaire.
# Sans serveur d'envoi d'e-mails, c'est le seul moyen de récupérer l'accès.
#
#   ssh root@serveur /opt/stageradar/reinitialiser-mot-de-passe.sh
. "$(dirname "$0")/commun.sh"
charger_env

identifiant="$(sql -tA <<'SQL'
select u.id from auth.users u join public.app_owner o on lower(o.email) = lower(u.email);
SQL
)"
if [ -z "$identifiant" ]; then
  echo "Aucun compte ne correspond à l'adresse propriétaire." >&2
  exit 1
fi

brut="$(openssl rand -hex 10)"
mot_de_passe="${brut:0:5}-${brut:5:5}-${brut:10:5}-${brut:15:5}"
curl -fsS -o /dev/null -X PUT "http://127.0.0.1:$PORT_AUTH/admin/users/$identifiant" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$mot_de_passe\"}"

echo "Nouveau mot de passe : $mot_de_passe"
echo "À changer ensuite dans l'application : Plus > Compte."
