-- Reproduit, pour les tests, le strict nécessaire de l'environnement Supabase :
-- rôles de l'API, schémas auth / extensions, et lecture du jeton dans request.jwt.claims.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists auth;
create schema if not exists extensions;

create function auth.jwt()
returns jsonb
language sql
stable
as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
$$;

grant usage on schema public, auth, extensions to anon, authenticated, service_role;
grant execute on function auth.jwt() to anon, authenticated, service_role;
