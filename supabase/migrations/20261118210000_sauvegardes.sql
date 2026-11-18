-- Sauvegardes chiffrées automatiques (maquette du 18 novembre 2026). Le contenu est chiffré sur
-- l'appareil (AES-GCM, clé tirée d'un mot de passe qui ne quitte jamais l'appareil) : la base ne
-- garde qu'un texte illisible, son sel et son vecteur d'initialisation.

create table public.backups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  -- Taille du texte clair, en octets, pour l'afficher.
  taille integer not null check (taille >= 0),
  sel text not null,
  iv text not null,
  -- Texte chiffré, en base64 ; 20 Mo au plus.
  donnees text not null check (length(donnees) <= 20000000),
  -- « auto » : lancée à l'ouverture de l'application ; « manuelle » : bouton.
  origine text not null default 'manuelle' check (origine in ('auto', 'manuelle'))
);

create index backups_created_at_idx on public.backups (created_at desc);

alter table public.backups enable row level security;
create policy owner_all on public.backups for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.backups from anon;
grant select, insert, delete on public.backups to authenticated;
grant all on public.backups to service_role;
