-- StageRadar — schéma initial (Lot 0)
-- Application mono-utilisateur : toutes les tables sont réservées au propriétaire
-- (table app_owner) via la Row Level Security. Le collecteur écrit avec la clé
-- secrète (rôle service_role), qui contourne la RLS.

create schema if not exists extensions;
-- Similarité par trigrammes pour le dédoublonnage (§4.4).
create extension if not exists pg_trgm with schema extensions;

-- ---------------------------------------------------------------------------
-- Propriétaire unique
-- ---------------------------------------------------------------------------

-- Une seule ligne : l'adresse e-mail autorisée à utiliser l'application.
-- À renseigner une fois dans l'éditeur SQL de Supabase (voir README).
create table public.app_owner (
  id boolean primary key default true check (id),
  email text not null
);

-- Aucune policy : la table n'est lisible que par is_owner() et par le tableau de bord.
alter table public.app_owner enable row level security;
revoke all on public.app_owner from anon, authenticated;

-- Vrai si l'utilisateur connecté est le propriétaire. L'e-mail du jeton est fiable :
-- il a été prouvé par le lien magique.
create function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_owner o
    where lower(o.email) = lower(auth.jwt() ->> 'email')
  );
$$;

revoke all on function public.is_owner() from public, anon;
grant execute on function public.is_owner() to authenticated, service_role;

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Offres
-- ---------------------------------------------------------------------------

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  -- Source d'origine ; les autres liens vers la même offre sont dans offer_sources.
  source text not null,
  source_id text not null,
  url text not null,
  url_canonique text,
  titre text not null,
  entreprise text,
  pays text check (pays ~ '^[A-Z]{2}$'),
  ville text,
  teletravail text check (teletravail in ('sur_site', 'hybride', 'remote')),
  type text not null check (type in ('alternance', 'stage', 'autre')),
  contrat text,
  domaines text[] not null default '{}' check (domaines <@ array['dev', 'cyber', 'devops']),
  date_debut date,
  duree_semaines integer check (duree_semaines > 0),
  remuneration_texte text,
  remuneration_montant numeric,
  remuneration_devise text,
  langues_requises text[] not null default '{}',
  niveau_etudes text,
  description text,
  competences text[] not null default '{}',
  date_publication timestamptz,
  date_collecte timestamptz not null default now(),
  date_expiration timestamptz,
  score smallint check (score between 0 and 100),
  score_details jsonb not null default '[]',
  -- Formes normalisées et empreinte utilisées par le dédoublonnage.
  titre_norm text not null default '',
  entreprise_norm text not null default '',
  hash_dedup text,
  periode_compatible boolean,
  -- Renseigné quand l'offre est masquée par défaut (Bac+5, expérience exigée, hors domaine).
  exclue_raison text,
  actif boolean not null default true,
  -- État propre à l'utilisateur.
  masquee boolean not null default false,
  vue_le timestamptz,
  notes text,
  recherche tsvector generated always as (
    to_tsvector(
      'simple'::regconfig,
      coalesce(titre, '') || ' ' || coalesce(entreprise, '') || ' ' ||
      coalesce(ville, '') || ' ' || coalesce(description, '')
    )
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index offers_fil_idx on public.offers (actif, masquee, type, score desc);
create index offers_pays_idx on public.offers (pays);
create index offers_url_canonique_idx on public.offers (url_canonique);
create index offers_hash_dedup_idx on public.offers (hash_dedup);
create index offers_recherche_idx on public.offers using gin (recherche);
create index offers_titre_trgm_idx on public.offers using gin (titre_norm extensions.gin_trgm_ops);
create index offers_entreprise_trgm_idx on public.offers using gin (entreprise_norm extensions.gin_trgm_ops);

create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();

-- Une offre fusionnée garde un lien par source où elle a été vue (§4.4),
-- et le compteur d'absences par source pilote le cycle de vie (§4.5).
create table public.offer_sources (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  source text not null,
  source_id text not null,
  url text not null,
  -- Mention exigée par la source (France Travail, Adzuna…).
  attribution text,
  premiere_vue timestamptz not null default now(),
  derniere_vue timestamptz not null default now(),
  absences_consecutives integer not null default 0,
  unique (source, source_id)
);

create index offer_sources_offer_idx on public.offer_sources (offer_id);

-- ---------------------------------------------------------------------------
-- Entreprises cibles, documents, suivi
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  nom_norm text not null default '',
  pays text check (pays ~ '^[A-Z]{2}$'),
  ville text,
  ats text,
  slug text,
  url_carriere text,
  origine text not null default 'manuel' check (origine in ('watchlist', 'lba', 'manuel')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('cv', 'lettre', 'autre')),
  langue text,
  titre text not null,
  version integer not null default 1,
  -- Chemin du fichier dans Supabase Storage.
  chemin_stockage text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  -- Une offre suivie ne peut pas être supprimée ; candidature spontanée = company_id seul.
  offer_id uuid unique references public.offers (id) on delete restrict,
  company_id uuid references public.companies (id) on delete restrict,
  statut text not null default 'a_etudier' check (
    statut in ('a_etudier', 'a_postuler', 'postule', 'relance', 'entretien', 'offre', 'refus')
  ),
  -- Ordre de la carte dans sa colonne du Kanban.
  position double precision not null default 0,
  date_candidature date,
  cv_document_id uuid references public.documents (id) on delete set null,
  lettre_document_id uuid references public.documents (id) on delete set null,
  contact_nom text,
  contact_email text,
  notes text,
  notes_entretien text,
  prochaine_relance date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (offer_id is not null or company_id is not null)
);

create index applications_statut_idx on public.applications (statut, position);

create trigger applications_set_updated_at
  before update on public.applications
  for each row execute function public.set_updated_at();

-- Historique et échéances : alimente le calendrier et les statistiques.
create table public.events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid references public.applications (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete cascade,
  type text not null check (type in ('statut', 'relance', 'entretien', 'echeance', 'note')),
  titre text not null,
  date timestamptz not null default now(),
  pays text check (pays ~ '^[A-Z]{2}$'),
  details jsonb not null default '{}',
  fait boolean not null default false,
  created_at timestamptz not null default now()
);

create index events_date_idx on public.events (date);
create index events_application_idx on public.events (application_id);

-- ---------------------------------------------------------------------------
-- Fiches pays, santé des sources, réglages, notifications
-- ---------------------------------------------------------------------------

create table public.country_sheets (
  pays text primary key check (pays ~ '^[A-Z]{2}$'),
  nom text not null,
  contenu_md text not null default '',
  -- [{ "libelle": "...", "url": "...", "officiel": true }]
  liens jsonb not null default '[]',
  -- [{ "libelle": "...", "date": "AAAA-MM-JJ", "source": "..." }]
  echeances jsonb not null default '[]',
  statut text not null default 'a_verifier' check (statut in ('verifie', 'a_verifier')),
  derniere_verification date,
  updated_at timestamptz not null default now()
);

create trigger country_sheets_set_updated_at
  before update on public.country_sheets
  for each row execute function public.set_updated_at();

-- Une ligne par connecteur et par collecte (§5.4).
create table public.sources_status (
  id bigint generated always as identity primary key,
  source text not null,
  run_id text not null,
  debut timestamptz not null,
  fin timestamptz,
  statut text not null check (statut in ('ok', 'partiel', 'erreur')),
  nb_offres integer not null default 0,
  nb_nouvelles integer not null default 0,
  erreurs jsonb not null default '[]'
);

create index sources_status_source_idx on public.sources_status (source, debut desc);

-- Une seule ligne : profil, mots-clés, poids du score, préférences de notification.
create table public.settings (
  id boolean primary key default true check (id),
  profil jsonb not null default '{}',
  mots_cles jsonb not null default '{}',
  poids jsonb not null default '{}',
  notifications jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Valeurs par défaut du cahier des charges (§1, §4.3, §5.3), modifiables dans les Réglages.
insert into public.settings (profil, poids, notifications)
values (
  '{
    "alternance": { "rentree": "2027-09-01", "villes": [], "rayon_km": 30, "rythme": null },
    "stage": { "debut": "2027-06-01", "fin": "2027-08-31", "pays": ["JP", "KR", "CO", "CA"] },
    "langues": []
  }',
  '{ "domaine": 30, "periode": 20, "pays": 15, "niveau": 15, "langue": 10, "fraicheur": 10 }',
  '{
    "seuil_push": 75,
    "resume_quotidien": { "actif": true, "heure": "19:00", "fuseau": "Europe/Paris" },
    "heures_calmes": { "debut": "22:00", "fin": "08:00" }
  }'
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  appareil text,
  created_at timestamptz not null default now()
);

-- Notifications différées (heures calmes, résumé quotidien).
create table public.notification_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  payload jsonb not null,
  a_envoyer_apres timestamptz not null default now(),
  envoyee_le timestamptz,
  created_at timestamptz not null default now()
);

create index notification_queue_attente_idx
  on public.notification_queue (a_envoyer_apres)
  where envoyee_le is null;

-- ---------------------------------------------------------------------------
-- Row Level Security : tout est réservé au propriétaire
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'offers', 'offer_sources', 'companies', 'documents', 'applications', 'events',
    'country_sheets', 'sources_status', 'settings', 'push_subscriptions', 'notification_queue'
  ]
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
