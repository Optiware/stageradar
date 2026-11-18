// Éditeur de CV façon Canva et mode « Robot » (maquette du 18 novembre 2026). La mise en page ne
// change jamais le contenu : elle ordonne, masque et met en forme les blocs que `genererCv` produit.
import { TECHNOLOGIES, type BlocCv, type CvGenere, type SectionCv, type SourceCv } from './cv';
import { containsWord, normalizeText } from './text';

export type ModeleCv = 'sobre' | 'moderne' | 'compact';
export type AccentCv = 'bleu' | 'sarcelle' | 'violet' | 'brique' | 'encre';
export type PoliceCv = 'inter' | 'jakarta' | 'georgia' | 'arial';
export type MargesCv = 'etroites' | 'normales' | 'larges';

export interface MiseEnPageCv {
  modele: ModeleCv;
  accent: AccentCv;
  police: PoliceCv;
  /** Taille du texte, en points (9 à 12). */
  taille: number;
  /** Interligne (1 à 1,8). */
  interligne: number;
  marges: MargesCv;
  /** Ordre des blocs ; un bloc absent garde sa place par défaut, à la suite. */
  ordre: SectionCv[];
  masques: SectionCv[];
}

export const MISE_EN_PAGE_DEFAUT: MiseEnPageCv = {
  modele: 'sobre',
  accent: 'bleu',
  police: 'inter',
  taille: 10,
  interligne: 1.4,
  marges: 'normales',
  ordre: [],
  masques: [],
};

export const ACCENTS: Record<AccentCv, { libelle: string; couleur: string }> = {
  bleu: { libelle: 'Bleu', couleur: '#2F5BEA' },
  sarcelle: { libelle: 'Sarcelle', couleur: '#0F766E' },
  violet: { libelle: 'Violet', couleur: '#6D28D9' },
  brique: { libelle: 'Brique', couleur: '#B4441F' },
  encre: { libelle: 'Encre', couleur: '#14162B' },
};

/** Polices servies par l'application ou présentes sur tous les systèmes. */
export const POLICES: Record<PoliceCv, { libelle: string; css: string }> = {
  inter: { libelle: 'Inter', css: "'Inter Variable', Inter, sans-serif" },
  jakarta: { libelle: 'Plus Jakarta Sans', css: "'Plus Jakarta Sans Variable', sans-serif" },
  georgia: { libelle: 'Georgia', css: 'Georgia, serif' },
  arial: { libelle: 'Arial', css: 'Arial, Helvetica, sans-serif' },
};

/**
 * Marges en millimètres. MCPHS déconseille moins d'un demi-pouce (12,7 mm) pour les logiciels de
 * tri : les plus étroites restent au-dessus.
 */
export const MARGES_MM: Record<MargesCv, number> = { etroites: 13, normales: 16, larges: 20 };

/** Blocs placés dans la colonne de gauche du modèle « Moderne ». */
export const BLOCS_COLONNE: readonly SectionCv[] = ['competences', 'langues', 'interets'];

/** Blocs dans l'ordre choisi, sans les blocs masqués. */
export function ordonner(sections: BlocCv[], miseEnPage: MiseEnPageCv): BlocCv[] {
  const rang = (id: SectionCv) => {
    const position = miseEnPage.ordre.indexOf(id);
    return position === -1
      ? miseEnPage.ordre.length + sections.findIndex((s) => s.id === id)
      : position;
  };
  return sections
    .filter((section) => !miseEnPage.masques.includes(section.id))
    .sort((a, b) => rang(a.id) - rang(b.id));
}

/** Déplace un bloc à la place d'un autre (glisser-déposer ou flèches). */
export function deplacer(ordre: SectionCv[], bloc: SectionCv, vers: SectionCv): SectionCv[] {
  const sans = ordre.filter((id) => id !== bloc);
  const position = sans.indexOf(vers);
  const avant = ordre.indexOf(bloc) > ordre.indexOf(vers);
  sans.splice(avant ? position : position + 1, 0, bloc);
  return sans;
}

/**
 * Un cran plus serré, pour « Tenir sur une page » : interligne, puis taille, puis marges.
 * `null` quand il n'y a plus rien à resserrer sans nuire à la lecture.
 */
export function resserrer(miseEnPage: MiseEnPageCv): MiseEnPageCv | null {
  if (miseEnPage.interligne > 1.2) {
    return { ...miseEnPage, interligne: Math.round((miseEnPage.interligne - 0.1) * 10) / 10 };
  }
  if (miseEnPage.taille > 9) return { ...miseEnPage, taille: miseEnPage.taille - 0.5 };
  if (miseEnPage.marges === 'larges') return { ...miseEnPage, marges: 'normales' };
  if (miseEnPage.marges === 'normales') return { ...miseEnPage, marges: 'etroites' };
  return null;
}

const BUFFALO: SourceCv = {
  libelle: 'University at Buffalo, « ATS-Friendly Résumés »',
  url: 'https://management.buffalo.edu/career-resource-center/students/preparation/tools/correspondence/resume/electronic.html',
  date: 'lue le 18 novembre 2026',
};
const MCPHS: SourceCv = {
  libelle: 'MCPHS, « Navigating Applicant Tracking Systems »',
  url: 'https://www.mcphs.edu/academics/career-development-center/job-internship-search/interviewing/navigating-applicant-tracking-systems',
  date: 'lue le 18 novembre 2026',
};

/** Ce que le mode Robot applique, et pourquoi, d'après deux centres carrière universitaires. */
export const REGLES_ROBOT: { texte: string; sources: SourceCv[] }[] = [
  {
    texte: 'Une seule colonne : des colonnes peuvent être lues en travers.',
    sources: [MCPHS, BUFFALO],
  },
  { texte: 'Titres standard (Education, Experience, Skills).', sources: [BUFFALO, MCPHS] },
  {
    texte:
      'Ni tableau, ni image, ni icône, ni photo ; nom et coordonnées en haut, pas dans un en-tête.',
    sources: [BUFFALO, MCPHS],
  },
  { texte: 'Police courante : Arial ici.', sources: [BUFFALO, MCPHS] },
  {
    texte:
      'PDF de préférence ; .docx seulement si l’offre le demande (Buffalo prévient qu’il peut ne pas être reconnu, MCPHS accepte les deux).',
    sources: [BUFFALO, MCPHS],
  },
];

/** Texte du CV dans l'ordre où un logiciel de tri le lit : une colonne, de haut en bas. */
export function texteRobot(cv: CvGenere, sections: BlocCv[]): string {
  const coordonnees = [
    ...cv.coordonnees,
    ...cv.liens.map((lien) => lien.url.replace(/^https?:\/\//, '')),
  ].join(' | ');
  const lignes = [cv.nom, cv.titre, coordonnees].filter(Boolean);
  for (const section of sections) {
    lignes.push('', section.titre.toUpperCase());
    for (const element of section.elements) {
      const entete = [element.titre, element.dates].filter(Boolean).join(' · ');
      if (entete) lignes.push(entete);
      if (element.sousTitre) lignes.push(element.sousTitre);
      if (element.texte) lignes.push(element.texte);
      for (const point of element.points ?? []) lignes.push(`- ${point}`);
    }
  }
  return lignes.join('\n');
}

export interface ChampLu {
  libelle: string;
  valeur: string;
  ok: boolean;
}

const EMAIL = /[^\s@|]+@[^\s@|]+\.[^\s@|]+/;
const TELEPHONE = /\+?\d[\d .-]{7,}\d/;
/** Une période lisible : au moins une année à quatre chiffres. */
const ANNEE = /\b(19|20)\d{2}\b/;

/** Ce qu'un logiciel de tri trouvera : nom, e-mail, téléphone, intitulés, dates, compétences. */
export function lectureRobot(cv: CvGenere, sections: BlocCv[]): ChampLu[] {
  const texte = texteRobot(cv, sections);
  const elements = sections.flatMap((section) =>
    section.id === 'experience' || section.id === 'projets' || section.id === 'formation'
      ? section.elements
      : [],
  );
  const intitules = elements.map((element) => element.titre).filter(Boolean) as string[];
  const datesIllisibles = elements.filter((element) => element.dates && !ANNEE.test(element.dates));
  const normalise = normalizeText(texte);
  const competences = [
    ...new Set(TECHNOLOGIES.filter((technologie) => containsWord(normalise, technologie))),
  ];
  const email = texte.match(EMAIL)?.[0];
  const telephone = texte.match(TELEPHONE)?.[0];
  return [
    { libelle: 'Nom', valeur: cv.nom || 'Absent : ajoute ton nom au profil', ok: Boolean(cv.nom) },
    { libelle: 'E-mail', valeur: email ?? 'Introuvable', ok: Boolean(email) },
    { libelle: 'Téléphone', valeur: telephone ?? 'Introuvable', ok: Boolean(telephone) },
    {
      libelle: 'Postes, formations et projets',
      valeur: intitules.length > 0 ? intitules.join(' · ') : 'Aucun intitulé',
      ok: intitules.length > 0,
    },
    {
      libelle: 'Dates',
      valeur:
        datesIllisibles.length > 0
          ? `Non reconnue : « ${datesIllisibles[0]!.dates} »`
          : 'Toutes portent une année',
      ok: datesIllisibles.length === 0,
    },
    {
      libelle: 'Compétences',
      valeur:
        competences.length > 0
          ? `${competences.length} trouvée${competences.length > 1 ? 's' : ''}`
          : 'Aucune technologie reconnue',
      ok: competences.length > 0,
    },
  ];
}
