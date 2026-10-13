// Pistes pour décrocher un stage, par pays. Rien n'est écrit de mémoire : chaque fait vient d'une
// page citée et datée, et les sites listés sans commentaire sont de simples adresses vérifiées
// (elles répondaient le 13 octobre 2026). Aucune piste n'est une garantie.

export interface LienPiste {
  libelle: string;
  url: string;
}

export interface Piste {
  titre: string;
  texte: string;
  liens: LienPiste[];
  /** D'où viennent les faits de `texte`, et quand ils ont été lus. */
  source?: string;
  /** Lien interne vers l'écran de l'application qui sert à suivre cette piste. */
  ecran?: { libelle: string; vers: string };
}

const DEMARCHAGE: Piste = {
  titre: 'Écrire directement à des startups',
  texte:
    "Une startup peut prendre un stagiaire sans avoir publié d'offre. Repère celles dont le produit t'intéresse, trouve la bonne personne (fondateur, responsable technique), envoie un message court et précis, puis relance une fois. L'écran « Démarchage » garde la liste, prépare le message et suit les réponses.",
  liens: [],
  ecran: { libelle: 'Ouvrir le démarchage', vers: '/demarchage' },
};

const SITES_CARRIERES: Piste = {
  titre: 'Sites carrières des entreprises internationales',
  texte:
    "Les entreprises internationales publient leurs stages sur leur propre site, souvent dès l'automne pour l'été suivant. L'application les relève toutes les six heures et les classe dans le fil.",
  liens: [],
  ecran: { libelle: 'Voir le fil', vers: '/' },
};

const LABORATOIRES = (recherche: LienPiste): Piste => ({
  titre: 'Stage de recherche en laboratoire',
  texte:
    "Un laboratoire universitaire peut accueillir un stagiaire sans avoir publié d'offre. Repère des équipes qui publient sur un sujet qui t'intéresse, lis un de leurs articles récents, puis écris au responsable avec ton CV, tes dates et ce que tu peux apporter. Google Scholar interdit toute lecture automatique : la recherche s'ouvre chez lui, et les laboratoires repérés s'ajoutent à la main dans le démarchage.",
  liens: [recherche],
  ecran: { libelle: 'Ajouter un laboratoire au démarchage', vers: '/demarchage' },
});

export const PISTES: Record<string, Piste[]> = {
  JP: [
    {
      titre: 'Programme Vulcanus in Japan',
      texte:
        "Programme du Centre UE-Japon pour les étudiants en ingénierie et en sciences (informatique comprise) : séminaire sur le Japon, deux mois de japonais intensif, puis six mois de stage en entreprise. Il faut être inscrit entre la quatrième année d'études et la fin du doctorat, et pouvoir y consacrer huit mois (août à mars). Bourse de 9 200 € au plus, logement fourni par l'entreprise. La dernière session s'est ouverte le 3 novembre 2025 et close le 20 janvier 2026 : les dates du prochain appel sont à relever sur la page. Ce n'est pas un stage d'été de trois mois.",
      liens: [
        { libelle: 'Vulcanus in Japan', url: 'https://www.eu-japan.eu/events/vulcanus-japan' },
      ],
      source: 'eu-japan.eu, lu le 13 octobre 2026',
    },
    SITES_CARRIERES,
    {
      titre: "Sites d'offres pour profils internationaux",
      texte:
        "Sites d'annonces tournés vers les étrangers au Japon. Ils publient surtout des postes, peu de stages : cherche « intern » ou « internship ». Leurs offres se consultent chez eux.",
      liens: [
        { libelle: 'TokyoDev', url: 'https://www.tokyodev.com/jobs' },
        { libelle: 'Japan Dev', url: 'https://japan-dev.com/jobs' },
        {
          libelle: 'GaijinPot Jobs (informatique)',
          url: 'https://jobs.gaijinpot.com/en/job?keywords=&function%5B%5D=7000',
        },
        {
          libelle: 'Daijob (informatique)',
          url: 'https://www.daijob.com/en/jobs/search_result?tj=4000&job_types[]=4001&job_types[]=4002&job_types[]=4003&job_types[]=4000&ability_of_language=23&working_a_locations[]=230&working_a_locations[]=102&job_search_form_hidden=1',
        },
        {
          libelle: 'Jobs in Japan (informatique)',
          url: 'https://jobsinjapan.com/jobs/?category=information-technology-telecommunications&english_level=fluent',
        },
        { libelle: 'Wantedly', url: 'https://www.wantedly.com/projects' },
      ],
    },
    {
      titre: "Sites d'offres de stage pour étudiants",
      texte:
        'Sites généralistes de stages, à interroger avec « Japon ». JobTeaser passe souvent par le compte de ton école.',
      liens: [
        {
          libelle: 'JobTeaser : stages « Japon »',
          url: 'https://www.jobteaser.com/fr/job-offers?contract=internship&contract_duration=3&locale=fr&locale=en&work_experience_code=young_graduate&q=japon',
        },
        {
          libelle: 'iAgora : stages informatique au Japon',
          url: 'https://www.iagora.com/work/fr/stages/ind-informatique/japon',
        },
      ],
    },
    LABORATOIRES({
      libelle: 'Google Scholar : « japan lab internship »',
      url: 'https://scholar.google.com/scholar?as_ylo=2025&q=japan+lab+internship&hl=fr&as_sdt=0,5',
    }),
    DEMARCHAGE,
    {
      titre: "Ce qu'en dit l'Union des Français de l'étranger",
      texte:
        "Selon l'UFE, les offres de stage sont rares au Japon : les stages ne font pas partie du cursus universitaire japonais, et les entreprises internationales qui en proposent recrutent surtout des jeunes qui parlent japonais. L'UFE cite deux relais : l'Association franco-japonaise pour les échanges de jeunes, et le programme européen du site eu-japan.eu.",
      liens: [
        {
          libelle: 'UFE : faire un stage au Japon',
          url: 'https://ufe.org/dossier-pays/japon/faire-un-stage-au-japon/',
        },
      ],
      source: 'ufe.org, lu le 13 octobre 2026 (article non daté)',
    },
    {
      titre: 'Une fois sur place',
      texte:
        "Le centre de services pour l'emploi des étrangers de Fukuoka (service public Hello Work) organise des salons et des séminaires pour les étudiants étrangers déjà au Japon. Sa page ne parle pas de stages. Pour juger une offre, Indeed publie des fourchettes de salaires au Japon.",
      liens: [
        {
          libelle: "Centre pour l'emploi des étrangers de Fukuoka",
          url: 'https://jsite.mhlw.go.jp/fukuoka-roudoukyoku/hw/fuzoku_kikan/gaisen.html',
        },
        { libelle: 'Indeed : salaires au Japon', url: 'https://jp.indeed.com/career/salaries' },
      ],
      source: 'jsite.mhlw.go.jp, lu le 13 octobre 2026',
    },
  ],
  KR: [
    SITES_CARRIERES,
    {
      titre: "Sites d'offres coréens",
      texte:
        "Sites d'annonces coréens, pour l'essentiel en coréen. Cherche « 인턴 » (stagiaire) ou « intern ». Leurs offres se consultent chez eux.",
      liens: [
        { libelle: 'Saramin', url: 'https://www.saramin.co.kr/' },
        { libelle: 'JobKorea', url: 'https://www.jobkorea.co.kr/' },
        { libelle: 'Wanted', url: 'https://www.wanted.co.kr/' },
        { libelle: 'RocketPunch', url: 'https://www.rocketpunch.com/' },
        { libelle: 'PeopleNJob', url: 'https://www.peoplenjob.com/' },
      ],
    },
    {
      titre: 'Portails officiels',
      texte:
        "Sites publics coréens : le centre d'information sur le programme vacances-travail, le portail de la ville de Séoul pour les étrangers et le portail national des startups. Leur intérêt pour un stage d'été est à vérifier, comme les règles de visa de la fiche ci-dessus.",
      liens: [
        { libelle: 'Working Holiday Info Center', url: 'https://whic.mofa.go.kr/' },
        { libelle: 'Seoul Global Center', url: 'https://global.seoul.go.kr/' },
        { libelle: 'K-Startup', url: 'https://www.k-startup.go.kr/' },
      ],
    },
    LABORATOIRES({
      libelle: 'Google Scholar : « korea lab internship »',
      url: 'https://scholar.google.com/scholar?as_ylo=2025&q=korea+lab+internship&hl=fr&as_sdt=0,5',
    }),
    DEMARCHAGE,
  ],
  GB: [SITES_CARRIERES, DEMARCHAGE],
  CO: [SITES_CARRIERES, DEMARCHAGE],
  CA: [SITES_CARRIERES, DEMARCHAGE],
};

/** Annuaires où repérer des startups à démarcher, par pays. Adresses vérifiées le 13 octobre 2026. */
export const ANNUAIRES: { pays: string | null; liens: LienPiste[] }[] = [
  {
    pays: 'JP',
    liens: [
      { libelle: 'TokyoDev : entreprises', url: 'https://www.tokyodev.com/companies' },
      { libelle: 'Japan Dev : entreprises', url: 'https://japan-dev.com/companies' },
      { libelle: 'Wantedly', url: 'https://www.wantedly.com/projects' },
    ],
  },
  {
    pays: 'KR',
    liens: [
      { libelle: 'RocketPunch', url: 'https://www.rocketpunch.com/' },
      { libelle: 'Wanted', url: 'https://www.wanted.co.kr/' },
      { libelle: 'K-Startup', url: 'https://www.k-startup.go.kr/' },
    ],
  },
  {
    pays: null,
    liens: [
      {
        libelle: 'Y Combinator : annuaire des startups',
        url: 'https://www.ycombinator.com/companies',
      },
      { libelle: 'Wellfound', url: 'https://wellfound.com/' },
    ],
  },
];
