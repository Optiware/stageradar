-- Portfolio (maquette du 18 novembre 2026) : mes projets, réutilisés par le CV, les lettres et la
-- préparation d'entretien, et le compte des technologies que demandent les offres collectées.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  titre text not null check (length(titre) between 1 and 200),
  description text not null default '',
  -- Noms tels que saisis (« Node.js », « PostgreSQL ») : la comparaison se fait sur leur forme
  -- normalisée, côté application.
  technologies text[] not null default '{}',
  statut text not null default 'en_cours' check (statut in ('en_cours', 'termine')),
  url_code text,
  url_demo text,
  -- Capture réduite sur l'appareil puis gardée en data URL : la politique de sécurité du site
  -- n'autorise pas les images d'autres domaines.
  image text check (image is null or (image like 'data:image/%' and length(image) <= 400000)),
  appris text not null default '',
  a_readme boolean not null default false,
  a_captures boolean not null default false,
  a_tests boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
create policy owner_all on public.projects for all to authenticated
  using ((select public.is_owner())) with check ((select public.is_owner()));
revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;

-- Nombre d'offres visibles (actives, ni masquées ni hors cible) qui citent chaque terme. Le texte
-- est normalisé comme `normalizeText` (minuscules, accents français retirés, ponctuation en
-- espaces, `+` et `#` gardés pour C++ et C#) : les termes reçus sont déjà sous cette forme.
-- Les droits sont ceux de l'appelant : la RLS des offres s'applique.
create function public.technologies_demandees(termes text[])
returns table (terme text, nombre integer)
language sql
stable
security invoker
set search_path = ''
as $$
  with textes as (
    select ' ' || regexp_replace(
      translate(
        lower(o.titre || ' ' || coalesce(o.description, '') || ' ' || array_to_string(o.competences, ' ')),
        'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ',
        'aaaaaaceeeeiiiinooooouuuuyyoa'
      ),
      '[^a-z0-9+#]+', ' ', 'g'
    ) || ' ' as texte
    from public.offers o
    where o.actif and not o.masquee and o.exclue_raison is null
  )
  select t.terme, count(*)::integer as nombre
  from unnest(termes) as t (terme)
  join textes on position(' ' || t.terme || ' ' in textes.texte) > 0
  group by t.terme
  order by nombre desc, t.terme;
$$;

revoke all on function public.technologies_demandees(text[]) from public, anon;
grant execute on function public.technologies_demandees(text[]) to authenticated;
