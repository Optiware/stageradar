-- StageRadar — enregistrement des offres collectées (Lot 3)
-- Le collecteur appelle ces fonctions avec la clé secrète (rôle service_role) : le dédoublonnage
-- (§4.4) et le cycle de vie (§4.5) se font en base, dans une transaction par offre.

-- Collecte au cours de laquelle ce lien a été vu pour la dernière fois.
alter table public.offer_sources add column dernier_run text;

-- Enregistre une offre normalisée et notée. Renvoie son identifiant, et `nouvelle = true`
-- si elle n'était pas encore connue.
--
-- Recherche d'une offre existante, dans cet ordre :
--   1. le même lien (source, source_id) ;
--   2. la même URL canonique ;
--   3. la même empreinte entreprise + titre + ville ;
--   4. un titre et une entreprise très proches (trigrammes), dans le même pays et la même ville.
-- Les étapes 2 à 4 ne rapprochent que des sources différentes : deux annonces distinctes d'une
-- même source restent deux offres.
create function public.ingest_offer(o jsonb, p_run_id text)
returns table (offer_id uuid, nouvelle boolean)
language plpgsql
set search_path = ''
as $$
declare
  r public.offers := jsonb_populate_record(null::public.offers, o);
  v_attribution text := o ->> 'attribution';
  v_id uuid;
  v_meme_source boolean := false;
  v_nouvelle boolean := false;
  v_hash text;
begin
  if r.source is null or r.source_id is null or r.url is null or r.titre is null then
    raise exception 'offre incomplète : source, source_id, url et titre sont obligatoires';
  end if;

  r.titre_norm := coalesce(r.titre_norm, '');
  r.entreprise_norm := coalesce(r.entreprise_norm, '');
  if r.entreprise_norm <> '' and r.titre_norm <> '' then
    v_hash := md5(r.entreprise_norm || '|' || r.titre_norm || '|' || lower(coalesce(r.ville, '')));
  end if;

  select s.offer_id into v_id
  from public.offer_sources s
  where s.source = r.source and s.source_id = r.source_id;
  v_meme_source := v_id is not null;

  if v_id is null and r.url_canonique is not null then
    select f.id into v_id
    from public.offers f
    where f.url_canonique = r.url_canonique
      and not exists (
        select 1 from public.offer_sources s where s.offer_id = f.id and s.source = r.source
      )
    limit 1;
  end if;

  if v_id is null and v_hash is not null then
    select f.id into v_id
    from public.offers f
    where f.hash_dedup = v_hash
      and f.pays is not distinct from r.pays
      and not exists (
        select 1 from public.offer_sources s where s.offer_id = f.id and s.source = r.source
      )
    limit 1;
  end if;

  if v_id is null and v_hash is not null then
    select f.id into v_id
    from public.offers f
    where f.pays is not distinct from r.pays
      and lower(coalesce(f.ville, '')) = lower(coalesce(r.ville, ''))
      and f.type = r.type
      -- 0,6 : « exemple » et « exemple inc » sont la même entreprise.
      and extensions.similarity(f.entreprise_norm, r.entreprise_norm) >= 0.6
      and extensions.similarity(f.titre_norm, r.titre_norm) >= 0.75
      and not exists (
        select 1 from public.offer_sources s where s.offer_id = f.id and s.source = r.source
      )
    order by extensions.similarity(f.titre_norm, r.titre_norm) desc
    limit 1;
  end if;

  if v_id is null then
    insert into public.offers (
      source, source_id, url, url_canonique, titre, entreprise, pays, ville, teletravail, type,
      contrat, domaines, date_debut, duree_semaines, remuneration_texte, remuneration_montant,
      remuneration_devise, langues_requises, niveau_etudes, description, competences,
      date_publication, date_expiration, score, score_details, titre_norm, entreprise_norm,
      hash_dedup, periode_compatible, exclue_raison
    ) values (
      r.source, r.source_id, r.url, r.url_canonique, r.titre, r.entreprise, r.pays, r.ville,
      r.teletravail, r.type, r.contrat, coalesce(r.domaines, '{}'), r.date_debut, r.duree_semaines,
      r.remuneration_texte, r.remuneration_montant, r.remuneration_devise,
      coalesce(r.langues_requises, '{}'), r.niveau_etudes, r.description,
      coalesce(r.competences, '{}'), r.date_publication, r.date_expiration, r.score,
      coalesce(r.score_details, '[]'), r.titre_norm, r.entreprise_norm, v_hash,
      r.periode_compatible, r.exclue_raison
    )
    returning id into v_id;
    v_nouvelle := true;
  elsif v_meme_source and exists (
    select 1 from public.offers f where f.id = v_id and f.source = r.source and f.source_id = r.source_id
  ) then
    -- La source d'origine fait foi : ses champs sont rafraîchis. L'état propre à l'utilisateur
    -- (masquée, vue, notes) n'est jamais touché.
    update public.offers f set
      url = r.url, url_canonique = r.url_canonique, titre = r.titre, entreprise = r.entreprise,
      pays = r.pays, ville = r.ville, teletravail = r.teletravail, type = r.type,
      contrat = r.contrat, domaines = coalesce(r.domaines, '{}'), date_debut = r.date_debut,
      duree_semaines = r.duree_semaines, remuneration_texte = r.remuneration_texte,
      remuneration_montant = r.remuneration_montant, remuneration_devise = r.remuneration_devise,
      langues_requises = coalesce(r.langues_requises, '{}'), niveau_etudes = r.niveau_etudes,
      description = r.description, competences = coalesce(r.competences, '{}'),
      date_publication = coalesce(r.date_publication, f.date_publication),
      date_expiration = r.date_expiration, score = r.score,
      score_details = coalesce(r.score_details, '[]'), titre_norm = r.titre_norm,
      entreprise_norm = r.entreprise_norm, hash_dedup = v_hash,
      periode_compatible = r.periode_compatible, exclue_raison = r.exclue_raison,
      date_collecte = now(), actif = true
    where f.id = v_id;
  else
    -- Doublon venu d'une autre source : on complète seulement ce qui manquait.
    update public.offers f set
      description = coalesce(f.description, r.description),
      date_debut = coalesce(f.date_debut, r.date_debut),
      duree_semaines = coalesce(f.duree_semaines, r.duree_semaines),
      remuneration_texte = coalesce(f.remuneration_texte, r.remuneration_texte),
      remuneration_montant = coalesce(f.remuneration_montant, r.remuneration_montant),
      remuneration_devise = coalesce(f.remuneration_devise, r.remuneration_devise),
      date_expiration = coalesce(f.date_expiration, r.date_expiration),
      date_collecte = now(), actif = true
    where f.id = v_id;
  end if;

  insert into public.offer_sources as s (offer_id, source, source_id, url, attribution, dernier_run)
  values (v_id, r.source, r.source_id, r.url, v_attribution, p_run_id)
  on conflict (source, source_id) do update set
    url = excluded.url,
    attribution = excluded.attribution,
    derniere_vue = now(),
    absences_consecutives = 0,
    dernier_run = excluded.dernier_run;

  return query select v_id, v_nouvelle;
end;
$$;

-- À appeler quand une source a été lue en entier : compte une absence pour chacun de ses liens
-- non revus pendant cette collecte, et désactive les offres absentes trois fois de suite de
-- toutes leurs sources (§4.5). Rien n'est supprimé : une offre suivie reste dans le suivi.
-- Renvoie le nombre d'offres désactivées.
create function public.close_source_run(p_source text, p_run_id text)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_desactivees integer;
begin
  update public.offer_sources s
  set absences_consecutives = s.absences_consecutives + 1
  where s.source = p_source and s.dernier_run is distinct from p_run_id;

  update public.offers f
  set actif = false
  where f.actif
    and exists (select 1 from public.offer_sources s where s.offer_id = f.id and s.source = p_source)
    and not exists (
      select 1 from public.offer_sources s where s.offer_id = f.id and s.absences_consecutives < 3
    );
  get diagnostics v_desactivees = row_count;
  return v_desactivees;
end;
$$;

revoke all on function public.ingest_offer(jsonb, text) from public, anon, authenticated;
revoke all on function public.close_source_run(text, text) from public, anon, authenticated;
grant execute on function public.ingest_offer(jsonb, text) to service_role;
grant execute on function public.close_source_run(text, text) to service_role;
