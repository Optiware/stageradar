-- StageRadar — logement et budget (Lot 8)

-- Logements repérés à la main : l'application ne collecte aucune annonce de logement.
create table public.housings (
  id uuid primary key default gen_random_uuid(),
  pays text not null check (pays ~ '^[A-Z]{2}$'),
  ville text,
  titre text not null,
  url text,
  -- Loyer mensuel, dans la devise locale.
  prix_mensuel numeric check (prix_mensuel >= 0),
  devise text check (devise ~ '^[A-Z]{3}$'),
  quartier text,
  -- Temps de trajet jusqu'au lieu du stage, en minutes.
  trajet_min integer check (trajet_min >= 0),
  statut text not null default 'repere' check (
    statut in ('repere', 'contacte', 'visite', 'retenu', 'ecarte')
  ),
  notes text,
  created_at timestamptz not null default now()
);

create index housings_pays_idx on public.housings (pays);

-- Budget estimé par pays : des lignes saisies par l'utilisateur, jamais des chiffres fournis
-- par l'application.
--   lignes : [{ "libelle": "Loyer", "montant": 80000, "ponctuel": false }]
-- Une ligne ponctuelle (billet d'avion, visa, caution) n'est comptée qu'une fois.
create table public.budgets (
  pays text primary key check (pays ~ '^[A-Z]{2}$'),
  devise text not null default 'EUR' check (devise ~ '^[A-Z]{3}$'),
  lignes jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- Comme toutes les tables : réservées au propriétaire.
do $$
declare
  t text;
begin
  foreach t in array array['housings', 'budgets']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy owner_all on public.%I for all to authenticated '
      'using ((select public.is_owner())) with check ((select public.is_owner()))',
      t
    );
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end;
$$;
