-- Préparation d'entretien (maquette du 18 novembre 2026) : une fiche par candidature. Les notes
-- d'entretien restent dans `applications.notes_entretien`, déjà affichées ailleurs.

create table public.interview_preps (
  application_id uuid primary key references public.applications (id) on delete cascade,
  -- Cases cochées de la check-list : { "micro": true, ... }.
  checklist jsonb not null default '{}',
  -- Réponses préparées, par identifiant de question : { "umbc-1": "..." }.
  reponses jsonb not null default '{}',
  mes_questions text[] not null default '{}',
  impression text check (impression in ('bien', 'mitige', 'difficile')),
  prochaine_etape text,
  updated_at timestamptz not null default now()
);

alter table public.interview_preps enable row level security;
create policy owner_all on public.interview_preps for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.interview_preps from anon;
grant select, insert, update, delete on public.interview_preps to authenticated;
grant all on public.interview_preps to service_role;
