-- StageRadar — suivi des candidatures, zone « Important » et traduction des annonces

-- Traduction en français d'une annonce rédigée dans une autre langue que le français ou l'anglais :
--   { "langue": "ja", "titre": "...", "description": "...", "date": "AAAA-MM-JJ" }
-- Elle est produite par le navigateur (traducteur intégré à Chrome, sur l'appareil) puis enregistrée
-- ici, pour être relue sur les autres appareils. La collecte ne touche jamais à cette colonne.
alter table public.offers add column traduction jsonb;

-- Nombre de candidatures à envoyer par semaine (zone « Important »).
alter table public.settings
  add column objectif_hebdo smallint not null default 5 check (objectif_hebdo between 1 and 50);
