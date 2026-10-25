-- StageRadar — générateur de CV

-- Profil d'où partent les CV de chaque pays (voir packages/shared/src/cv.ts) : identité,
-- expériences, formations, compétences, chaque texte dans les langues du CV (fr, en, es).
-- Il vit avec les réglages : il est donc compris dans la sauvegarde et le réimport.
alter table public.settings add column cv jsonb not null default '{}';
