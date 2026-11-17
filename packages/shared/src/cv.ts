// Générateur de CV : un seul profil, mis en forme selon ce qui se fait dans chaque pays visé.
// Rien n'est écrit de mémoire : chaque règle vient d'une page citée et datée (lue le 25 octobre
// 2026). Ce qu'une source ne dit pas (ordre des rubriques pour un étudiant, par exemple) est un
// choix de mise en page, pas une règle, et n'est donc pas présenté comme un conseil.

import { containsWord, normalizeText } from './text';

export const LANGUES_CV = ['fr', 'en', 'es'] as const;
export type LangueCv = (typeof LANGUES_CV)[number];

export const PAYS_CV = ['FR', 'JP', 'KR', 'CO', 'CA', 'GB'] as const;
export type PaysCv = (typeof PAYS_CV)[number];

/** Texte saisi dans chaque langue du CV. Une langue absente n'est pas traduite automatiquement. */
export type Traduit = Partial<Record<LangueCv, string>>;
/** Liste saisie dans chaque langue (une ligne par élément). */
export type ListeTraduite = Partial<Record<LangueCv, string[]>>;

export interface ExperienceCv {
  poste: Traduit;
  entreprise: string;
  lieu: string;
  /** AAAA ou AAAA-MM. */
  debut: string;
  /** AAAA ou AAAA-MM ; vide si l'expérience est en cours. */
  fin: string;
  points: ListeTraduite;
}

export interface FormationCv {
  diplome: Traduit;
  etablissement: string;
  lieu: string;
  debut: string;
  fin: string;
  /** Enseignement supérieur : certains pays ne veulent que celui-là. */
  superieur: boolean;
  details: Traduit;
}

export interface ProjetCv {
  nom: string;
  url: string;
  description: Traduit;
}

/** Profil unique d'où partent tous les CV (colonne `settings.cv`). */
export interface ProfilCv {
  prenom: string;
  nom: string;
  titre: Traduit;
  resume: Traduit;
  email: string;
  telephone: string;
  /** Adresse complète, pour les pays où elle se met. */
  adresse: string;
  /** Ville seule, pour les autres. */
  ville: string;
  liens: { libelle: string; url: string }[];
  /** AAAA-MM-JJ, ou vide. */
  date_naissance: string;
  nationalite: Traduit;
  permis: Traduit;
  /** Statut de visa ou d'autorisation de travail. */
  visa: Traduit;
  experiences: ExperienceCv[];
  formations: FormationCv[];
  /** Outils et langages : identiques dans toutes les langues. */
  competences: string[];
  competences_autres: ListeTraduite;
  langues: ListeTraduite;
  projets: ProjetCv[];
  interets: ListeTraduite;
}

export const PROFIL_CV_VIDE: ProfilCv = {
  prenom: '',
  nom: '',
  titre: {},
  resume: {},
  email: '',
  telephone: '',
  adresse: '',
  ville: '',
  liens: [],
  date_naissance: '',
  nationalite: {},
  permis: {},
  visa: {},
  experiences: [],
  formations: [],
  competences: [],
  competences_autres: {},
  langues: {},
  projets: [],
  interets: {},
};

/** Complète un profil lu en base (ou importé) avec les champs manquants. */
export function profilCvComplet(valeur: unknown): ProfilCv {
  const profil = (valeur && typeof valeur === 'object' ? valeur : {}) as Partial<ProfilCv>;
  return { ...PROFIL_CV_VIDE, ...profil };
}

export const SECTIONS_CV = [
  'profil',
  'experience',
  'formation',
  'competences',
  'langues',
  'projets',
  'interets',
  'references',
] as const;
export type SectionCv = (typeof SECTIONS_CV)[number];

export interface SourceCv {
  libelle: string;
  url: string;
  /** Date de la page, quand elle l'indique. */
  date?: string;
}

export interface RegleCv {
  texte: string;
  source: SourceCv;
}

export interface ConventionCv {
  pays: PaysCv;
  /** Langue proposée par défaut ; elle se change à la génération. */
  langue: LangueCv;
  /** Nom du document dans le pays (« Resume », « Hoja de vida »). */
  nom: string;
  /** Nombre de pages à ne pas dépasser, quand une source le fixe. */
  pagesMax?: number;
  adresse: 'complete' | 'ville';
  dateNaissance: boolean;
  nationalite: boolean;
  permis: boolean;
  /** Seul l'enseignement supérieur est listé. */
  superieurSeulement: boolean;
  /** Nombre maximal de points par expérience. */
  pointsMax?: number;
  /** Seules les N expériences les plus récentes gardent leurs points. */
  experiencesDetaillees?: number;
  /** Longueur au-delà de laquelle un point ne tient plus sur une ligne. */
  pointUneLigne?: number;
  /** Vérifie que le texte anglais n'emploie pas « I », « my », « me ». */
  sansPremierePersonne: boolean;
  ordre: SectionCv[];
  /** Ce qui se fait dans le pays, tel que les sources le disent. */
  regles: RegleCv[];
  /** Autre format attendu par une partie des employeurs, que l'application ne génère pas. */
  autreFormat?: RegleCv;
}

const UPEC: SourceCv = {
  libelle: "UPEC, partenaire de l'Apec : « Kit de l'étudiant, le CV »",
  url: 'https://www.eup.fr/fileadmin/redaction/EUP/Documents/Formation/Insertion_pro/CV.pdf',
};
const NATIONAL_CAREERS: SourceCv = {
  libelle: 'National Careers Service (gouvernement britannique) : CV sections',
  url: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections',
};
const JOB_BANK: SourceCv = {
  libelle: 'Guichet-Emplois (gouvernement du Canada) : write a good resume',
  url: 'https://www.jobbank.gc.ca/findajob/resources/write-good-resume',
};
const JAPAN_DEV_CV: SourceCv = {
  libelle: 'Japan Dev : developer resume in Japan',
  url: 'https://japan-dev.com/blog/developer-english-resume-japan',
  date: '18 octobre 2026',
};
const JAPAN_DEV_RIREKISHO: SourceCv = {
  libelle: 'Japan Dev : Japanese resume (rirekisho)',
  url: 'https://japan-dev.com/blog/japanese-resume-rirekisho',
  date: '24 septembre 2025',
};
const SEOULSTART: SourceCv = {
  libelle: 'Seoulstart : Korean resume',
  url: 'https://seoulstart.com/guides/korean-resume',
  date: 'juin 2026',
};
const LOI_COREE: SourceCv = {
  libelle: 'Fair Hiring Procedure Act, traduction officielle du KLRI',
  url: 'https://elaw.klri.re.kr/eng_service/lawViewContent.do?hseq=56952',
  date: 'loi n° 17326 du 26 mai 2020',
};
const ELEMPLEO: SourceCv = {
  libelle: 'elempleo.com : hoja de vida ganadora',
  url: 'https://www.elempleo.com/co/noticias/noticias-laborales/como-escribir-una-hoja-de-vida-ganadora-6490',
  date: '26 octobre 2021',
};
const RCN: SourceCv = {
  libelle: 'Noticias RCN (conseils de Compensar)',
  url: 'https://www.noticiasrcn.com/economia/como-hacer-una-hoja-de-vida-exitosa-y-donde-postularla-361841',
  date: '24 août 2020',
};

export const CONVENTIONS_CV: Record<PaysCv, ConventionCv> = {
  FR: {
    pays: 'FR',
    langue: 'fr',
    nom: 'CV',
    pagesMax: 2,
    adresse: 'complete',
    dateNaissance: false,
    nationalite: false,
    permis: true,
    superieurSeulement: false,
    sansPremierePersonne: false,
    ordre: ['profil', 'formation', 'experience', 'competences', 'langues', 'projets', 'interets'],
    regles: [
      {
        texte:
          'En-tête : prénom, nom, adresse, téléphone, e-mail. Photo facultative, sauf si l’offre la demande.',
        source: UPEC,
      },
      {
        texte: 'Un titre n’est pas obligatoire, mais il situe tout de suite le candidat.',
        source: UPEC,
      },
      { texte: 'Formation présentée en chronologie inversée.', source: UPEC },
      {
        texte:
          'Format A4 ; une deuxième page est envisageable pour ne pas tasser les informations. Pas de recto verso.',
        source: UPEC,
      },
      {
        texte:
          'Compétences : langues, informatique, permis de conduire. Loisirs : attention aux généralités.',
        source: UPEC,
      },
      {
        texte:
          'Il n’y a pas de CV type : mets en avant la formation, les expériences ou les compétences selon ce que demande l’annonce.',
        source: UPEC,
      },
    ],
  },
  JP: {
    pays: 'JP',
    langue: 'en',
    nom: 'Resume',
    adresse: 'ville',
    dateNaissance: false,
    nationalite: false,
    permis: false,
    superieurSeulement: true,
    pointUneLigne: 95,
    sansPremierePersonne: false,
    ordre: ['profil', 'experience', 'formation', 'competences', 'langues', 'projets', 'interets'],
    regles: [
      {
        texte:
          'Les entreprises tech modernes et internationales acceptent un CV en anglais, à l’occidentale.',
        source: JAPAN_DEV_RIREKISHO,
      },
      {
        texte:
          'Pas de photo, ni âge, ni sexe, ni situation familiale, ni adresse complète : la ville suffit.',
        source: JAPAN_DEV_CV,
      },
      {
        texte: 'Indique ton statut de visa dans le résumé, en tête du CV.',
        source: JAPAN_DEV_CV,
      },
      {
        texte:
          'Ordre : contact (avec GitHub, LinkedIn), résumé, expériences de la plus récente à la plus ancienne, études (supérieures seulement), compétences, langues, puis projets et centres d’intérêt.',
        source: JAPAN_DEV_CV,
      },
      {
        texte: 'Chaque point tient sur une ligne ; le plus simple est le mieux.',
        source: JAPAN_DEV_CV,
      },
      {
        texte:
          'Langues : donne séparément ton niveau à l’oral et à l’écrit ; ajoute JLPT, TOEFL ou IELTS si tu les as.',
        source: JAPAN_DEV_CV,
      },
    ],
    autreFormat: {
      texte:
        'Les entreprises japonaises traditionnelles attendent un rirekisho : formulaire en japonais, avec photo 3 × 4 cm de moins de trois mois et date de naissance. Il peut être tapé à l’ordinateur.',
      source: JAPAN_DEV_RIREKISHO,
    },
  },
  KR: {
    pays: 'KR',
    langue: 'en',
    nom: 'Resume',
    adresse: 'complete',
    dateNaissance: true,
    nationalite: true,
    permis: false,
    superieurSeulement: false,
    sansPremierePersonne: false,
    ordre: ['profil', 'formation', 'experience', 'competences', 'langues', 'projets'],
    regles: [
      {
        texte:
          'Multinationales : le CV en anglais est le document principal, une version coréenne est recommandée. Les startups qui publient en anglais (Wanted) acceptent un CV anglais avec liens vers tes projets.',
        source: SEOULSTART,
      },
      {
        texte:
          'Informations personnelles attendues : nom, date de naissance, nationalité, visa, adresse, contact ; service militaire : « 해당 없음 » (non concerné) pour un étranger.',
        source: SEOULSTART,
      },
      {
        texte:
          'Ordre : informations personnelles, études, expériences, certificats et langues, chacun de la plus récente à la plus ancienne. Photo d’identité encore demandée par la plupart des entreprises privées.',
        source: SEOULSTART,
      },
      {
        texte:
          'Une entreprise de 30 salariés ou plus ne peut pas exiger l’apparence, la taille, le poids, le lieu de naissance, la situation familiale ni le patrimoine si le poste ne le justifie pas.',
        source: LOI_COREE,
      },
    ],
    autreFormat: {
      texte:
        'Offre rédigée en coréen : CV coréen (이력서) et lettre en questions (자기소개서 : parcours, personnalité, motivation, projets), en coréen poli. Son absence fait souvent écarter la candidature.',
      source: SEOULSTART,
    },
  },
  CO: {
    pays: 'CO',
    langue: 'es',
    nom: 'Hoja de vida',
    pagesMax: 3,
    adresse: 'ville',
    dateNaissance: false,
    nationalite: false,
    permis: false,
    superieurSeulement: false,
    experiencesDetaillees: 3,
    sansPremierePersonne: false,
    ordre: ['profil', 'experience', 'formation', 'competences', 'langues', 'projets'],
    regles: [
      { texte: 'Simple et court : trois pages au plus.', source: RCN },
      {
        texte:
          'Ni numéro de cédula (ou de pièce d’identité) ni références : risque d’usurpation d’identité.',
        source: RCN,
      },
      { texte: 'Adapte la hoja de vida à chaque offre.', source: RCN },
      {
        texte:
          'Le recruteur lit d’abord le profil et la dernière expérience. Mets les réussites des trois dernières expériences, avec mois et année d’entrée et de sortie.',
        source: ELEMPLEO,
      },
      {
        texte:
          'Rédige à la troisième personne et à l’infinitif. La photo est un choix personnel ; la recruteuse citée conseille de ne pas en mettre.',
        source: ELEMPLEO,
      },
    ],
  },
  CA: {
    pays: 'CA',
    langue: 'en',
    nom: 'Resume',
    pagesMax: 2,
    adresse: 'complete',
    dateNaissance: false,
    nationalite: false,
    permis: false,
    superieurSeulement: false,
    pointsMax: 7,
    sansPremierePersonne: true,
    ordre: ['profil', 'experience', 'formation', 'competences', 'langues', 'projets'],
    regles: [
      { texte: 'Deux pages au plus.', source: JOB_BANK },
      {
        texte:
          'Pas de photo (ce n’est pas la norme au Canada). Ni âge, poids, taille, situation familiale, religion ou opinions politiques ; jamais de numéro d’assurance sociale.',
        source: JOB_BANK,
      },
      {
        texte: 'Nom, adresse, e-mail et téléphone en haut de la première page.',
        source: JOB_BANK,
      },
      {
        texte:
          'Cinq à sept points par rubrique, sans « I », « my » ni « me ». Des réussites chiffrées plutôt que des tâches.',
        source: JOB_BANK,
      },
      {
        texte: 'Références sur une feuille à part, données seulement si on les demande.',
        source: JOB_BANK,
      },
    ],
  },
  GB: {
    pays: 'GB',
    langue: 'en',
    nom: 'CV',
    adresse: 'ville',
    dateNaissance: false,
    nationalite: false,
    permis: false,
    superieurSeulement: false,
    sansPremierePersonne: false,
    ordre: ['profil', 'formation', 'experience', 'competences', 'langues', 'projets', 'references'],
    regles: [
      {
        texte: 'Ni âge, ni date de naissance, ni situation familiale, ni nationalité.',
        source: NATIONAL_CAREERS,
      },
      {
        texte:
          'Rubriques : coordonnées, présentation, études, expériences, références. En début de carrière, les études viennent juste après la présentation.',
        source: NATIONAL_CAREERS,
      },
      {
        texte:
          'Pas de coordonnées des référents : écrire que des références sont disponibles sur demande.',
        source: NATIONAL_CAREERS,
      },
    ],
  },
};

const TITRES: Record<LangueCv, Record<SectionCv, string>> = {
  fr: {
    profil: 'Profil',
    experience: 'Expériences professionnelles',
    formation: 'Formation',
    competences: 'Compétences',
    langues: 'Langues',
    projets: 'Projets',
    interets: "Centres d'intérêt",
    references: 'Références',
  },
  en: {
    profil: 'Summary',
    experience: 'Work experience',
    formation: 'Education',
    competences: 'Skills',
    langues: 'Languages',
    projets: 'Projects',
    interets: 'Interests',
    references: 'References',
  },
  es: {
    profil: 'Perfil',
    experience: 'Experiencia laboral',
    formation: 'Formación académica',
    competences: 'Competencias',
    langues: 'Idiomas',
    projets: 'Proyectos',
    interets: 'Intereses',
    references: 'Referencias',
  },
};

const MOTS: Record<
  LangueCv,
  { present: string; naissance: string; nationalite: string; visa: string; references: string }
> = {
  fr: {
    present: "aujourd'hui",
    naissance: 'Date de naissance',
    nationalite: 'Nationalité',
    visa: 'Visa',
    references: 'Références disponibles sur demande.',
  },
  en: {
    present: 'Present',
    naissance: 'Date of birth',
    nationalite: 'Nationality',
    visa: 'Visa status',
    references: 'References available on request.',
  },
  es: {
    present: 'Actualidad',
    naissance: 'Fecha de nacimiento',
    nationalite: 'Nacionalidad',
    visa: 'Visa',
    references: 'Referencias disponibles a solicitud.',
  },
};

const LIBELLES_LANGUE_CV: Record<LangueCv, string> = {
  fr: 'française',
  en: 'anglaise',
  es: 'espagnole',
};

/** « 2025 », « sept. 2025 », « Sep 2025 »… selon la langue du CV. */
export function dateCv(valeur: string, langue: LangueCv): string {
  const [annee, mois] = valeur.split('-');
  if (!annee) return '';
  if (!mois) return annee;
  const date = new Date(Date.UTC(Number(annee), Number(mois) - 1, 1));
  if (Number.isNaN(date.getTime())) return valeur;
  return new Intl.DateTimeFormat(langue, { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(date)
    .replace(/^./, (lettre) => lettre.toUpperCase());
}

/** « 2022 – 2024 », « 2025 – Present », « 2026 » si début et fin sont la même année. */
export function periodeCv(debut: string, fin: string, langue: LangueCv): string {
  const de = dateCv(debut, langue);
  const a = fin ? dateCv(fin, langue) : MOTS[langue].present;
  if (!de) return a;
  return de === a ? de : `${de} – ${a}`;
}

function dateNaissance(valeur: string, langue: LangueCv): string {
  const date = new Date(`${valeur}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return valeur;
  return new Intl.DateTimeFormat(langue, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}

/** Technologies cherchées dans une offre (forme normalisée de `normalizeText`). */
export const TECHNOLOGIES = [
  'python',
  'java',
  'javascript',
  'typescript',
  'c#',
  'c++',
  'php',
  'go',
  'golang',
  'rust',
  'kotlin',
  'swift',
  'ruby',
  'scala',
  'sql',
  'mysql',
  'postgresql',
  'pl sql',
  'mongodb',
  'redis',
  'html',
  'css',
  'tailwind',
  'sass',
  'react',
  'react native',
  'vue',
  'angular',
  'svelte',
  'next js',
  'node js',
  'nodejs',
  'express',
  'django',
  'flask',
  'fastapi',
  'spring',
  'spring boot',
  'laravel',
  'symfony',
  'rails',
  'asp net',
  'graphql',
  'rest',
  'docker',
  'kubernetes',
  'terraform',
  'ansible',
  'aws',
  'azure',
  'gcp',
  'google cloud',
  'linux',
  'bash',
  'powershell',
  'git',
  'github',
  'gitlab',
  'ci cd',
  'jenkins',
  'github actions',
  'flutter',
  'android',
  'ios',
  'unity',
  'figma',
  'jira',
  'scrum',
  'agile',
  'machine learning',
  'pytorch',
  'tensorflow',
  'pandas',
  'llm',
  'kafka',
  'elasticsearch',
  'nginx',
  'firebase',
  'supabase',
] as const;

/** Une compétence saisie (« HTML/CSS », « Node.js ») découpée en termes comparables. */
function termesCompetence(competence: string): string[] {
  const entier = normalizeText(competence);
  const morceaux = competence.split(/[/,]/).map(normalizeText).filter(Boolean);
  return [...new Set([entier, ...morceaux, entier.replace(/ /g, '')])].filter(Boolean);
}

export interface OffreCiblee {
  titre: string;
  entreprise?: string | null;
  description?: string | null;
  competences?: string[];
  langues_requises?: string[];
}

export interface AttentesOffre {
  /** Compétences du profil citées par l'offre. */
  trouvees: string[];
  /** Technologies citées par l'offre que le profil ne mentionne nulle part. */
  absentes: string[];
  /** Langues exigées (codes ISO 639-1) que le profil ne cite pas. */
  languesAbsentes: string[];
}

const NOMS_LANGUE_PAR_CODE: Record<string, string[]> = {
  ja: ['japonais', 'japanese', 'japones'],
  ko: ['coreen', 'korean', 'coreano'],
  es: ['espagnol', 'spanish', 'espanol'],
  en: ['anglais', 'english', 'ingles'],
  fr: ['francais', 'french', 'frances'],
  de: ['allemand', 'german', 'aleman'],
  zh: ['chinois', 'chinese', 'chino'],
};

export function texteProfil(profil: ProfilCv): string {
  const morceaux: string[] = [...profil.competences];
  for (const langue of LANGUES_CV) {
    morceaux.push(
      profil.titre[langue] ?? '',
      profil.resume[langue] ?? '',
      ...(profil.competences_autres[langue] ?? []),
      ...(profil.langues[langue] ?? []),
    );
    for (const experience of profil.experiences) {
      morceaux.push(experience.poste[langue] ?? '', ...(experience.points[langue] ?? []));
    }
    for (const projet of profil.projets) morceaux.push(projet.description[langue] ?? '');
  }
  return normalizeText(morceaux.join(' '));
}

function texteOffre(offre: OffreCiblee): string {
  return normalizeText(
    [offre.titre, offre.description ?? '', ...(offre.competences ?? [])].join(' '),
  );
}

export function technologiesCitees(offre: OffreCiblee): string[] {
  const texte = texteOffre(offre);
  return TECHNOLOGIES.filter((technologie) => containsWord(texte, technologie));
}

/**
 * Ce que l'offre attend, comparé au profil. Les « absentes » ne sont qu'une liste à vérifier :
 * le générateur n'ajoute jamais au CV une compétence que le profil ne contient pas.
 */
export function attentesOffre(profil: ProfilCv, offre: OffreCiblee): AttentesOffre {
  const texte = texteOffre(offre);
  const trouvees = profil.competences.filter((competence) =>
    termesCompetence(competence).some((terme) => containsWord(texte, terme)),
  );
  const profilNormalise = texteProfil(profil);
  const absentes = technologiesCitees(offre).filter(
    (technologie) =>
      !containsWord(profilNormalise, technologie) &&
      !containsWord(profilNormalise, technologie.replace(/ /g, '')),
  );
  const languesAbsentes = (offre.langues_requises ?? []).filter(
    (code) =>
      !(NOMS_LANGUE_PAR_CODE[code] ?? [code]).some((nom) => containsWord(profilNormalise, nom)),
  );
  return { trouvees, absentes, languesAbsentes };
}

/** Nombre de termes de l'offre présents dans un texte. */
function pertinence(texte: string, termesOffre: string[]): number {
  const normalise = normalizeText(texte);
  return termesOffre.filter((terme) => containsWord(normalise, terme)).length;
}

export interface ElementCv {
  titre?: string;
  sousTitre?: string;
  dates?: string;
  texte?: string;
  points?: string[];
  /** Compétences mises en avant parce que l'offre les cite. */
  enAvant?: string[];
}

export interface BlocCv {
  id: SectionCv;
  titre: string;
  elements: ElementCv[];
}

export interface CvGenere {
  pays: PaysCv;
  langue: LangueCv;
  convention: ConventionCv;
  nom: string;
  titre: string;
  /** Lignes de coordonnées, dans l'ordre d'affichage. */
  coordonnees: string[];
  liens: { libelle: string; url: string }[];
  sections: BlocCv[];
  /** Ce qui manque ou s'écarte des usages du pays : à corriger dans le profil. */
  alertes: string[];
  attentes: AttentesOffre | null;
}

export interface OptionsCv {
  langue?: LangueCv;
  offre?: OffreCiblee | null;
  /** Remplacent les choix par défaut du pays. */
  dateNaissance?: boolean;
  nationalite?: boolean;
}

const PREMIERE_PERSONNE = /\b(i|my|me|i'm|i've|myself)\b/i;

/** Assemble le CV d'un pays à partir du profil. Aucun texte n'est inventé ni traduit ici. */
export function genererCv(profil: ProfilCv, pays: PaysCv, options: OptionsCv = {}): CvGenere {
  const convention = CONVENTIONS_CV[pays];
  const langue = options.langue ?? convention.langue;
  const mots = MOTS[langue];
  const nomLangue = LIBELLES_LANGUE_CV[langue];
  const alertes: string[] = [];
  const attentes = options.offre ? attentesOffre(profil, options.offre) : null;
  // Termes qui font remonter un point d'expérience : compétences et technologies citées par l'offre.
  const termesOffre = options.offre
    ? [
        ...new Set([
          ...(attentes?.trouvees ?? []).flatMap(termesCompetence),
          ...technologiesCitees(options.offre),
        ]),
      ]
    : [];

  function texte(valeur: Traduit, champ: string): string {
    const resultat = valeur[langue]?.trim() ?? '';
    if (!resultat && Object.values(valeur).some((autre) => autre?.trim())) {
      alertes.push(`${champ} : pas de version ${nomLangue}.`);
    }
    return resultat;
  }

  function liste(valeur: ListeTraduite, champ: string): string[] {
    const resultat = (valeur[langue] ?? []).map((ligne) => ligne.trim()).filter(Boolean);
    if (resultat.length === 0 && Object.values(valeur).some((autre) => autre && autre.length > 0)) {
      alertes.push(`${champ} : pas de version ${nomLangue}.`);
    }
    return resultat;
  }

  const afficherNaissance = options.dateNaissance ?? convention.dateNaissance;
  const afficherNationalite = options.nationalite ?? convention.nationalite;

  const coordonnees = [
    convention.adresse === 'complete' ? profil.adresse || profil.ville : profil.ville,
    profil.telephone,
    profil.email,
  ].filter(Boolean);
  if (afficherNaissance && profil.date_naissance) {
    coordonnees.push(`${mots.naissance} : ${dateNaissance(profil.date_naissance, langue)}`);
  }
  const nationalite = afficherNationalite ? texte(profil.nationalite, 'Nationalité') : '';
  if (nationalite) coordonnees.push(`${mots.nationalite} : ${nationalite}`);
  if (convention.permis) {
    const permis = texte(profil.permis, 'Permis');
    if (permis) coordonnees.push(permis);
  }

  if (!convention.dateNaissance && afficherNaissance && profil.date_naissance) {
    alertes.push('Date de naissance affichée : les sources de ce pays conseillent de la retirer.');
  }
  if (!convention.nationalite && afficherNationalite && nationalite) {
    alertes.push('Nationalité affichée : les sources de ce pays conseillent de la retirer.');
  }
  if (convention.dateNaissance && afficherNaissance && !profil.date_naissance) {
    alertes.push('Date de naissance attendue dans ce pays : elle n’est pas renseignée.');
  }
  if (convention.nationalite && afficherNationalite && !nationalite) {
    alertes.push('Nationalité attendue dans ce pays : elle n’est pas renseignée.');
  }
  if (pays === 'JP' && !profil.liens.some((lien) => /github/i.test(lien.url))) {
    alertes.push(
      'Japan Dev conseille un lien GitHub (ou LinkedIn) dans l’en-tête : aucun n’est saisi.',
    );
  }

  const sections: BlocCv[] = [];
  for (const id of convention.ordre) {
    const titre = TITRES[langue][id];
    if (id === 'profil') {
      const resume = texte(profil.resume, 'Résumé');
      const visa = pays === 'JP' || pays === 'KR' ? texte(profil.visa, 'Visa') : '';
      if (pays === 'JP' && !visa) {
        alertes.push('Japan Dev conseille d’indiquer ton statut de visa dans le résumé.');
      }
      const lignes = [resume, visa ? `${mots.visa} : ${visa}` : ''].filter(Boolean);
      if (lignes.length > 0) sections.push({ id, titre, elements: [{ texte: lignes.join('\n') }] });
    }
    if (id === 'experience') {
      const elements = profil.experiences.map((experience, rang): ElementCv => {
        let points = liste(experience.points, `Points de « ${experience.entreprise} »`);
        if (termesOffre.length > 0) {
          // L'ordre des expériences reste chronologique ; seuls leurs points se réordonnent.
          points = points
            .map((point, ordre) => ({ point, ordre, poids: pertinence(point, termesOffre) }))
            .sort((a, b) => b.poids - a.poids || a.ordre - b.ordre)
            .map(({ point }) => point);
        }
        if (
          convention.experiencesDetaillees !== undefined &&
          rang >= convention.experiencesDetaillees
        ) {
          points = [];
        }
        if (convention.pointsMax !== undefined && points.length > convention.pointsMax) {
          alertes.push(
            `« ${experience.entreprise} » : ${points.length} points, ${convention.pointsMax} au plus sont gardés.`,
          );
          points = points.slice(0, convention.pointsMax);
        }
        if (convention.pointUneLigne !== undefined) {
          for (const point of points) {
            if (point.length > convention.pointUneLigne) {
              alertes.push(`Point trop long pour une ligne : « ${point.slice(0, 40)}… ».`);
            }
          }
        }
        return {
          titre: texte(experience.poste, `Poste chez « ${experience.entreprise} »`),
          sousTitre: [experience.entreprise, experience.lieu].filter(Boolean).join(', '),
          dates: periodeCv(experience.debut, experience.fin, langue),
          points,
        };
      });
      if (elements.length > 0) sections.push({ id, titre, elements });
    }
    if (id === 'formation') {
      const elements = profil.formations
        .filter((formation) => formation.superieur || !convention.superieurSeulement)
        .map((formation): ElementCv => ({
          titre: texte(formation.diplome, `Diplôme de « ${formation.etablissement} »`),
          sousTitre: [formation.etablissement, formation.lieu].filter(Boolean).join(', '),
          dates: periodeCv(formation.debut, formation.fin, langue),
          texte: formation.details[langue]?.trim() || undefined,
        }));
      if (elements.length > 0) sections.push({ id, titre, elements });
    }
    if (id === 'competences') {
      const trouvees = attentes?.trouvees ?? [];
      // Celles que l'offre cite passent devant, sans rien retirer ni ajouter.
      const techniques = [
        ...trouvees,
        ...profil.competences.filter((competence) => !trouvees.includes(competence)),
      ];
      const autres = liste(profil.competences_autres, 'Autres compétences');
      const elements: ElementCv[] = [];
      if (techniques.length > 0)
        elements.push({ texte: techniques.join(' · '), enAvant: trouvees });
      if (autres.length > 0) elements.push({ points: autres });
      if (elements.length > 0) sections.push({ id, titre, elements });
    }
    if (id === 'langues') {
      const langues = liste(profil.langues, 'Langues');
      if (langues.length > 0) sections.push({ id, titre, elements: [{ points: langues }] });
    }
    if (id === 'projets') {
      const elements = profil.projets.map((projet): ElementCv => ({
        titre: projet.nom,
        sousTitre: projet.url,
        texte: texte(projet.description, `Projet « ${projet.nom} »`),
      }));
      if (elements.length > 0) sections.push({ id, titre, elements });
    }
    if (id === 'interets') {
      const interets = liste(profil.interets, "Centres d'intérêt");
      if (interets.length > 0)
        sections.push({ id, titre, elements: [{ texte: interets.join(' · ') }] });
    }
    if (id === 'references') {
      sections.push({ id, titre, elements: [{ texte: mots.references }] });
    }
  }

  if (convention.sansPremierePersonne && langue === 'en') {
    const textes = [
      profil.resume.en ?? '',
      ...profil.experiences.flatMap((experience) => experience.points.en ?? []),
    ];
    if (textes.some((ligne) => PREMIERE_PERSONNE.test(ligne))) {
      alertes.push('Le Guichet-Emplois conseille d’écrire sans « I », « my » ni « me ».');
    }
  }

  return {
    pays,
    langue,
    convention,
    nom: [profil.prenom, profil.nom.toUpperCase()].filter(Boolean).join(' '),
    titre: texte(profil.titre, 'Titre'),
    coordonnees,
    liens: profil.liens.filter((lien) => lien.url.trim()),
    sections,
    alertes: [...new Set(alertes)],
    attentes,
  };
}
