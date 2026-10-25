// Startups du Japon et de la Corée du Sud susceptibles de prendre un stagiaire étranger en
// informatique. Rien n'est écrit de mémoire : chaque fiche cite ses sources, lues le 25 octobre 2026.
// Les liens vers les réseaux sociaux et LinkedIn sont ceux que l'entreprise affiche sur son propre
// site ; quand elle n'en affiche pas, la fiche ouvre une recherche LinkedIn plutôt que de deviner
// une adresse. Les e-mails sont uniquement ceux que l'entreprise publie elle-même.

export const VERIFICATION_STARTUPS = '25 octobre 2026';

export interface LienStartup {
  libelle: string;
  url: string;
}

export interface Fondateur {
  nom: string;
  role: string;
}

/**
 * - `programme` : programme de stage ouvert aux étrangers.
 * - `offre` : au moins un stage publié au moment de la vérification.
 * - `spontanee` : pas de stage publié, mais des postes sans langue locale : candidature spontanée.
 */
export type AccesStage = 'programme' | 'offre' | 'spontanee';

/** `anglais` : l'anglais suffit aux ingénieurs ; `partiel` : pour une partie des postes ; `local` : japonais ou coréen nécessaire. */
export type LangueTravail = 'anglais' | 'partiel' | 'local';

export interface FicheStartup {
  id: string;
  nom: string;
  pays: 'JP' | 'KR';
  ville: string;
  activite: string;
  /** Pourquoi elle peut prendre un stagiaire étranger, d'après les sources. */
  pourquoi: string;
  acces: AccesStage;
  langue: LangueTravail;
  site: string;
  carriere: string;
  /** Offres publiées ailleurs (Japan Dev, TokyoDev, Seoulstart). */
  offres: LienStartup[];
  /** E-mail publié par l'entreprise. */
  email?: string;
  fondateurs: Fondateur[];
  /** Page LinkedIn affichée sur le site officiel. */
  linkedin?: string;
  reseaux: LienStartup[];
  sources: LienStartup[];
}

export const LIBELLES_ACCES: Record<AccesStage, string> = {
  programme: 'Programme de stage',
  offre: 'Stage publié',
  spontanee: 'Candidature spontanée',
};

export const LIBELLES_LANGUE_TRAVAIL: Record<LangueTravail, string> = {
  anglais: 'Anglais suffisant',
  partiel: 'Anglais pour une partie des postes',
  local: 'Langue locale nécessaire',
};

/** Recherche LinkedIn d'une entreprise, quand son site n'affiche pas sa page. */
export function rechercheLinkedinEntreprise(nom: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(nom)}`;
}

/** Recherche LinkedIn d'une personne dans une entreprise : son profil n'est jamais deviné. */
export function rechercheLinkedinPersonne(personne: string, entreprise: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${personne} ${entreprise}`,
  )}`;
}

/** Recruteurs de l'entreprise sur LinkedIn : les personnes à qui écrire pour un stage. */
export function rechercheRecruteurs(entreprise: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(
    `${entreprise} recruiter`,
  )}`;
}

const JAPAN_DEV = (slug: string): LienStartup => ({
  libelle: 'Japan Dev : fiche entreprise',
  url: `https://japan-dev.com/companies/${slug}`,
});
const SEOULSTART = (slug: string): LienStartup => ({
  libelle: 'Seoulstart : offres et langue exigée',
  url: `https://seoulstart.com/jobs/company/${slug}`,
});

export const STARTUPS: FicheStartup[] = [
  // ——— Japon ———
  {
    id: 'hennge',
    nom: 'HENNGE',
    pays: 'JP',
    ville: 'Tokyo',
    activite:
      'Sécurité du cloud (authentification unique, sécurité des e-mails). Entreprise cotée à Tokyo, fondée en 1996.',
    pourquoi:
      'Global Internship Program : stage de développement sur place à Tokyo, de 4 à 6 semaines, sans japonais, parcours front-end ou full stack. Non rémunéré, mais billets d’avion aller-retour, aide mensuelle au logement, assurance maladie et téléphone japonais pris en charge, avec aide au visa. Ouvert dès la 3e année d’études supérieures. Candidature : défi de code, puis CV et lettre, puis deux entretiens. Places attribuées dans l’ordre d’arrivée.',
    acces: 'programme',
    langue: 'anglais',
    site: 'https://hennge.com/global/',
    carriere: 'https://recruit.hennge.com/en/gip/',
    offres: [
      { libelle: 'Candidater (défi de code)', url: 'https://challenge.hennge.com/' },
      {
        libelle: 'Japan Dev : Global Internship Program',
        url: 'https://japan-dev.com/jobs/hennge/hennge-global-internship-program-onsite-tokyo-japan-42q8i0',
      },
    ],
    fondateurs: [{ nom: 'Kazuhiro Ogura', role: 'Cofondateur, président-directeur général' }],
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/hennge_pr' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/hennge.kk' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@henngeone/featured' },
    ],
    sources: [
      { libelle: 'HENNGE : Global Internship Program', url: 'https://recruit.hennge.com/en/gip/' },
      {
        libelle: 'HENNGE : profil de Kazuhiro Ogura',
        url: 'https://hennge.com/global/about/leaders/ogura-profile/',
      },
      JAPAN_DEV('hennge'),
    ],
  },
  {
    id: 'preferred-networks',
    nom: 'Preferred Networks',
    pays: 'JP',
    ville: 'Tokyo (Otemachi)',
    activite:
      'Intelligence artificielle : modèles génératifs, puces d’IA et supercalculateurs. Fondée en 2014.',
    pourquoi:
      'Stage d’été chaque année, ouvert aux étudiants qui parlent japonais ou anglais. En 2026 : août à septembre, candidatures closes le 19 avril 2026. L’appel 2027 n’est pas encore publié : à guetter au début de 2027. Japan Dev indique que l’entreprise fait venir des stagiaires d’Europe et parraine les visas.',
    acces: 'programme',
    langue: 'anglais',
    site: 'https://www.preferred.jp/en/',
    carriere: 'https://www.preferred.jp/en/careers/internship',
    offres: [],
    fondateurs: [
      { nom: 'Daisuke Okanohara', role: 'Cofondateur, président-directeur général' },
      {
        nom: 'Toru Nishikawa',
        role: 'Cofondateur, président du conseil (PDG jusqu’en novembre 2025)',
      },
    ],
    reseaux: [
      { libelle: 'X (anglais)', url: 'https://x.com/preferred_jp' },
      { libelle: 'X (japonais)', url: 'https://x.com/PreferredNetJP' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/PreferredNet' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/user/preferredjp/videos' },
    ],
    sources: [
      {
        libelle: 'PFN : stage d’été 2026',
        url: 'https://www.preferred.jp/en/news/internship2026',
      },
      { libelle: 'PFN : fondateurs', url: 'https://www.preferred.jp/en/company/cofounders' },
      JAPAN_DEV('preferred-networks'),
    ],
  },
  {
    id: 'sakana-ai',
    nom: 'Sakana AI',
    pays: 'JP',
    ville: 'Tokyo',
    activite: 'Laboratoire de recherche en IA, fondé en 2023.',
    pourquoi:
      'Publie des stages (« Internship », « Internship / Visiting Researcher ») à Tokyo. Les postes de recherche ne demandent que l’anglais ; les autres demandent le japonais. Les stages sont surtout tournés vers la recherche. Pour postuler : un e-mail de présentation qui nomme le poste, puis un formulaire avec CV et lettre en anglais.',
    acces: 'offre',
    langue: 'partiel',
    site: 'https://sakana.ai/',
    carriere: 'https://sakana.ai/careers/',
    offres: [],
    email: 'careers@sakana.ai',
    fondateurs: [
      { nom: 'David Ha', role: 'Cofondateur, directeur général' },
      { nom: 'Llion Jones', role: 'Cofondateur, directeur technique' },
      { nom: 'Ren Ito', role: 'Cofondateur, président du conseil' },
    ],
    linkedin: 'https://www.linkedin.com/company/sakana-ai/',
    reseaux: [
      { libelle: 'X', url: 'https://x.com/SakanaAILabs' },
      { libelle: 'Instagram', url: 'https://instagram.com/SakanaAILabs' },
    ],
    sources: [
      { libelle: 'Sakana AI : carrières', url: 'https://sakana.ai/careers/' },
      { libelle: 'Sakana AI : l’entreprise', url: 'https://sakana.ai/company-info/' },
    ],
  },
  {
    id: 'rapyuta-robotics',
    nom: 'Rapyuta Robotics',
    pays: 'JP',
    ville: 'Tokyo',
    activite:
      'Robotique pilotée depuis le cloud (automatisation d’entrepôts). Issue de l’ETH Zurich, bureaux à Tokyo et Bangalore.',
    pourquoi:
      'Japan Dev : « basiquement, l’anglais suffit » pour la plupart des postes, et l’entreprise parraine le visa des candidats qui vivent hors du Japon. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.rapyuta-robotics.com/',
    carriere: 'https://www.rapyuta-robotics.com/careers/',
    offres: [
      { libelle: 'Formulaire de contact', url: 'https://www.rapyuta-robotics.com/contact-us/' },
    ],
    fondateurs: [
      { nom: 'Gajan Mohanarajah', role: 'Cofondateur, directeur général' },
      { nom: 'Arudchelvan Krishnamoorthy', role: 'Cofondateur, directeur financier' },
    ],
    linkedin: 'https://www.linkedin.com/company/rapyutarobotics/',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/rapyuta_ja' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/rapyutaroboticsja' },
      { libelle: 'Instagram', url: 'https://www.instagram.com/rapyutarobotics' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@rapyuta-robotics' },
    ],
    sources: [
      JAPAN_DEV('rapyuta-robotics'),
      {
        libelle: 'Rapyuta Robotics : l’entreprise',
        url: 'https://www.rapyuta-robotics.com/company/',
      },
    ],
  },
  {
    id: 'mujin',
    nom: 'Mujin',
    pays: 'JP',
    ville: 'Tokyo',
    activite: 'Système d’exploitation pour robots industriels (MujinOS). Fondée en 2011.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les développeurs (aide à la traduction), visa parrainé, 13 postes listés. Outils cités : Python, Go, C++, TypeScript, React, ROS. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://mujin.co.jp/en/',
    carriere: 'https://www.mujin-corp.com/careers/',
    offres: [],
    fondateurs: [
      { nom: 'Issei Takino', role: 'Cofondateur, directeur général' },
      { nom: 'Rosen Diankov', role: 'Cofondateur, directeur technique' },
    ],
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/mujin' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/mujininc' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/channel/UCCkvO6Ns_yK4yqVhuD9fdFQ' },
    ],
    sources: [
      JAPAN_DEV('mujin'),
      {
        libelle: 'Université de Tokyo : les fondateurs de Mujin (12 mai 2022)',
        url: 'https://www.u-tokyo.ac.jp/focus/en/features/entrepreneurs13.html',
      },
    ],
  },
  {
    id: 'ubie',
    nom: 'Ubie',
    pays: 'JP',
    ville: 'Tokyo',
    activite: 'Santé : assistant médical par IA, fondé par un médecin et un ingénieur.',
    pourquoi:
      'Japan Dev : le japonais n’est pas exigé pour les ingénieurs (il est souhaité), visa parrainé. Aucun poste listé chez Japan Dev aujourd’hui : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://ubie.life/',
    carriere: 'https://recruit.ubiehealth.com/',
    offres: [],
    fondateurs: [
      { nom: 'Kota Kubo', role: 'Cofondateur (ingénieur), directeur général' },
      { nom: 'Yoshinori Abe', role: 'Cofondateur (médecin)' },
    ],
    reseaux: [
      { libelle: 'X (anglais)', url: 'https://twitter.com/UbieInc' },
      { libelle: 'X (japonais)', url: 'https://twitter.com/UbieCorp_JP' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/ubie.inc' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@ubie' },
    ],
    sources: [
      JAPAN_DEV('ubie'),
      { libelle: 'Ubie : fondateurs', url: 'https://recruit.ubiehealth.com/co-founders' },
    ],
  },
  {
    id: 'smartnews',
    nom: 'SmartNews',
    pays: 'JP',
    ville: 'Tokyo (Shibuya)',
    activite: 'Application d’actualités fondée sur l’apprentissage automatique. Fondée en 2012.',
    pourquoi:
      'Japan Dev : le japonais n’est pas exigé au travail, cours de japonais et aide au visa de travail du début à la fin. Aucun poste listé chez Japan Dev aujourd’hui : regarde leur site carrière.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.smartnews.com/en',
    carriere: 'https://careers.smartnews.com/',
    offres: [],
    fondateurs: [
      { nom: 'Kaisei Hamamoto', role: 'Cofondateur, directeur général depuis novembre 2023' },
      { nom: 'Ken Suzuki', role: 'Cofondateur (directeur général jusqu’en novembre 2023)' },
    ],
    linkedin: 'https://www.linkedin.com/company/smartnews-inc-/',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/smartnews' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/SmartNewsApp' },
      { libelle: 'Instagram', url: 'https://www.instagram.com/smartnews_us' },
    ],
    sources: [
      JAPAN_DEV('smartnews'),
      {
        libelle: 'Rest of World : départ de Ken Suzuki (2023)',
        url: 'https://restofworld.org/2023/smartnews-japan-unicorn-layoffs-media/',
      },
    ],
  },
  {
    id: 'moneytree',
    nom: 'Moneytree',
    pays: 'JP',
    ville: 'Tokyo (Minato)',
    activite:
      'Fintech : agrégation de comptes bancaires. Fondée en 2012 par trois entrepreneurs étrangers.',
    pourquoi:
      'Japan Dev : environnement de travail en anglais d’abord, japonais non exigé pour les ingénieurs, 60 % des salariés venus de plus de 20 pays. Réserve : la fiche dit n’accepter que des candidats ayant déjà un visa de travail (mention datant de la pandémie, à faire confirmer). Candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://getmoneytree.com/',
    carriere: 'https://getmoneytree.com/jp/company/careers',
    offres: [],
    fondateurs: [
      { nom: 'Paul Chapman', role: 'Cofondateur, directeur général' },
      { nom: 'Mark Makdad', role: 'Cofondateur, ancien directeur technique' },
      { nom: 'Ross Sharrott', role: 'Cofondateur' },
    ],
    reseaux: [],
    sources: [
      JAPAN_DEV('moneytree'),
      {
        libelle: 'Monash Lens : les fondateurs de Moneytree',
        url: 'https://lens.monash.edu/shaking-the-money-tree/',
      },
    ],
  },
  {
    id: 'wovn',
    nom: 'WOVN Technologies',
    pays: 'JP',
    ville: 'Tokyo',
    activite: 'Traduction et localisation de sites web, d’applications et de vidéos.',
    pourquoi:
      'Offre « Fullstack Engineer » publiée le 17 août 2026 sur TokyoDev : japonais non exigé, anglais courant, candidature possible depuis l’étranger avec installation au Japon (7 ans d’expérience demandés : ce n’est pas un stage). Des offres d’emploi japonaises citent l’anglais comme langue de travail interne. Candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://wovn.io/',
    carriere: 'https://www.tokyodev.com/companies/wovn/jobs/fullstack-engineer',
    offres: [],
    fondateurs: [
      { nom: 'Jeff Sandford', role: 'Cofondateur, directeur technique' },
      { nom: 'Takaharu Hayashi', role: 'Président' },
    ],
    linkedin: 'https://www.linkedin.com/company/22305264/',
    reseaux: [
      { libelle: 'X (anglais)', url: 'https://twitter.com/wovnio' },
      { libelle: 'X (japonais)', url: 'https://twitter.com/WOVN_JAPAN' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/wovnio' },
      { libelle: 'Instagram', url: 'https://www.instagram.com/wovn.io' },
    ],
    sources: [
      {
        libelle: 'TokyoDev : Fullstack Engineer (17 août 2026)',
        url: 'https://www.tokyodev.com/companies/wovn/jobs/fullstack-engineer',
      },
      { libelle: 'LocWorld : Jeff Sandford', url: 'https://locworld.com/speakers/jeff-sandford/' },
      {
        libelle: 'ASCII.jp : levée de fonds de WOVN',
        url: 'https://ascii.jp/elem/000/004/063/4063934/',
      },
    ],
  },
  {
    id: 'autify',
    nom: 'Autify',
    pays: 'JP',
    ville: 'Tokyo (Chuo) et San Francisco',
    activite: 'Automatisation des tests logiciels par IA, sans code. Fondée en 2016.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les ingénieurs ; toute la communication écrite et orale (Slack, documentation) se fait en anglais ; visa parrainé pour les candidats vivant à l’étranger. Candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://autify.com/',
    carriere: 'https://autify.com/careers',
    offres: [],
    fondateurs: [
      { nom: 'Ryo Chikazawa', role: 'Cofondateur, directeur général' },
      { nom: 'Sam Yamashita', role: 'Cofondateur' },
    ],
    linkedin: 'https://www.linkedin.com/company/autify',
    reseaux: [],
    sources: [
      JAPAN_DEV('autify'),
      {
        libelle: 'TechCrunch : série A d’Autify (2021)',
        url: 'https://techcrunch.com/2021/10/05/autify-advances-no-code-ai-powered-software-testing-automation-platform-with-10m-series-a/',
      },
      { libelle: 'Autify : à propos', url: 'https://autify.com/about' },
    ],
  },

  // ——— Corée du Sud ———
  {
    id: 'sendbird',
    nom: 'Sendbird',
    pays: 'KR',
    ville: 'Séoul',
    activite:
      'Messagerie et agents d’IA intégrés aux applications. Passée par Y Combinator (hiver 2016).',
    pourquoi:
      'Seoulstart : stage « AI Agent Engineer, Intern » publié, visa D-10 accepté ; 3 des 4 offres affichées ne demandent pas de coréen.',
    acces: 'offre',
    langue: 'anglais',
    site: 'https://sendbird.com/',
    carriere: 'https://sendbird.com/careers',
    offres: [SEOULSTART('sendbird')],
    fondateurs: [{ nom: 'John S. Kim', role: 'Cofondateur, directeur général' }],
    linkedin: 'https://www.linkedin.com/company/sendbird',
    reseaux: [
      { libelle: 'GitHub', url: 'https://github.com/sendbird' },
      { libelle: 'X', url: 'https://twitter.com/sendbird' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/sendbird' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/sendbird' },
    ],
    sources: [
      SEOULSTART('sendbird'),
      { libelle: 'Y Combinator : Sendbird', url: 'https://www.ycombinator.com/companies/sendbird' },
    ],
  },
  {
    id: 'moloco',
    nom: 'Moloco',
    pays: 'KR',
    ville: 'Séoul (siège en Californie)',
    activite: 'Publicité mobile par apprentissage automatique. Fondée en 2013.',
    pourquoi:
      'Seoulstart : stage « Software Engineer Intern (3 months) » publié ; 5 des 30 offres affichées ne demandent pas de coréen.',
    acces: 'offre',
    langue: 'partiel',
    site: 'https://www.moloco.com/',
    carriere: 'https://www.moloco.com/open-positions',
    offres: [SEOULSTART('moloco')],
    fondateurs: [{ nom: 'Ikkjin Ahn', role: 'Cofondateur, directeur général' }],
    linkedin: 'https://www.linkedin.com/company/moloco',
    reseaux: [{ libelle: 'YouTube', url: 'https://www.youtube.com/@moloco_inc' }],
    sources: [
      SEOULSTART('moloco'),
      { libelle: 'Moloco : direction', url: 'https://moloco.com/leadership' },
    ],
  },
  {
    id: 'rebellions',
    nom: 'Rebellions',
    pays: 'KR',
    ville: 'Seongnam',
    activite:
      'Puces d’IA (NPU) pour l’inférence, avec leurs compilateurs et logiciels. Fondée en 2020.',
    pourquoi:
      'Seoulstart : 27 des 30 offres affichées ne demandent pas de coréen, et un vivier de stagiaires est ouvert (« Talent Pool (Internship) »).',
    acces: 'offre',
    langue: 'anglais',
    site: 'https://rebellions.ai/',
    carriere: 'https://rebellions.ai/careers/',
    offres: [SEOULSTART('rebellions')],
    fondateurs: [
      { nom: 'Sunghyun Park', role: 'Cofondateur, directeur général' },
      { nom: 'Jinwook Oh', role: 'Cofondateur, directeur technique' },
      { nom: 'Hyo-Eun Kim', role: 'Cofondateur, directeur produit' },
    ],
    linkedin: 'https://www.linkedin.com/company/rebellions-ai/',
    reseaux: [
      { libelle: 'X', url: 'https://x.com/RebellionsAI' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@Rebellions_inc' },
    ],
    sources: [
      SEOULSTART('rebellions'),
      {
        libelle: 'Wikipédia : Rebellions',
        url: 'https://en.wikipedia.org/wiki/Rebellions_(company)',
      },
    ],
  },
  {
    id: 'furiosaai',
    nom: 'FuriosaAI',
    pays: 'KR',
    ville: 'Séoul',
    activite: 'Puces d’accélération pour l’IA (RNGD). Fondée en 2017.',
    pourquoi:
      'Seoulstart : 20 des 30 offres affichées ne demandent pas de coréen. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://furiosa.ai/',
    carriere: 'https://furiosa.ai/careers',
    offres: [SEOULSTART('furiosaai')],
    fondateurs: [{ nom: 'June Paik', role: 'Cofondateur, directeur général' }],
    linkedin: 'https://www.linkedin.com/company/furiosaai/',
    reseaux: [
      { libelle: 'GitHub', url: 'https://github.com/furiosa-ai' },
      { libelle: 'X', url: 'https://x.com/FuriosaAI' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/channel/UCsaPzmRKx-1__hKQcTiiSlA' },
    ],
    sources: [
      SEOULSTART('furiosaai'),
      {
        libelle: 'RAISE Summit : June Paik',
        url: 'https://tickets.raisesummit.com/2026/speaker/2372960/june-paik',
      },
    ],
  },
  {
    id: 'friendliai',
    nom: 'FriendliAI',
    pays: 'KR',
    ville: 'Séoul (siège en Californie)',
    activite:
      'Plateforme d’inférence pour l’IA générative, issue de l’université nationale de Séoul. Fondée en 2021.',
    pourquoi:
      'Seoulstart : 9 des 20 offres affichées ne demandent pas de coréen. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://friendli.ai/',
    carriere: 'https://friendli.ai/careers',
    offres: [SEOULSTART('friendliai')],
    email: 'contact@friendli.ai',
    fondateurs: [
      {
        nom: 'Byung-Gon Chun',
        role: 'Fondateur, directeur général (professeur à l’université nationale de Séoul, en congé)',
      },
      { nom: 'Gyeong-In Yu', role: 'Cofondateur, directeur technique' },
    ],
    linkedin: 'https://www.linkedin.com/company/friendliai',
    reseaux: [
      { libelle: 'GitHub', url: 'https://github.com/friendliai' },
      { libelle: 'X', url: 'https://x.com/friendliai' },
      { libelle: 'Medium', url: 'https://medium.com/friendliai' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@friendliai' },
    ],
    sources: [
      SEOULSTART('friendliai'),
      { libelle: 'FriendliAI : à propos', url: 'https://friendli.ai/about' },
    ],
  },
  {
    id: 'twelve-labs',
    nom: 'Twelve Labs',
    pays: 'KR',
    ville: 'Séoul et San Francisco',
    activite: 'IA de compréhension de la vidéo. Fondée en 2021.',
    pourquoi:
      'Seoulstart : 3 des 13 offres affichées ne demandent pas de coréen. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://www.twelvelabs.io/',
    carriere: 'https://www.twelvelabs.io/careers',
    offres: [SEOULSTART('twelve-labs')],
    fondateurs: [
      { nom: 'Jae Lee', role: 'Cofondateur, directeur général' },
      { nom: 'Aiden Lee', role: 'Cofondateur, directeur technique' },
      { nom: 'Soyoung Lee', role: 'Cofondatrice, responsable de la commercialisation' },
    ],
    linkedin: 'https://www.linkedin.com/company/twelvelabs/',
    reseaux: [
      { libelle: 'GitHub', url: 'https://github.com/twelvelabs-io' },
      { libelle: 'X', url: 'https://x.com/twelve_labs' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@Twelve_Labs' },
    ],
    sources: [
      SEOULSTART('twelve-labs'),
      {
        libelle: 'Welcome to the Jungle : fondateurs de Twelve Labs',
        url: 'https://app.welcometothejungle.com/companies/Twelve-Labs',
      },
    ],
  },
  {
    id: 'lunit',
    nom: 'Lunit',
    pays: 'KR',
    ville: 'Séoul',
    activite: 'IA d’imagerie médicale pour le dépistage des cancers. Entreprise cotée.',
    pourquoi:
      'Seoulstart : 3 des 17 offres affichées ne demandent pas de coréen. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://www.lunit.io/en/',
    carriere: 'https://www.lunit.io/en/careers',
    offres: [SEOULSTART('lunit')],
    fondateurs: [
      { nom: 'Brandon Beomseok Suh', role: 'Directeur général' },
      { nom: 'Anthony Seungwook Paek', role: 'Cofondateur, président du conseil' },
      { nom: 'Donggeun Yoo', role: 'Cofondateur, directeur de l’IA' },
    ],
    linkedin: 'https://www.linkedin.com/company/lunit/',
    reseaux: [
      { libelle: 'X', url: 'https://x.com/lunit_ai' },
      { libelle: 'Medium', url: 'https://medium.com/@lunitofficial' },
    ],
    sources: [
      SEOULSTART('lunit'),
      { libelle: 'Lunit : direction', url: 'https://www.lunit.io/en/company/leadership' },
    ],
  },
  {
    id: 'daangn',
    nom: 'Daangn (Karrot)',
    pays: 'KR',
    ville: 'Séoul',
    activite: 'Petites annonces et vie de quartier (Karrot hors de Corée). Fondée en 2015.',
    pourquoi:
      'Seoulstart : stage « Software Engineer, Android (인턴) » publié, mais aucune des 30 offres affichées n’est marquée sans coréen : le coréen semble nécessaire.',
    acces: 'offre',
    langue: 'local',
    site: 'https://about.daangn.com/',
    carriere: 'https://about.daangn.com/jobs/',
    offres: [SEOULSTART('daangn')],
    fondateurs: [{ nom: 'Kim Yong-hyun', role: 'Cofondateur, codirecteur général' }],
    reseaux: [],
    sources: [
      SEOULSTART('daangn'),
      {
        libelle: 'KED Global : Kim Yong-hyun',
        url: 'https://www.kedglobal.com/newsView/ked202407040005',
      },
    ],
  },
];
