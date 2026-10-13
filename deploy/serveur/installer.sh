#!/usr/bin/env bash
# Installe ou met à jour StageRadar sur le serveur. Rejouable : chaque étape ne fait que ce qui manque.
# Lancé par `npm run deploy` (deploy/deployer.mjs), qui copie d'abord ce dossier sur le serveur.
#
#   DOMAINE=stageradar.exemple.fr PROPRIETAIRE_EMAIL=moi@exemple.fr ./installer.sh
#
# SANS_NGINX=1 s'arrête avant nginx et le certificat (essai sur un poste de développement).
. "$(dirname "$0")/commun.sh"

: "${DOMAINE:?Variable DOMAINE manquante}"
: "${PROPRIETAIRE_EMAIL:?Variable PROPRIETAIRE_EMAIL manquante}"
if ! [[ "$DOMAINE" =~ ^[a-z0-9]([a-z0-9.-]*[a-z0-9])?$ ]]; then
  echo "DOMAINE invalide : $DOMAINE" >&2
  exit 1
fi
if ! [[ "$PROPRIETAIRE_EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "PROPRIETAIRE_EMAIL invalide : $PROPRIETAIRE_EMAIL" >&2
  exit 1
fi

SITE_URL="https://$DOMAINE"
FICHIER_MOT_DE_PASSE="$RACINE/mot-de-passe-provisoire.txt"

b64url() {
  openssl base64 -A | tr '+/' '-_' | tr -d '='
}

# Jeton HS256 valable dix ans pour un rôle de l'API, comme les clés « anon » et « service_role »
# de Supabase : https://supabase.com/docs/guides/self-hosting/docker#generate-api-keys
jeton() {
  local role="$1" secret="$2" entete charge signature maintenant
  maintenant="$(date +%s)"
  entete="$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)"
  charge="$(printf '{"role":"%s","iss":"stageradar","iat":%s,"exp":%s}' \
    "$role" "$maintenant" "$((maintenant + 315360000))" | b64url)"
  signature="$(printf '%s.%s' "$entete" "$charge" |
    openssl dgst -sha256 -hmac "$secret" -binary | b64url)"
  printf '%s.%s.%s' "$entete" "$charge" "$signature"
}

# Secrets générés sur le serveur à la première installation : ils n'en sortent jamais,
# sauf la clé publique (ANON_KEY) qui est faite pour être embarquée dans le front.
creer_env() {
  if [ -f .env ]; then
    sed -i "s|^SITE_URL=.*|SITE_URL=$SITE_URL|" .env
    return
  fi
  local secret
  secret="$(openssl rand -hex 32)"
  (
    umask 077
    cat >.env <<EOF
# Généré par installer.sh. Ne pas committer, ne pas partager.
SITE_URL=$SITE_URL
PORT_AUTH=54331
PORT_REST=54332
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$secret
# Clé publique, embarquée dans le front (VITE_SUPABASE_KEY).
ANON_KEY=$(jeton anon "$secret")
# Clé secrète du collecteur : contourne la RLS.
SERVICE_ROLE_KEY=$(jeton service_role "$secret")
EOF
  )
  echo "Secrets générés dans $RACINE/.env"
}

demarrer() {
  compose pull --quiet
  compose up -d --wait --remove-orphans
  attendre "http://127.0.0.1:$PORT_AUTH/health"
  # GoTrue crée le schéma `auth` (dont auth.jwt(), utilisé par nos règles) à son démarrage.
  local essai
  for essai in $(seq 1 30); do
    if [ "$(sql -tA <<<"select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'auth' and p.proname = 'jwt';")" != "0" ]; then
      return 0
    fi
    sleep 1
  done
  echo "Le schéma auth n'est pas prêt." >&2
  return 1
}

# Déclare l'adresse propriétaire et crée son compte, avec un mot de passe provisoire aléatoire
# (à changer dans l'application : Plus > Compte).
creer_proprietaire() {
  sql -q -v email="$PROPRIETAIRE_EMAIL" <<'SQL'
insert into public.app_owner (email) values (:'email')
on conflict (id) do update set email = excluded.email;
SQL

  local existe
  existe="$(sql -tA -v email="$PROPRIETAIRE_EMAIL" <<'SQL'
select count(*) from auth.users where lower(email) = lower(:'email');
SQL
)"
  if [ "$existe" != "0" ]; then return; fi

  local brut mot_de_passe
  brut="$(openssl rand -hex 10)"
  mot_de_passe="${brut:0:5}-${brut:5:5}-${brut:10:5}-${brut:15:5}"
  curl -fsS -o /dev/null -X POST "http://127.0.0.1:$PORT_AUTH/admin/users" \
    -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$PROPRIETAIRE_EMAIL\",\"password\":\"$mot_de_passe\",\"email_confirm\":true}"
  (
    umask 077
    printf '%s\n' "$mot_de_passe" >"$FICHIER_MOT_DE_PASSE"
  )
  echo "Compte créé pour $PROPRIETAIRE_EMAIL. Mot de passe provisoire dans $FICHIER_MOT_DE_PASSE"
}

# Écrit la configuration nginx puis la valide. Si nginx la refuse, l'ancienne est remise en place :
# une configuration cassée empêcherait tous les sites du serveur de redémarrer.
installer_site() {
  local contenu="$1" site=/etc/nginx/sites-available/stageradar lien=/etc/nginx/sites-enabled/stageradar
  local ancien=""
  if [ -f "$site" ]; then
    ancien="$(mktemp)"
    cp "$site" "$ancien"
  fi
  printf '%s\n' "$contenu" >"$site"
  ln -sfn "$site" "$lien"
  if nginx -t 2>/tmp/stageradar-nginx.log; then
    systemctl reload nginx
    if [ -n "$ancien" ]; then rm -f "$ancien"; fi
    return 0
  fi
  cat /tmp/stageradar-nginx.log >&2
  if [ -n "$ancien" ]; then
    mv "$ancien" "$site"
  else
    rm -f "$site" "$lien"
  fi
  echo "Configuration nginx refusée : rien n'a été changé." >&2
  return 1
}

configurer_nginx() {
  mkdir -p /var/www/stageradar /var/www/certbot
  if [ ! -f /var/www/stageradar/index.html ]; then
    echo "<!doctype html><title>StageRadar</title><p>Installation en cours.</p>" \
      >/var/www/stageradar/index.html
  fi

  if [ ! -f "/etc/letsencrypt/live/$DOMAINE/fullchain.pem" ]; then
    # Premier passage : HTTP seul, le temps d'obtenir le certificat.
    installer_site "server {
    listen 80;
    listen [::]:80;
    server_name $DOMAINE;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 404; }
}"
    certbot certonly --webroot -w /var/www/certbot -d "$DOMAINE" \
      --non-interactive --agree-tos --register-unsafely-without-email \
      --deploy-hook 'systemctl reload nginx'
  fi

  installer_site "$(sed -e "s|__DOMAINE__|$DOMAINE|g" \
    -e "s|__PORT_AUTH__|$PORT_AUTH|g" \
    -e "s|__PORT_REST__|$PORT_REST|g" nginx.conf.modele)"
}

planifier() {
  cat >/etc/cron.d/stageradar <<EOF
# StageRadar — généré par installer.sh.
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
# Sauvegarde de la base chaque nuit à 3 h 15 (UTC).
15 3 * * * root $RACINE/sauvegarder.sh >>/var/log/stageradar-sauvegarde.log 2>&1
# Collecte des offres toutes les 6 heures (§2).
7 */6 * * * root $RACINE/collecter.sh >>/var/log/stageradar-collecte.log 2>&1
EOF
  chmod 644 /etc/cron.d/stageradar

  cat >/etc/logrotate.d/stageradar <<EOF
/var/log/stageradar-*.log {
  monthly
  rotate 3
  compress
  missingok
  notifempty
}
EOF
  chmod 644 /etc/logrotate.d/stageradar
}

# Le dossier contient les secrets : réservé à root. roles.sql est lu depuis le conteneur.
chmod 700 "$RACINE"
chmod +x ./*.sh
chmod 644 db/roles.sql
# Le collecteur tourne sans privilèges dans son conteneur : ses fichiers doivent lui être lisibles.
if [ -d collecteur ]; then chmod -R u=rwX,go=rX collecteur; fi
creer_env
charger_env
demarrer
./migrer.sh
creer_proprietaire

if [ "${SANS_NGINX:-}" = "1" ]; then
  echo "SANS_NGINX=1 : nginx, certificat et sauvegardes laissés de côté."
  exit 0
fi

configurer_nginx
planifier
echo "Installation terminée : $SITE_URL"
