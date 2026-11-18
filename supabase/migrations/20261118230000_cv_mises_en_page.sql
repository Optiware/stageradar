-- Éditeur de CV (maquette du 18 novembre 2026) : la mise en page enregistrée pour chaque pays et
-- chaque offre ciblée, sous la clé « PAYS:offre » (« JP:general » sans offre).
alter table public.settings add column cv_mises_en_page jsonb not null default '{}';
