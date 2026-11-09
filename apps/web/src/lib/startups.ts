// Startups du Japon et de la Corée du Sud susceptibles de prendre un stagiaire étranger en
// informatique, ou en robotique / spatial / matériel avec une équipe logicielle. Seules entrent
// celles où l'on peut travailler en anglais. Rien n'est écrit de mémoire : chaque fiche cite ses
// sources, lues le 25 octobre 2026 (premières fiches) ou le 9 novembre 2026 (champ `verification`).
// Les liens vers les réseaux sociaux et LinkedIn sont ceux que l'entreprise affiche sur son propre
// site ; quand elle n'en affiche pas, la fiche ouvre une recherche LinkedIn plutôt que de deviner
// une adresse. Les e-mails sont uniquement ceux que l'entreprise publie elle-même.

export const VERIFICATION_STARTUPS = '25 octobre 2026';
const VERIFICATION_NOVEMBRE = '9 novembre 2026';

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

/** `info` : logiciel et IA ; `meca` : robotique, spatial ou matériel, avec une équipe logicielle. */
export type Secteur = 'info' | 'meca';

export interface FicheStartup {
  id: string;
  nom: string;
  pays: 'JP' | 'KR';
  secteur: Secteur;
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
  /** Date de lecture des sources, quand ce n'est pas `VERIFICATION_STARTUPS`. */
  verification?: string;
}

export const LIBELLES_SECTEUR: Record<Secteur, string> = {
  info: 'Logiciel et IA',
  meca: 'Robotique, spatial, matériel',
};

export function dateVerification(fiche: FicheStartup): string {
  return fiche.verification ?? VERIFICATION_STARTUPS;
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
const OFFRE_JAPAN_DEV = (libelle: string, chemin: string): LienStartup => ({
  libelle: `Japan Dev : ${libelle}`,
  url: `https://japan-dev.com/jobs/${chemin}`,
});
/** Fondateurs nommés seulement par Japan Dev, dont la page se dit « non vérifiée ». */
const SELON_JAPAN_DEV = 'Fondation, d’après Japan Dev';

export const STARTUPS: FicheStartup[] = [
  // ——— Japon ———
  {
    id: 'hennge',
    nom: 'HENNGE',
    pays: 'JP',
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'meca',
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
    secteur: 'meca',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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

  // Japon, robotique, spatial et matériel (lues le 9 novembre 2026).
  {
    id: 'ispace',
    nom: 'ispace',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo (Nihonbashi), aussi Denver et Luxembourg',
    activite: 'Atterrisseurs et rovers lunaires, services de données sur la Lune.',
    pourquoi:
      'Programme de stage officiel à Tokyo, à temps partiel ou à temps plein, sur place uniquement (pas de stage à distance). La langue officielle de l’entreprise est l’anglais ; les exigences de langue varient selon le poste et sont écrites dans chaque offre. ispace accompagne les démarches de visa des candidats étrangers. Les stages sont publiés sur Lever, sans date affichée.',
    acces: 'programme',
    langue: 'anglais',
    site: 'https://www.ispace-inc.com/',
    carriere: 'https://www.ispace-inc.com/careers/internship-program-en/',
    offres: [
      {
        libelle: 'Stages à Tokyo (Lever)',
        url: 'https://jobs.lever.co/ispace-inc?location=Tokyo%2C%20Japan&commitment=Intern',
      },
    ],
    fondateurs: [{ nom: 'Takeshi Hakamada', role: 'Fondateur, directeur général' }],
    linkedin: 'https://www.linkedin.com/company/ispace-inc/',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/ispace_inc' },
      { libelle: 'Instagram', url: 'https://www.instagram.com/ispace_inc' },
      { libelle: 'YouTube', url: 'http://www.youtube.com/@ispace9464' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/ispace.technologies.inc/' },
    ],
    sources: [
      {
        libelle: 'ispace : programme de stage',
        url: 'https://www.ispace-inc.com/careers/internship-program-en/',
      },
      { libelle: 'ispace : carrières', url: 'https://www.ispace-inc.com/careers/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'telexistence',
    nom: 'Telexistence',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo',
    activite:
      'Robots pilotés à distance et par IA pour le réassort en magasin et la logistique. Matériel, logiciel et IA développés en interne. Fondée en 2017.',
    pourquoi:
      'Japan Dev : pas de japonais exigé, l’anglais est le minimum demandé et le japonais est un plus ; visa parrainé. Leur site carrière a une liste de postes en anglais. Aucun stage publié : candidature spontanée à l’adresse donnée pour les candidatures.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://tx-inc.com/en/home/',
    carriere: 'https://tx-inc.com/en/career/',
    offres: [{ libelle: 'Offres (Lever)', url: 'https://jobs.lever.co/tx-inc.com' }],
    email: 'careers@tx-inc.com',
    fondateurs: [],
    linkedin: 'https://www.linkedin.com/company/telexistenceinc/',
    reseaux: [{ libelle: 'YouTube', url: 'https://www.youtube.com/@telexistenceinc.9918' }],
    sources: [
      JAPAN_DEV('telexistence'),
      { libelle: 'Telexistence : carrières', url: 'https://tx-inc.com/en/career/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'deepx',
    nom: 'DeepX',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo',
    activite:
      'Automatisation d’engins de chantier : grue mobile avec Tadano, pelleteuse avec Fujita. Fondée en 2016.',
    pourquoi:
      'Japan Dev : équipe très internationale, langue interne anglaise, japonais apprécié mais non exigé ; visa parrainé. Postes publiés en logiciel embarqué (C++) pour l’automatisation des engins. Aucun stage publié : candidature spontanée. Le site officiel n’a pas été lu.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.deepx.co.jp/',
    carriere: 'https://japan-dev.com/companies/deepx',
    offres: [
      OFFRE_JAPAN_DEV(
        'Software Engineer (C++), Heavy-machinery Automation',
        'deepx/deepx-software-engineer-c-heavy-machinery-automation-ymk0ml',
      ),
      OFFRE_JAPAN_DEV(
        'Senior Software Engineer, Heavy-machinery Automation',
        'deepx/deepx-senior-software-engineer-core-system-team-5g983s',
      ),
    ],
    fondateurs: [],
    reseaux: [],
    sources: [JAPAN_DEV('deepx')],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'infostellar',
    nom: 'Infostellar',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo, bureau à Londres',
    activite:
      'Stations au sol pour satellites, louées en ligne (plateforme StellarStation). Fondée en 2016.',
    pourquoi:
      'Japan Dev : la langue principale du bureau est l’anglais, c’est la seule exigence de langue ; visa parrainé pour les candidats qui vivent hors du Japon. Postes publiés : Software Engineer et Operations Engineer. Aucun stage publié : candidature spontanée. Le site officiel n’a pas pu être lu.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.infostellar.net/',
    carriere: 'https://japan-dev.com/companies/infostellar',
    offres: [
      OFFRE_JAPAN_DEV('Software Engineer', 'infostellar/infostellar-software-engineer-iwgpxv'),
      OFFRE_JAPAN_DEV('Operations Engineer', 'infostellar/infostellar-operations-engineer-yv2llq'),
    ],
    fondateurs: [
      { nom: 'Naomi Kurahara', role: SELON_JAPAN_DEV },
      { nom: 'Kazuo Ishigame', role: SELON_JAPAN_DEV },
      { nom: 'Toshio Totsuka', role: SELON_JAPAN_DEV },
    ],
    reseaux: [],
    sources: [JAPAN_DEV('infostellar')],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'ascent-robotics',
    nom: 'Ascent Robotics',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo (Shibuya)',
    activite:
      'IA pour la préhension par robot, la logistique et les jumeaux numériques. Constituée le 9 septembre 2016.',
    pourquoi:
      'Japan Dev classe l’entreprise « No Japanese Required » et « Visa Sponsorship », sans texte détaillé : à faire confirmer. Postes publiés sur leur site carrière : Senior AI Engineer, Senior Full Stack Engineer, Technical Artist. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://ascent.ai/',
    carriere: 'https://ascent-robotics.breezy.hr/',
    offres: [],
    fondateurs: [
      { nom: 'Fred Almeida', role: SELON_JAPAN_DEV },
      { nom: 'Masayuki Ishizaki', role: SELON_JAPAN_DEV },
    ],
    linkedin: 'https://www.linkedin.com/company/ascent-robotics-inc./',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/ascent_ai' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@ascentrobotics6892' },
    ],
    sources: [
      JAPAN_DEV('ascent-robotics'),
      { libelle: 'Ascent Robotics : site', url: 'https://ascent.ai/' },
      { libelle: 'Ascent Robotics : offres', url: 'https://ascent-robotics.breezy.hr/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'kanaria-tech',
    nom: 'Kanaria Tech',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo',
    activite:
      'IA de navigation pour robots à roues ; leur robot Wakko est déployé à la mairie de Kusatsu. Fondée en 2022.',
    pourquoi:
      'Japan Dev : le japonais n’est pas exigé pour certains postes, mais c’est un gros plus ; visa parrainé. Postes publiés : AI Engineer, Robotics Software Engineer (navigation et déploiement), Robotics Operations & Field Deployment Engineer. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://www.kanaria.tech',
    carriere: 'https://japan-dev.com/companies/kanaria-tech',
    offres: [
      OFFRE_JAPAN_DEV('AI Engineer', 'kanaria-tech/kanaria-tech-ai-engineer-4znurm'),
      OFFRE_JAPAN_DEV(
        'Robotics Software Engineer (Navigation & Deployment)',
        'kanaria-tech/kanaria-tech-robotics-software-engineer-navigation--deployment-66poa9',
      ),
    ],
    fondateurs: [],
    reseaux: [],
    sources: [JAPAN_DEV('kanaria-tech')],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'synspective',
    nom: 'Synspective',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo (Koto), bureau à Singapour',
    activite:
      'Satellites radar (SAR) et analyse de leurs images pour le suivi des catastrophes et de l’environnement. Fondée en 2018.',
    pourquoi:
      'Japan Dev : l’exigence de japonais dépend du poste et figure dans chaque offre ; visa parrainé. Postes publiés : FullStack Engineer (planification des opérations satellites), Satellite Systems Engineer. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://www.synspective.com/',
    carriere: 'https://careers.synspective.com/',
    offres: [
      OFFRE_JAPAN_DEV(
        'FullStack Engineer (Satellite Operation Planning)',
        'synspective/synspective-fullstack-engineer-satellite-opearation-planning-tcir8l',
      ),
      OFFRE_JAPAN_DEV(
        'Satellite Systems Engineer',
        'synspective/synspective-satellite-systems-engineer-z4jgjc',
      ),
    ],
    fondateurs: [],
    linkedin: 'https://www.linkedin.com/company/synspective/',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/synspective' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/channel/UCDaki6y8oEoQkKS1dec3rLA' },
    ],
    sources: [
      JAPAN_DEV('synspective'),
      { libelle: 'Synspective : site', url: 'https://www.synspective.com/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'axelspace',
    nom: 'Axelspace',
    pays: 'JP',
    secteur: 'meca',
    ville: 'Tokyo',
    activite: 'Microsatellites (AxelLiner) et images de la Terre (AxelGlobe). Fondée en 2008.',
    pourquoi:
      'Japan Dev : la plupart des postes ne demandent pas de japonais, à vérifier dans chaque offre ; visa parrainé. Leur page carrière annonce 218 salariés, dont 124 ingénieurs et 63 venus de l’étranger (28 pays). Attention : certaines offres de logiciel sont marquées « Japanese Required » sur Japan Dev. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'partiel',
    site: 'https://www.axelspace.com/',
    carriere: 'https://www.axelspacehd.com/careers/',
    offres: [{ libelle: 'Offres (HRMOS)', url: 'https://hrmos.co/pages/axelspace/jobs' }],
    fondateurs: [],
    linkedin: 'https://jp.linkedin.com/company/axelspace',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/axelspace' },
      { libelle: 'Instagram', url: 'https://www.instagram.com/theaxelspace/' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/Axelspace' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/channel/UCvazpJHnz4O9iFxzaXYKeZA' },
    ],
    sources: [
      JAPAN_DEV('axelspace'),
      { libelle: 'Axelspace : carrières', url: 'https://www.axelspacehd.com/careers/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },

  // Japon, logiciel (lues le 9 novembre 2026).
  {
    id: 'authlete',
    nom: 'Authlete',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo',
    activite: 'Serveur d’autorisation OAuth 2.0 et OpenID Connect en SaaS. Fondée en 2015.',
    pourquoi:
      'Japan Dev : l’équipe d’ingénieurs n’exige pas le japonais. D’après leur site, l’équipe travaille surtout à distance. Poste publié : Senior Security Engineer. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.authlete.com',
    carriere: 'https://www.authlete.com/about#career',
    offres: [{ libelle: 'Offres (BambooHR)', url: 'https://authlete.bamboohr.com/careers' }],
    fondateurs: [
      { nom: 'Takahiko Kawasaki', role: 'Cofondateur, représentant légal' },
      { nom: 'Ali Adnan', role: 'Cofondateur' },
      { nom: 'Hideki Ikeda', role: 'Cofondateur' },
    ],
    linkedin: 'https://www.linkedin.com/company/authlete/',
    reseaux: [
      { libelle: 'X', url: 'https://x.com/authlete' },
      { libelle: 'GitHub', url: 'https://github.com/authlete' },
    ],
    sources: [
      JAPAN_DEV('authlete'),
      { libelle: 'Authlete : à propos', url: 'https://www.authlete.com/about' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'recursive',
    nom: 'Recursive',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo (Shibuya)',
    activite:
      'IA appliquée : conseil et produits. Fondée en août 2020 par deux personnes, dont un ancien ingénieur de recherche de Google DeepMind.',
    pourquoi:
      'Japan Dev : l’anglais est la langue principale de l’équipe d’ingénieurs, le japonais est un plus ; aide aux démarches de visa. Poste publié : Software Engineer (premier contrat d’un an). Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://recursiveai.co.jp/en/',
    carriere: 'https://recursiveai.co.jp/join-us',
    offres: [{ libelle: 'Offres (Zookeep)', url: 'https://app.zookeep.com/career/recursive' }],
    fondateurs: [
      { nom: 'Tiago Ramalho', role: SELON_JAPAN_DEV },
      { nom: 'Katsutoshi Yamada', role: SELON_JAPAN_DEV },
    ],
    linkedin: 'https://www.linkedin.com/company/recursive-ai/',
    reseaux: [{ libelle: 'X', url: 'https://x.com/recursiveai' }],
    sources: [
      JAPAN_DEV('recursive'),
      { libelle: 'Recursive : nous rejoindre', url: 'https://recursiveai.co.jp/join-us' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'visual-alpha',
    nom: 'Visual Alpha',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo',
    activite: 'Logiciel pour les sociétés de gestion d’actifs (fintech). Fondée en 2019.',
    pourquoi:
      'Japan Dev : l’entreprise travaille à 100 % en anglais et n’exige pas le japonais ; visa parrainé. Postes publiés : Senior Full-Stack Software Engineer, Client-Facing Solution Architect. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://visual-alpha.com/',
    carriere: 'https://app.dover.com/jobs/visual-alpha',
    offres: [],
    fondateurs: [],
    reseaux: [],
    sources: [JAPAN_DEV('visual-alpha')],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'cogent-labs',
    nom: 'Cogent Labs',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo',
    activite: 'Lecture automatique de documents par IA (OCR). Fondée en 2014.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les développeurs ; visa parrainé. Postes publiés : Senior Software Engineer in Machine Learning, QA Engineer, Senior Technical Product Manager. Bureau 3,5 jours par semaine. Leur site est en japonais. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.cogent.co.jp/',
    carriere: 'https://www.cogent.co.jp/careers',
    offres: [],
    fondateurs: [],
    linkedin: 'https://www.linkedin.com/company/cogent-labs',
    reseaux: [{ libelle: 'X', url: 'https://x.com/CogentLabs' }],
    sources: [
      JAPAN_DEV('cogent-labs'),
      { libelle: 'Cogent Labs : site', url: 'https://www.cogent.co.jp/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'treasure-ai',
    nom: 'Treasure AI (ex-Treasure Data)',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo (Minato)',
    activite:
      'Plateforme de données clients. Fondée en 2011 ; entre 251 et 1 000 salariés selon Japan Dev, plus une grande startup qu’une jeune pousse.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les développeurs. Cinq postes publiés, surtout pour profils confirmés. Aucun stage publié : leur page carrière donne l’adresse du bureau de Tokyo.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.treasure.ai/',
    carriere: 'https://www.treasure.ai/careers/',
    offres: [{ libelle: 'Offres', url: 'https://jobs.treasure.ai/' }],
    email: 'tokyo@treasure.ai',
    fondateurs: [],
    linkedin: 'https://www.linkedin.com/company/treasure-data-inc-/',
    reseaux: [
      { libelle: 'GitHub', url: 'https://github.com/treasure-data' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@TreasureData' },
    ],
    sources: [
      JAPAN_DEV('treasure-data'),
      { libelle: 'Treasure AI : carrières', url: 'https://www.treasure.ai/careers/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'noeon-research',
    nom: 'Noeon Research',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo (Akasaka)',
    activite: 'Recherche en IA. Fondée en 2020, société enregistrée au Royaume-Uni.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les ingénieurs ; visa parrainé ; équipe internationale d’une trentaine de personnes. Aucun poste ouvert aujourd’hui, mais leur page invite à les contacter même sans offre.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://noeon.ai/',
    carriere: 'https://noeon.ai/join-us/',
    offres: [],
    fondateurs: [],
    linkedin: 'https://www.linkedin.com/company/noeon-research/',
    reseaux: [{ libelle: 'X', url: 'https://x.com/NoeonAI' }],
    sources: [
      JAPAN_DEV('noeon-research'),
      { libelle: 'Noeon Research : nous rejoindre', url: 'https://noeon.ai/join-us/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'jamm',
    nom: 'Jamm',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo',
    activite: 'Paiement par prélèvement sur compte bancaire. Fondée en 2023.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les développeurs, documents internes et réunions en anglais (le japonais est exigé pour le design) ; visa parrainé. Postes publiés : Full Stack Developer, Backend Developer. Leur site est en japonais seulement. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://jamm-pay.jp/',
    carriere: 'https://japan-dev.com/companies/jamm',
    offres: [],
    fondateurs: [],
    reseaux: [],
    sources: [JAPAN_DEV('jamm')],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'build-io',
    nom: 'Build.io',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo, bureau à San Francisco',
    activite: 'Hébergement d’applications dans le cloud. Fondée en 2023, moins de 10 salariés.',
    pourquoi:
      'Japan Dev : pas de japonais exigé ; visa parrainé. Aucun poste ouvert : très petite équipe, candidature spontanée à l’adresse de contact de leur page « About ».',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://build.io',
    carriere: 'https://build.io/about',
    offres: [],
    email: 'steven@build.io',
    fondateurs: [],
    reseaux: [],
    sources: [
      JAPAN_DEV('build-io'),
      { libelle: 'Build.io : à propos', url: 'https://build.io/about' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'queri',
    nom: 'Queri',
    pays: 'JP',
    secteur: 'info',
    ville: 'Tokyo',
    activite: 'Application qui rapproche les fans et les artistes. Fondée en 2022.',
    pourquoi:
      'Japan Dev : pas de japonais exigé pour les développeurs (un japonais courant est un plus) ; visa parrainé. Les échanges avec les prestataires se font en japonais. Aucun poste ouvert : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://queri.co.jp/',
    carriere: 'https://queri.co.jp/careers/',
    offres: [],
    fondateurs: [],
    reseaux: [
      { libelle: 'X', url: 'https://x.com/Queri_Official' },
      { libelle: 'YouTube', url: 'https://www.youtube.com/@Queri_Official' },
    ],
    sources: [
      JAPAN_DEV('queri'),
      { libelle: 'Queri : carrières', url: 'https://queri.co.jp/careers/' },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },

  // ——— Corée du Sud ———
  {
    id: 'sendbird',
    nom: 'Sendbird',
    pays: 'KR',
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'meca',
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
    secteur: 'meca',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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
    secteur: 'info',
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

  // Corée du Sud, robotique (lues le 9 novembre 2026).
  {
    id: 'seoul-robotics',
    nom: 'Seoul Robotics',
    pays: 'KR',
    secteur: 'meca',
    ville: 'Séoul, R&D à Pangyo',
    activite:
      'Perception 3D par lidar et conduite autonome pour usines, ports, zones logistiques et aéroports. Fondée en août 2017.',
    pourquoi:
      'Leurs offres disent « English is our working language », avec une équipe de plus de 10 nationalités. Poste « Software Engineer - Autonomy » à Pangyo, pour profils débutants à confirmés, sans coréen demandé. Attention : l’offre de QA exige le coréen, et une ancienne offre précisait ne pas parrainer de visa de travail. Aucun stage publié : candidature spontanée.',
    acces: 'spontanee',
    langue: 'anglais',
    site: 'https://www.seoulrobotics.org/',
    carriere: 'https://job-boards.greenhouse.io/seoulrobotics',
    offres: [
      {
        libelle: 'Software Engineer - Autonomy (Pangyo)',
        url: 'https://job-boards.greenhouse.io/seoulrobotics/jobs/5409079008',
      },
    ],
    email: 'recruit@seoulrobotics.org',
    fondateurs: [{ nom: 'HanBin Lee', role: 'Fondateur, directeur général' }],
    reseaux: [],
    sources: [
      {
        libelle: 'Seoul Robotics : Software Engineer - Autonomy',
        url: 'https://job-boards.greenhouse.io/seoulrobotics/jobs/5409079008',
      },
      {
        libelle: 'Seoul Robotics : Quality Assurance Engineer (coréen exigé)',
        url: 'https://job-boards.greenhouse.io/seoulrobotics/jobs/5387063008',
      },
      {
        libelle: 'Dev Korea : Solutions Engineer (visa non parrainé)',
        url: 'https://dev-korea.com/jobs/seoul-robotics-solutions-engineer',
      },
      {
        libelle: 'Wikipédia : Seoul Robotics',
        url: 'https://en.wikipedia.org/wiki/Seoul_Robotics',
      },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
  {
    id: 'bear-robotics',
    nom: 'Bear Robotics',
    pays: 'KR',
    secteur: 'meca',
    ville: 'Séoul, aussi Redwood City (Californie)',
    activite:
      'Robots de service autonomes pour restaurants, hôpitaux et usines. En cours d’intégration à LG Electronics d’après leurs offres.',
    pourquoi:
      'Stages publiés à Séoul : « Robotics Software Engineer, Intern » et un vivier « Software Engineer Intern ». CV en anglais obligatoire et anglais professionnel demandé, mais le texte des offres est en coréen : le coréen est sans doute utile au quotidien, à demander avant de postuler.',
    acces: 'offre',
    langue: 'partiel',
    site: 'https://www.bearrobotics.ai',
    carriere: 'https://www.bearrobotics.ai/careers',
    offres: [
      {
        libelle: 'Robotics Software Engineer, Intern (Séoul)',
        url: 'https://bear-robotics.breezy.hr/p/3ad392d6c3f0-robotics-software-engineer-intern',
      },
      {
        libelle: 'Software Engineer Intern (vivier, Séoul)',
        url: 'https://bear-robotics.breezy.hr/p/08475cfe4fd7-injaepul-software-engineer-intern',
      },
    ],
    fondateurs: [{ nom: 'Ha Jung-woo', role: 'Directeur général (cité dans leurs offres)' }],
    linkedin: 'https://www.linkedin.com/company/bear-robotics-inc/',
    reseaux: [
      { libelle: 'X', url: 'https://twitter.com/bearrobotics' },
      { libelle: 'Facebook', url: 'https://www.facebook.com/bearrobotics/' },
    ],
    sources: [
      { libelle: 'Bear Robotics : offres', url: 'https://bear-robotics.breezy.hr/' },
      {
        libelle: 'Bear Robotics : Robotics Software Engineer, Intern',
        url: 'https://bear-robotics.breezy.hr/p/3ad392d6c3f0-robotics-software-engineer-intern',
      },
    ],
    verification: VERIFICATION_NOVEMBRE,
  },
];
