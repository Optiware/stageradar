// Sites dont les offres ne peuvent pas être collectées automatiquement : l'application y renvoie
// par des recherches pré-remplies, ouvertes dans le navigateur (cahier des charges §3 et §3.4).

export interface LienRecherche {
  libelle: string;
  url: string;
}

export interface SiteRecherche {
  site: string;
  /** Pourquoi ce site n'est proposé qu'en lien. */
  raison: string;
  recherches: LienRecherche[];
}

// Welcome to the Jungle — https://www.welcometothejungle.com/robots.txt (lu le 2026-10-13) :
// « disallow: */jobs?query=* » et « Disallow: /*? » pour tous les robots, donc pas de connecteur.
// Paramètres de l'adresse de recherche du site (filtres « contrat » et « pays ») : non vérifiables
// par un robot pour la même raison, à confirmer en ouvrant le lien. Sans eux, la recherche reste
// valable grâce au mot-clé.
function welcomeToTheJungle(motCle: string): string {
  const params = new URLSearchParams();
  params.set('query', motCle);
  params.append('refinementList[contract_type][]', 'apprenticeship');
  params.append('refinementList[offices.country_code][]', 'FR');
  return `https://www.welcometothejungle.com/fr/jobs?${params.toString()}`;
}

export const SITES_ALTERNANCE: SiteRecherche[] = [
  {
    site: 'Welcome to the Jungle',
    raison: 'Ce site interdit la collecte automatique : ses offres se consultent chez lui.',
    recherches: [
      { libelle: 'Développement', url: welcomeToTheJungle('développeur') },
      { libelle: 'Cybersécurité', url: welcomeToTheJungle('cybersécurité') },
      { libelle: 'DevOps / cloud', url: welcomeToTheJungle('devops') },
    ],
  },
];
