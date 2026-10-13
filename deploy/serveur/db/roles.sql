-- Exécuté une seule fois, à la création de la base.
-- Repris de https://github.com/supabase/supabase/blob/master/docker/volumes/db/roles.sql
-- (limité aux rôles réellement utilisés ici).
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
