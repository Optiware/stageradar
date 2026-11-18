-- Plusieurs contacts par entreprise (maquette du 18 novembre 2026) : recruteur, futur tuteur,
-- ancien stagiaire. Le contact principal est aussi recopié dans `companies.contact_*`, que les
-- messages de démarchage utilisent déjà.

create table public.company_contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  nom text not null check (length(nom) between 1 and 200),
  role text,
  email text,
  linkedin text,
  -- Code ISO 639-1 de la langue dans laquelle lui écrire.
  langue text,
  notes text,
  principal boolean not null default false,
  dernier_echange date,
  created_at timestamptz not null default now()
);

create index company_contacts_company_idx on public.company_contacts (company_id);
-- Un seul contact principal par entreprise.
create unique index company_contacts_principal_idx
  on public.company_contacts (company_id) where principal;

alter table public.company_contacts enable row level security;
create policy owner_all on public.company_contacts for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.company_contacts from anon;
grant select, insert, update, delete on public.company_contacts to authenticated;
grant all on public.company_contacts to service_role;

-- Le contact déjà noté sur une entreprise devient son contact principal.
insert into public.company_contacts (company_id, nom, email, linkedin, principal)
select id, contact_nom, contact_email, contact_linkedin, true
from public.companies
where nullif(trim(contact_nom), '') is not null;
