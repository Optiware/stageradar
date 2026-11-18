// Lecture d'un CV en PDF, sans IA : le texte et sa position sur la page (fournis par pdf.js) sont
// remis dans l'ordre de lecture (en-tête, puis colonne de gauche, puis colonne de droite), coupés
// en sections d'après leurs titres, puis rangés dans les champs du profil. Le résultat est
// toujours montré pour vérification avant d'être enregistré.
import {
  PROFIL_CV_VIDE,
  type ExperienceCv,
  type FormationCv,
  type LangueCv,
  type ProfilCv,
  type ProjetCv,
} from './cv';
import { normalizeText } from './text';

/** Un morceau de texte d'une page, en points PDF (origine en bas à gauche). */
export interface MorceauPdf {
  texte: string;
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface PagePdf {
  largeur: number;
  morceaux: MorceauPdf[];
}

interface Ligne {
  texte: string;
  y: number;
  x: number;
  hauteur: number;
}

/** Morceaux sur une même ligne, dans l'ordre ; un petit écart colle deux fragments d'un mot. */
function assembler(morceaux: MorceauPdf[]): Ligne {
  const tries = [...morceaux].sort((a, b) => a.x - b.x);
  let texte = '';
  let fin = -Infinity;
  for (const morceau of tries) {
    const ecart = morceau.x - fin;
    // Fragments d'un même mot (« Op » + « timisation ») : collés seulement entre lettres.
    const colle =
      texte !== '' &&
      ecart < morceau.hauteur * 0.15 &&
      /\p{L}$/u.test(texte) &&
      /^\p{Ll}/u.test(morceau.texte.trim());
    texte += (texte === '' || colle ? '' : ' ') + morceau.texte.trim();
    fin = Math.max(fin, morceau.x + morceau.largeur);
  }
  return {
    texte: texte.replace(/\s+/g, ' ').trim(),
    y: Math.max(...tries.map((morceau) => morceau.y)),
    x: tries[0]!.x,
    hauteur: Math.max(...tries.map((morceau) => morceau.hauteur)),
  };
}

/** Regroupe les morceaux en lignes, de haut en bas. */
function lignes(morceaux: MorceauPdf[]): Ligne[] {
  const tries = [...morceaux].sort((a, b) => b.y - a.y);
  const groupes: MorceauPdf[][] = [];
  for (const morceau of tries) {
    const groupe = groupes[groupes.length - 1];
    const tolerance = Math.max(3, morceau.hauteur * 0.4);
    if (groupe && Math.abs(groupe[0]!.y - morceau.y) <= tolerance) groupe.push(morceau);
    else groupes.push([morceau]);
  }
  return groupes.map(assembler).filter((ligne) => ligne.texte);
}

/**
 * Gouttière entre deux colonnes : la plus large bande verticale que presque aucun texte ne
 * traverse, entre 15 % et 85 % de la largeur. `null` pour un CV d'une seule colonne.
 */
function gouttiere(morceaux: MorceauPdf[], largeurPage: number): number | null {
  const pas = 2;
  const couverture = new Array(Math.ceil(largeurPage / pas) + 1).fill(0) as number[];
  for (const morceau of morceaux) {
    for (let x = morceau.x; x <= morceau.x + morceau.largeur; x += pas) {
      const rang = Math.floor(x / pas);
      if (rang >= 0 && rang < couverture.length) couverture[rang]! += 1;
    }
  }
  let meilleure: { debut: number; fin: number } | null = null;
  let debut: number | null = null;
  for (let rang = 0; rang < couverture.length; rang++) {
    const x = rang * pas;
    const libre = couverture[rang]! <= 1 && x > largeurPage * 0.15 && x < largeurPage * 0.85;
    if (libre && debut === null) debut = x;
    if ((!libre || rang === couverture.length - 1) && debut !== null) {
      if (!meilleure || x - debut > meilleure.fin - meilleure.debut) meilleure = { debut, fin: x };
      debut = null;
    }
  }
  if (!meilleure || meilleure.fin - meilleure.debut < 12) return null;
  const milieu = (meilleure.debut + meilleure.fin) / 2;
  const gauche = morceaux.filter((morceau) => morceau.x < milieu).length;
  const droite = morceaux.length - gauche;
  // Deux vraies colonnes : chacune porte une part notable du texte.
  return gauche >= morceaux.length * 0.15 && droite >= morceaux.length * 0.15 ? milieu : null;
}

/** Titres de section reconnus, sous forme normalisée, et la langue qu'ils trahissent. */
const TITRES: { section: SectionLue; langue: LangueCv | null; mots: string[] }[] = [
  {
    section: 'experience',
    langue: 'fr',
    mots: [
      'experience',
      'experiences',
      'experience professionnelle',
      'experiences professionnelles',
      'parcours professionnel',
      'stages',
    ],
  },
  {
    section: 'experience',
    langue: 'en',
    mots: [
      'work experience',
      'professional experience',
      'employment',
      'employment history',
      'internships',
      'additional experience',
      'relevant experience',
    ],
  },
  {
    section: 'experience',
    langue: 'es',
    mots: ['experiencia', 'experiencia laboral', 'experiencia profesional'],
  },
  {
    section: 'formation',
    langue: 'fr',
    mots: [
      'formation',
      'formations',
      'etudes',
      'diplomes',
      'parcours scolaire',
      'parcours academique',
      'cursus',
    ],
  },
  { section: 'formation', langue: 'en', mots: ['education', 'academic background'] },
  {
    section: 'formation',
    langue: 'es',
    mots: ['educacion', 'formacion', 'formacion academica', 'estudios'],
  },
  {
    section: 'competences',
    langue: 'fr',
    mots: ['competences', 'competences techniques', 'outils', 'savoir faire', 'informatique'],
  },
  {
    section: 'competences',
    langue: 'en',
    mots: ['skills', 'technical skills', 'hard skills', 'tools', 'technologies'],
  },
  {
    section: 'competences',
    langue: 'es',
    mots: ['habilidades', 'competencias', 'conocimientos', 'herramientas'],
  },
  { section: 'langues', langue: 'fr', mots: ['langues', 'langue'] },
  { section: 'langues', langue: 'en', mots: ['languages', 'language'] },
  { section: 'langues', langue: 'es', mots: ['idiomas'] },
  { section: 'projets', langue: 'fr', mots: ['projets', 'projets personnels', 'realisations'] },
  { section: 'projets', langue: 'en', mots: ['projects', 'personal projects'] },
  { section: 'projets', langue: 'es', mots: ['proyectos'] },
  {
    section: 'interets',
    langue: 'fr',
    mots: [
      'centres d interet',
      'centre d interet',
      'interets',
      'loisirs',
      'passions',
      'voyages',
      'sports',
      'sport',
    ],
  },
  { section: 'interets', langue: 'en', mots: ['interests', 'hobbies'] },
  { section: 'interets', langue: 'es', mots: ['intereses', 'aficiones', 'pasatiempos'] },
  {
    section: 'resume',
    langue: 'fr',
    mots: ['profil', 'a propos', 'a propos de moi', 'objectif', 'presentation'],
  },
  {
    section: 'resume',
    langue: 'en',
    mots: [
      'summary',
      'profile',
      'professional profile',
      'professional summary',
      'about me',
      'objective',
    ],
  },
  { section: 'resume', langue: 'es', mots: ['perfil', 'resumen', 'sobre mi', 'objetivo'] },
  {
    section: 'contact',
    langue: null,
    mots: [
      'contact',
      'contacto',
      'coordonnees',
      'informations personnelles',
      'personal information',
      'datos personales',
    ],
  },
  {
    section: 'autre',
    langue: null,
    mots: [
      'certification',
      'certifications',
      'certificats',
      'certificaciones',
      'references',
      'referencias',
      'achievements',
      'awards',
      'additional information',
      'informations complementaires',
      'divers',
    ],
  },
];

export type SectionLue =
  | 'entete'
  | 'contact'
  | 'resume'
  | 'experience'
  | 'formation'
  | 'competences'
  | 'langues'
  | 'projets'
  | 'interets'
  | 'autre';

/** Titre de section reconnu dans une ligne courte : le premier mot-clé qui l'ouvre. */
function titreDe(texte: string): { section: SectionLue; langue: LangueCv | null } | null {
  const normalise = normalizeText(texte).replace(/['’]/g, ' ');
  if (normalise.split(' ').length > 5) return null;
  for (const titre of TITRES) {
    for (const mot of titre.mots) {
      if (normalise === mot || normalise.startsWith(`${mot} `)) {
        return { section: titre.section, langue: titre.langue };
      }
    }
  }
  return null;
}

/**
 * Deux titres côte à côte dans une colonne (« Centres d'intérêt » et « Voyages ») : ce qui est
 * sous le second, jusqu'au titre suivant, forme une petite colonne lue après la première.
 */
function cotesACote(colonne: MorceauPdf[]): MorceauPdf[][] {
  const titres = colonne.filter((morceau) => titreDe(morceau.texte));
  for (const premier of titres) {
    const second = titres.find(
      (autre) => Math.abs(autre.y - premier.y) < 4 && autre.x > premier.x + 60,
    );
    if (!second) continue;
    const dessous = titres.filter((autre) => autre.y < second.y - 4).map((autre) => autre.y);
    const limite = dessous.length > 0 ? Math.max(...dessous) : -Infinity;
    const droite = colonne.filter(
      (morceau) => morceau.x >= second.x - 4 && morceau.y <= second.y + 2 && morceau.y > limite,
    );
    return [colonne.filter((morceau) => !droite.includes(morceau)), droite];
  }
  return [colonne];
}

export interface TexteCv {
  /** Lignes par section, dans l'ordre de lecture. */
  sections: { section: SectionLue; lignes: Ligne[] }[];
  langue: LangueCv;
}

/** Remet le texte du CV dans l'ordre de lecture et le coupe en sections. */
export function decouperCv(pages: PagePdf[]): TexteCv {
  const sections: TexteCv['sections'] = [];
  const voix: Record<LangueCv, number> = { fr: 0, en: 0, es: 0 };
  let courante: TexteCv['sections'][number] = { section: 'entete', lignes: [] };
  sections.push(courante);

  pages.forEach((page, numero) => {
    const morceaux = page.morceaux.filter((morceau) => morceau.texte.trim());
    if (morceaux.length === 0) return;
    // En-tête : tout ce qui est au-dessus du premier titre de section de la première page.
    const titres = morceaux.filter((morceau) => titreDe(morceau.texte));
    const hautTitres = titres.length > 0 ? Math.max(...titres.map((morceau) => morceau.y)) : null;
    const entete =
      numero === 0 && hautTitres !== null
        ? morceaux.filter((morceau) => morceau.y > hautTitres + morceau.hauteur * 0.5)
        : [];
    const corps = morceaux.filter((morceau) => !entete.includes(morceau));
    if (entete.length > 0) courante.lignes.push(...lignes(entete));

    const milieu = gouttiere(corps, page.largeur);
    const colonnes =
      milieu === null
        ? [corps]
        : [
            corps.filter((morceau) => morceau.x < milieu),
            corps.filter((morceau) => morceau.x >= milieu),
          ];
    for (const colonne of colonnes.flatMap(cotesACote)) {
      for (const ligne of lignes(colonne)) {
        const titre = titreDe(ligne.texte);
        if (titre) {
          if (titre.langue) voix[titre.langue] += 2;
          courante = { section: titre.section, lignes: [] };
          sections.push(courante);
        } else {
          courante.lignes.push(ligne);
        }
      }
    }
  });

  // Mots courants de chaque langue, pour départager.
  const texte = ` ${normalizeText(sections.flatMap((s) => s.lignes.map((l) => l.texte)).join(' '))} `;
  const compter = (mots: string[]) =>
    mots.reduce((total, mot) => total + (texte.split(` ${mot} `).length - 1), 0);
  voix.fr += compter(['et', 'des', 'du', 'les', 'une', 'avec', 'pour']);
  voix.en += compter(['the', 'and', 'with', 'of', 'for', 'to']);
  voix.es += compter(['y', 'los', 'con', 'del', 'para', 'las']);
  const langue = (Object.keys(voix) as LangueCv[]).sort((a, b) => voix[b] - voix[a])[0]!;
  return { sections, langue };
}

const MOIS: Record<string, string> = {
  jan: '01',
  janv: '01',
  janvier: '01',
  january: '01',
  ene: '01',
  enero: '01',
  fev: '02',
  fevr: '02',
  fevrier: '02',
  feb: '02',
  february: '02',
  febrero: '02',
  mar: '03',
  mars: '03',
  march: '03',
  marzo: '03',
  avr: '04',
  avril: '04',
  apr: '04',
  april: '04',
  abr: '04',
  abril: '04',
  mai: '05',
  may: '05',
  mayo: '05',
  juin: '06',
  jun: '06',
  june: '06',
  junio: '06',
  juil: '07',
  juillet: '07',
  jul: '07',
  july: '07',
  julio: '07',
  aout: '08',
  aug: '08',
  august: '08',
  ago: '08',
  agosto: '08',
  sep: '09',
  sept: '09',
  septembre: '09',
  september: '09',
  septiembre: '09',
  oct: '10',
  octobre: '10',
  october: '10',
  octubre: '10',
  nov: '11',
  novembre: '11',
  november: '11',
  noviembre: '11',
  dec: '12',
  decembre: '12',
  december: '12',
  dic: '12',
  diciembre: '12',
};

const EN_COURS =
  /\b(present|aujourd hui|actuel|actuellement|en cours|today|now|current|presente|actualidad|actual)\b/;

/** Dates d'une ligne : « 2024/2026 », « 2022 - 2024 », « sept. 2025 – présent », « 09/2024 »… */
function datesDe(texte: string): { dates: string[]; enCours: boolean; reste: string } {
  const normalise = normalizeText(texte).replace(/['’]/g, ' ');
  const dates: { valeur: string; position: number }[] = [];
  const motifs: [RegExp, (m: RegExpExecArray) => string][] = [
    [/\b(0?[1-9]|1[0-2])[/.](19|20)(\d{2})\b/g, (m) => `${m[2]}${m[3]}-${m[1]!.padStart(2, '0')}`],
    [
      new RegExp(`\\b(${Object.keys(MOIS).join('|')})\\.?\\s+((?:19|20)\\d{2})\\b`, 'g'),
      (m) => `${m[2]}-${MOIS[m[1]!]}`,
    ],
    [/\b((?:19|20)\d{2})\b/g, (m) => m[1]!],
  ];
  const prises: [number, number][] = [];
  for (const [motif, valeur] of motifs) {
    for (const m of normalise.matchAll(motif)) {
      const debut = m.index!;
      const fin = debut + m[0].length;
      if (prises.some(([a, b]) => debut < b && fin > a)) continue;
      prises.push([debut, fin]);
      dates.push({ valeur: valeur(m as RegExpExecArray), position: debut });
    }
  }
  const enCours = EN_COURS.test(normalise);
  // Le texte d'origine sans ses dates ni ses séparateurs restés seuls.
  const reste = texte
    .replace(/\b(0?[1-9]|1[0-2])[/.](19|20)\d{2}\b/g, '')
    .replace(new RegExp(`\\b(${Object.keys(MOIS).join('|')})\\.?\\s+(19|20)\\d{2}\\b`, 'gi'), '')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(
      /\b(present|présent|aujourd['’]hui|actuel|actuellement|en cours|today|now|current|presente|actualidad)\b/gi,
      '',
    )
    .replace(/[\s/–—-]+$/, '')
    .replace(/^[\s/–—-]+/, '')
    .replace(/\s+[/–—-]\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  return {
    dates: dates.sort((a, b) => a.position - b.position).map((d) => d.valeur),
    enCours,
    reste,
  };
}

const PUCE = /^[\s•●▪■◦○·\-–—*>✓✔➢➤►]+/;

function sansPuce(texte: string): string {
  return texte.replace(PUCE, '').trim();
}

/** Une ligne qui continue la précédente : elle commence par une minuscule. */
function continue_(texte: string): boolean {
  return /^[a-zà-ÿ(]/.test(sansPuce(texte)) && !PUCE.test(texte);
}

/** Recolle les lignes coupées par la mise en page. */
function recoller(textes: string[]): string[] {
  const sortie: string[] = [];
  for (const texte of textes) {
    const propre = sansPuce(texte);
    if (!propre) continue;
    if (sortie.length > 0 && continue_(texte)) sortie[sortie.length - 1] += ` ${propre}`;
    else sortie.push(propre);
  }
  return sortie;
}

interface Entree {
  titre: string;
  dates: string[];
  enCours: boolean;
  lignes: string[];
}

/** Coupe une section en entrées : chacune commence à une ligne qui porte une date. */
function entrees(lignesSection: string[]): Entree[] {
  const resultat: Entree[] = [];
  for (const texte of lignesSection) {
    const { dates, enCours, reste } = datesDe(texte);
    const courante = resultat[resultat.length - 1];
    if (dates.length > 0 && !reste && courante) {
      // Une ligne qui n'est qu'une date complète l'entrée en cours (« 2024 », « – 2022 »).
      courante.dates.push(...dates);
      courante.enCours ||= enCours;
    } else if (dates.length > 0 || !courante) {
      resultat.push({ titre: sansPuce(reste || texte), dates, enCours, lignes: [] });
    } else if (sansPuce(texte).replace(/[–—-]/g, '').trim()) {
      courante.lignes.push(texte);
    }
  }
  return resultat;
}

function periode(entree: Entree): { debut: string; fin: string } {
  const triees = [...entree.dates].sort();
  const debut = triees[0] ?? '';
  const fin = entree.enCours ? '' : (triees[triees.length - 1] ?? '');
  return { debut, fin };
}

/** « ADDE, Rilleux-la-pape » → entreprise et lieu ; « – MAIA SONNIER » → entreprise seule. */
function entrepriseEtLieu(texte: string): { nom: string; lieu: string } {
  const propre = sansPuce(texte);
  const virgule = propre.lastIndexOf(', ');
  if (virgule > 0)
    return { nom: propre.slice(0, virgule).trim(), lieu: propre.slice(virgule + 2).trim() };
  const parenthese = /^(.*?)\s*\(([^)]+)\)$/.exec(propre);
  if (parenthese) return { nom: parenthese[1]!.trim(), lieu: parenthese[2]!.trim() };
  const tiret = /^(.*?)\s+[-–]\s+(.+)$/.exec(propre);
  if (tiret && tiret[2]!.split(' ').length <= 3)
    return { nom: tiret[1]!.trim(), lieu: tiret[2]!.trim() };
  return { nom: propre, lieu: '' };
}

/** Une ligne courte, sans ponctuation de phrase : un nom d'entreprise ou d'école. */
function courte(texte: string): boolean {
  return texte.split(' ').length <= 8 && !/[.;:]$/.test(texte);
}

const SUPERIEUR =
  /\b(bts|but|dut|iut|licence|master|bachelor|engineering|ingenieur|ingenieria|universit|ecole|school|college|degree|diplome d ingenieur|grado|mba|phd|doctorat)\b/;

function capitaliser(mot: string): string {
  return mot
    .toLowerCase()
    .replace(
      /(^|[\s-])(\p{L})/gu,
      (_, avant: string, lettre: string) => avant + lettre.toUpperCase(),
    );
}

const EMAIL = /[^\s@<>()]+@[^\s@<>()]+\.[a-z]{2,}/i;
/** Au moins neuf chiffres, éventuellement séparés : un code postal n'en a que cinq. */
const TELEPHONE = /(?:\+\d{1,3}[\s.-]?)?\(?\d[\d\s.()-]{7,16}\d/;
const LIEN =
  /\b(?:https?:\/\/)?(?:www\.)?((?:github|gitlab|linkedin)\.com\/[^\s,;]+|[a-z0-9-]+\.(?:dev|io|me|fr|com)\/?[^\s,;]*)/i;

export interface CvLu {
  langue: LangueCv;
  profil: ProfilCv;
  /** Ce qui n'a pas trouvé de place, à recopier à la main si besoin. */
  nonClasse: string[];
  /** Sections trouvées, pour le résumé montré avant d'appliquer. */
  trouve: SectionLue[];
}

/** Range le texte d'un CV dans les champs du profil, dans la langue détectée. */
export function lireCv(pages: PagePdf[]): CvLu {
  const { sections, langue } = decouperCv(pages);
  const profil: ProfilCv = structuredClone(PROFIL_CV_VIDE);
  const nonClasse: string[] = [];
  const toutes = sections.flatMap((section) => section.lignes);

  // Nom : les plus grandes lettres de l'en-tête (parfois sur deux lignes) ; à défaut, la plus
  // grande ligne de la page qui ressemble à un nom (deux à quatre mots, des lettres seulement).
  const ressembleAUnNom = (texte: string) =>
    /^[\p{L}][\p{L}\s'’.-]*$/u.test(texte) && texte.split(' ').length <= 4;
  const entete = sections[0]!.lignes.filter((ligne) => ressembleAUnNom(ligne.texte));
  const plusGrande = Math.max(0, ...entete.map((ligne) => ligne.hauteur));
  let lignesNom = entete.filter((ligne) => ligne.hauteur >= plusGrande * 0.9);
  if (
    lignesNom
      .map((ligne) => ligne.texte)
      .join(' ')
      .split(' ').length < 2
  ) {
    const parTaille = toutes
      .filter((ligne) => ressembleAUnNom(ligne.texte) && ligne.texte.split(' ').length >= 2)
      .sort((a, b) => b.hauteur - a.hauteur);
    lignesNom = parTaille.slice(0, 1);
  }
  const nom = lignesNom
    .map((ligne) => ligne.texte)
    .join(' ')
    .trim();
  if (nom && nom.split(' ').length <= 5) {
    const [prenom, ...reste] = nom.split(' ');
    profil.prenom = capitaliser(prenom!);
    profil.nom = capitaliser(reste.join(' '));
  }

  // Coordonnées, où qu'elles soient.
  const texteComplet = toutes.map((ligne) => ligne.texte).join('\n');
  profil.email = EMAIL.exec(texteComplet)?.[0] ?? '';
  const lignesTelephone = toutes.find(
    (ligne) =>
      !EMAIL.test(ligne.texte) && TELEPHONE.test(ligne.texte) && !datesDe(ligne.texte).dates.length,
  );
  profil.telephone = lignesTelephone ? TELEPHONE.exec(lignesTelephone.texte)![0].trim() : '';
  for (const ligne of toutes) {
    const lien = LIEN.exec(ligne.texte);
    if (lien && !EMAIL.test(ligne.texte)) {
      const url = `https://${lien[1]!.replace(/\/$/, '')}`;
      const libelle = /github/i.test(url)
        ? 'GitHub'
        : /gitlab/i.test(url)
          ? 'GitLab'
          : /linkedin/i.test(url)
            ? 'LinkedIn'
            : 'Site';
      if (!profil.liens.some((autre) => autre.url === url)) profil.liens.push({ libelle, url });
    }
  }
  const permis = /permis\s+([a-z]{1,2})\b/i.exec(texteComplet);
  if (permis) profil.permis = { [langue]: `Permis ${permis[1]!.toUpperCase()}` };

  const utilisees = new Set<string>([
    profil.email,
    profil.telephone,
    nom,
    ...lignesNom.map((ligne) => ligne.texte),
  ]);
  const estCoordonnee = (texte: string) =>
    EMAIL.test(texte) ||
    (TELEPHONE.test(texte) && !datesDe(texte).dates.length) ||
    LIEN.test(texte) ||
    /permis\s+[a-z]{1,2}\b/i.test(texte) ||
    /^[^:]{1,20}\s?:$/.test(texte);

  for (const { section, lignes: lignesSection } of sections) {
    const textes = lignesSection
      .map((ligne) => ligne.texte)
      .filter((texte) => !utilisees.has(texte));
    switch (section) {
      case 'entete':
      case 'contact': {
        const adresse: string[] = [];
        const autres: string[] = [];
        for (const texte of textes) {
          if (estCoordonnee(texte)) continue;
          if (
            /\b\d{4,5}\b/.test(texte) ||
            /\b\d+[,\s]+(rue|chemin|avenue|bd|boulevard|allee|impasse|place|route)\b/i.test(
              normalizeText(texte),
            )
          ) {
            adresse.push(texte.replace(/^adresse\s*:\s*/i, ''));
          } else if (
            section === 'contact' &&
            adresse.length > 0 &&
            /^[\p{Lu}][\p{L}\s-]+$/u.test(texte)
          ) {
            adresse.push(texte);
          } else {
            autres.push(texte);
          }
        }
        if (adresse.length > 0) {
          // « 69570 » puis « DARDILLY » sur deux lignes : une seule adresse, ville en minuscules.
          profil.adresse = adresse
            .map((morceau) => (morceau === morceau.toUpperCase() ? capitaliser(morceau) : morceau))
            .reduce((tout, morceau) =>
              /\d$/.test(tout) ? `${tout} ${morceau}` : `${tout}, ${morceau}`,
            );
          const ville = /\b\d{5}\b[,\s]*([\p{L}][\p{L}\s'-]+)/u.exec(profil.adresse)?.[1];
          if (ville) profil.ville = capitaliser(ville.trim());
        }
        if (section === 'entete') {
          const titre = autres.find((texte) => courte(texte) && !/\d/.test(texte));
          if (titre) profil.titre = { [langue]: capitaliserTitre(titre) };
          const reste = autres.filter((texte) => texte !== titre);
          const paragraphe = recoller(reste).filter((texte) => texte.split(' ').length > 4);
          if (paragraphe.length > 0) profil.resume = { [langue]: paragraphe.join(' ') };
          nonClasse.push(...recoller(reste).filter((texte) => texte.split(' ').length <= 4));
        } else {
          nonClasse.push(...autres);
        }
        break;
      }
      case 'resume': {
        const texte = recoller(textes).join(' ');
        if (texte)
          profil.resume = { [langue]: [profil.resume[langue], texte].filter(Boolean).join(' ') };
        break;
      }
      case 'experience': {
        for (const entree of entrees(textes)) {
          const { debut, fin } = periode(entree);
          const [premiere, ...suite] = entree.lignes;
          const avecEntreprise =
            premiere !== undefined && courte(sansPuce(premiere)) && !PUCE.test(premiere);
          const { nom: entreprise, lieu } = avecEntreprise
            ? entrepriseEtLieu(premiere)
            : { nom: '', lieu: '' };
          const experience: ExperienceCv = {
            poste: { [langue]: entree.titre },
            entreprise,
            lieu,
            debut,
            fin,
            points: { [langue]: recoller(avecEntreprise ? suite : entree.lignes) },
          };
          profil.experiences.push(experience);
        }
        break;
      }
      case 'formation': {
        for (const entree of entrees(textes)) {
          const { debut, fin } = periode(entree);
          let diplome = entree.titre;
          let etablissement = '';
          let lieu = '';
          const [premiere, ...suite] = entree.lignes;
          if (premiere !== undefined && courte(sansPuce(premiere))) {
            ({ nom: etablissement, lieu } = entrepriseEtLieu(premiere));
          } else {
            const tiret = /^(.*?)\s+[-–]\s+(.+)$/.exec(entree.titre);
            if (tiret) {
              diplome = tiret[1]!.trim();
              ({ nom: etablissement, lieu } = entrepriseEtLieu(tiret[2]!));
            }
          }
          const formation: FormationCv = {
            diplome: { [langue]: diplome },
            etablissement,
            lieu,
            debut,
            fin,
            superieur: SUPERIEUR.test(normalizeText(`${diplome} ${etablissement}`)),
            details: suite.length > 0 ? { [langue]: recoller(suite).join(' ') } : {},
          };
          profil.formations.push(formation);
        }
        break;
      }
      case 'competences': {
        for (const texte of recoller(textes)) {
          const valeurs = texte.includes(':') ? texte.slice(texte.indexOf(':') + 1) : texte;
          for (const competence of valeurs.split(/\s*[,;•·|]\s*/)) {
            const propre = competence.trim();
            if (propre && !profil.competences.includes(propre)) profil.competences.push(propre);
          }
        }
        break;
      }
      case 'langues':
        profil.langues = { [langue]: [...(profil.langues[langue] ?? []), ...recoller(textes)] };
        break;
      case 'interets':
        profil.interets = { [langue]: [...(profil.interets[langue] ?? []), ...recoller(textes)] };
        break;
      case 'projets': {
        const projets: ProjetCv[] = [];
        for (const entree of entrees(textes)) {
          const lien = entree.lignes.map((texte) => LIEN.exec(texte)?.[1]).find(Boolean);
          projets.push({
            nom: entree.titre,
            url: lien ? `https://${lien}` : '',
            description: {
              [langue]: recoller(entree.lignes.filter((texte) => !LIEN.test(texte))).join(' '),
            },
          });
        }
        profil.projets = projets;
        break;
      }
      default:
        nonClasse.push(...recoller(textes));
    }
  }

  return {
    langue,
    profil,
    nonClasse: nonClasse.filter(Boolean),
    trouve: [
      ...new Set(
        sections.filter((section) => section.lignes.length > 0).map((section) => section.section),
      ),
    ],
  };
}

/** Mots courts écrits en capitales par style, pas des sigles. */
const MOTS_COURANTS = new Set([
  'WEB',
  'DATA',
  'FULL',
  'BACK',
  'END',
  'DE',
  'ET',
  'EN',
  'DU',
  'AND',
  'JOB',
  'ÉTÉ',
]);

/** « ETUDIANT BTS SIO (SLAM) » → « Etudiant BTS SIO (SLAM) » : sigles gardés en majuscules. */
function capitaliserTitre(titre: string): string {
  if (titre !== titre.toUpperCase()) return titre;
  return titre
    .split(' ')
    .map((mot, rang) =>
      (mot.length <= 4 && !MOTS_COURANTS.has(mot)) || /[()]/.test(mot)
        ? mot
        : rang === 0
          ? capitaliser(mot)
          : mot.toLowerCase(),
    )
    .join(' ');
}

export type ModeFusion = 'remplacer' | 'completer';

/**
 * Range le CV lu dans le profil. « remplacer » : ce que le PDF donne prend la place de l'ancien
 * (dans sa langue seulement pour les textes traduits) ; « completer » : seul ce qui est vide est
 * rempli, et les expériences, formations et projets nouveaux s'ajoutent à la suite.
 */
export function fusionnerProfil(actuel: ProfilCv, lu: CvLu, mode: ModeFusion): ProfilCv {
  const { profil, langue } = lu;
  const remplacer = mode === 'remplacer';
  const texte = (avant: string, apres: string) => (remplacer ? apres || avant : avant || apres);
  const traduit = <T>(avant: Partial<Record<LangueCv, T>>, apres: Partial<Record<LangueCv, T>>) => {
    const valeur = apres[langue];
    const vide =
      valeur === undefined || (Array.isArray(valeur) && valeur.length === 0) || valeur === '';
    if (vide) return avant;
    if (!remplacer && avant[langue] !== undefined && avant[langue] !== '') return avant;
    return { ...avant, [langue]: valeur };
  };
  const liste = <T>(avant: T[], apres: T[], cle: (element: T) => string) => {
    if (apres.length === 0) return avant;
    if (remplacer) return apres;
    const connues = new Set(avant.map(cle));
    return [...avant, ...apres.filter((element) => !connues.has(cle(element)))];
  };
  return {
    ...actuel,
    prenom: texte(actuel.prenom, profil.prenom),
    nom: texte(actuel.nom, profil.nom),
    email: texte(actuel.email, profil.email),
    telephone: texte(actuel.telephone, profil.telephone),
    adresse: texte(actuel.adresse, profil.adresse),
    ville: texte(actuel.ville, profil.ville),
    titre: traduit(actuel.titre, profil.titre),
    resume: traduit(actuel.resume, profil.resume),
    permis: traduit(actuel.permis, profil.permis),
    langues: traduit(actuel.langues, profil.langues),
    interets: traduit(actuel.interets, profil.interets),
    liens: liste(actuel.liens, profil.liens, (lien) => lien.url),
    competences:
      remplacer && profil.competences.length > 0
        ? profil.competences
        : [...new Set([...actuel.competences, ...profil.competences])],
    experiences: liste(
      actuel.experiences,
      profil.experiences,
      (experience) => `${normalizeText(experience.entreprise)}|${experience.debut}`,
    ),
    formations: liste(
      actuel.formations,
      profil.formations,
      (formation) => `${normalizeText(formation.etablissement)}|${formation.debut}`,
    ),
    projets: liste(actuel.projets, profil.projets, (projet) => normalizeText(projet.nom)),
  };
}
