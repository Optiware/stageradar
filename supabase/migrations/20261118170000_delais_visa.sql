-- Délais visa par pays (maquette du 18 novembre 2026) : combien de jours avant le début du stage
-- chaque étape doit être faite, avec sa source. Les dates du calendrier en sont déduites.
-- [{ "etape": "...", "jours_avant": 90, "source": "...", "url": "https://...", "verifiee": "AAAA-MM-JJ" }]
alter table public.country_sheets add column delais_visa jsonb not null default '[]';
