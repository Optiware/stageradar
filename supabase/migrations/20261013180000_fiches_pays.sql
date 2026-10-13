-- StageRadar — contenu de départ des fiches pays (Lot 3, §5.2)
--
-- Aucune règle de visa n'est affirmée ici : chaque fiche reprend les points relevés dans le cahier
-- des charges, signalés comme non confirmés, et part avec le statut « à vérifier ». Les liens sont
-- ceux d'organismes officiels dont l'adresse répondait le 13 octobre 2026. La fiche se corrige
-- ensuite dans l'application (écran « Pays »), qui enregistre la date de vérification.

insert into public.country_sheets (pays, nom, contenu_md, liens, statut)
values
  (
    'JP',
    'Japon',
    $$Points relevés avant vérification. Rien ci-dessous n'est confirmé.

• Séjour sans visa de 90 jours au plus pour les Français, mais sans activité rémunérée.
• Un stage rémunéré demanderait un statut de séjour particulier (« activités culturelles » ou autre selon le cas).
• La différence entre indemnité et rémunération est à faire préciser par l'ambassade ou par l'immigration.

À faire : poser la question à l'ambassade du Japon en France avec la convention de stage, puis noter ici la réponse et sa date.$$,
    '[
      {"libelle": "Ambassade du Japon en France", "url": "https://www.fr.emb-japan.go.jp/", "officiel": true},
      {"libelle": "Agence des services d''immigration du Japon", "url": "https://www.moj.go.jp/isa/index.html", "officiel": true},
      {"libelle": "France Diplomatie : Japon", "url": "https://www.diplomatie.gouv.fr/fr/information-par-pays/japon", "officiel": true}
    ]'::jsonb,
    'a_verifier'
  ),
  (
    'KR',
    'Corée du Sud',
    $$Points relevés avant vérification. Rien ci-dessous n'est confirmé.

• D'après de nombreux témoignages, un visa de stage est difficile à obtenir pour un étudiant non diplômé.
• Il existe un programme vacances-travail entre la France et la Corée : conditions et compatibilité avec un stage à vérifier.

À faire : lire les catégories de visa sur le portail officiel, puis noter ici celle qui s'applique et la date de vérification.$$,
    '[
      {"libelle": "Portail des visas de Corée", "url": "https://www.visa.go.kr/", "officiel": true},
      {"libelle": "Hi Korea (immigration)", "url": "https://www.hikorea.go.kr/Main.pt", "officiel": true},
      {"libelle": "Ambassade de Corée en France", "url": "https://overseas.mofa.go.kr/fr-fr/index.do", "officiel": true},
      {"libelle": "France Diplomatie : Corée du Sud", "url": "https://www.diplomatie.gouv.fr/fr/information-par-pays/coree-du-sud", "officiel": true}
    ]'::jsonb,
    'a_verifier'
  ),
  (
    'CO',
    'Colombie',
    $$Points relevés avant vérification. Rien ci-dessous n'est confirmé.

• Les stages, rémunérés ou non, passeraient par un visa de visiteur (V), avec une lettre de l'établissement d'enseignement.
• Une exemption serait possible selon la nationalité et la durée du séjour.

À faire : confirmer sur le site de la Cancillería, puis noter ici la catégorie de visa et la date de vérification.$$,
    '[
      {"libelle": "Cancillería : visas", "url": "https://www.cancilleria.gov.co/visas", "officiel": true},
      {"libelle": "Migración Colombia", "url": "https://www.migracioncolombia.gov.co/", "officiel": true},
      {"libelle": "France Diplomatie : Colombie", "url": "https://www.diplomatie.gouv.fr/fr/information-par-pays/colombie", "officiel": true}
    ]'::jsonb,
    'a_verifier'
  ),
  (
    'CA',
    'Canada',
    $$Points relevés avant vérification. Rien ci-dessous n'est confirmé.

• Un stage, même non rémunéré, exigerait un permis de travail.
• Le permis « Stage coop international » d'Expérience internationale Canada (EIC) concernerait les étudiants inscrits dont le stage fait partie du cursus.
• La saison EIC ouvrirait généralement en janvier, avec une pause d'octobre à décembre : date d'ouverture à relever sur le site officiel et à ajouter aux échéances de cette fiche.

À faire : lire les conditions d'EIC pour la France, puis noter ici les dates de la saison et la date de vérification.$$,
    '[
      {"libelle": "Expérience internationale Canada (EIC)", "url": "https://www.canada.ca/fr/immigration-refugies-citoyennete/services/travailler-canada/eic.html", "officiel": true},
      {"libelle": "France Diplomatie : Canada", "url": "https://www.diplomatie.gouv.fr/fr/information-par-pays/canada", "officiel": true}
    ]'::jsonb,
    'a_verifier'
  )
on conflict (pays) do nothing;
