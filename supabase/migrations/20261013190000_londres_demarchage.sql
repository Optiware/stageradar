-- StageRadar — Londres parmi les destinations de stage, et démarchage d'entreprises

-- Londres (Royaume-Uni) rejoint les pays visés, en dernier choix : l'ordre se règle ensuite dans
-- les Réglages. Sans effet si le pays y est déjà.
update public.settings
set profil = jsonb_set(profil, '{stage,pays}', (profil #> '{stage,pays}') || '"GB"'::jsonb)
where not (profil #> '{stage,pays}') ? 'GB';

-- Texte de présentation repris dans les messages aux entreprises (écran « Démarchage »).
alter table public.settings add column presentation text not null default '';

insert into public.country_sheets (pays, nom, contenu_md, liens, statut)
values (
  'GB',
  'Royaume-Uni (Londres)',
  $$Aucune règle n'a encore été vérifiée pour un stage à Londres.

• Depuis la sortie du Royaume-Uni de l'Union européenne, un Français a besoin d'une autorisation pour y travailler ou y faire un stage : le type de visa et le rôle de l'entreprise d'accueil sont à relever sur gov.uk.
• La page « Government Authorised Exchange » de gov.uk décrit un visa de travail temporaire lié à des programmes d'échange agréés : à lire pour savoir s'il s'applique à un stage d'été.

À faire : lire les deux pages officielles, puis noter ici le visa qui s'applique et la date de vérification.$$,
  '[
    {"libelle": "gov.uk : visas de travail", "url": "https://www.gov.uk/browse/visas-immigration/work-visas", "officiel": true},
    {"libelle": "gov.uk : Government Authorised Exchange", "url": "https://www.gov.uk/government-authorised-exchange", "officiel": true},
    {"libelle": "France Diplomatie : Royaume-Uni", "url": "https://www.diplomatie.gouv.fr/fr/information-par-pays/royaume-uni", "officiel": true}
  ]'::jsonb,
  'a_verifier'
)
on conflict (pays) do nothing;

-- Entreprises cibles : de quoi les contacter. Une candidature spontanée se suit ensuite dans le
-- tableau « Suivi » (applications.company_id).
alter table public.companies
  add column site text,
  add column contact_nom text,
  add column contact_email text,
  add column contact_linkedin text;
