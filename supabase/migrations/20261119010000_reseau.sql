-- Communautés (maquette du 18 novembre 2026) : les personnes rencontrées dans les communautés de
-- startups, et où en est l'échange avec elles.

create table public.network_contacts (
  id uuid primary key default gen_random_uuid(),
  nom text not null check (length(nom) between 1 and 200),
  startup text,
  role text,
  -- Adresse e-mail ou lien (LinkedIn, site).
  lien text,
  -- Où la personne a été trouvée : nom d'une communauté ou texte libre.
  origine text,
  statut text not null default 'a_contacter'
    check (statut in ('a_contacter', 'contacte', 'a_repondu')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.network_contacts enable row level security;
create policy owner_all on public.network_contacts for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.network_contacts from anon;
grant select, insert, update, delete on public.network_contacts to authenticated;
grant all on public.network_contacts to service_role;
