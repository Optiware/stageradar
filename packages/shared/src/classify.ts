import type { MotsCles } from './keywords';
import { containsWord, normalizeText } from './text';
import { DOMAINES, type Domaine, type TypeOffre } from './types';

/** Profil de recherche, tel que stocké dans `settings.profil`. */
export interface Profil {
  alternance: { rentree: string; villes: string[]; rayon_km: number; rythme: string | null };
  stage: { debut: string; fin: string; pays: string[] };
  /** Codes ISO 639-1 des langues parlées, en plus du français et de l'anglais. */
  langues: string[];
}

export const DEFAULT_PROFIL: Profil = {
  alternance: { rentree: '2027-09-01', villes: [], rayon_km: 30, rythme: null },
  stage: { debut: '2027-06-01', fin: '2027-08-31', pays: ['JP', 'KR', 'CO', 'CA', 'GB'] },
  langues: [],
};

export type Periode = 'explicite' | 'non_precisee' | 'incompatible';
export type Niveau = 'accessible' | 'non_precise' | 'trop_eleve';

export interface Classification {
  type: TypeOffre;
  domaines: Domaine[];
  langues_requises: string[];
  niveau: Niveau;
  periode: Periode;
  /** Motif de masquage par défaut (§4.2), ou `null` si l'offre est dans la cible. */
  exclue_raison: string | null;
}

export interface TexteOffre {
  titre: string;
  description: string | null;
  /** Type annoncé par la source elle-même (champ structuré), s'il existe. */
  type_source?: TypeOffre | null;
}

const SEUIL_DOMAINE = 3;

function contientUn(texte: string, mots: string[]): string | null {
  return mots.find((mot) => containsWord(texte, mot)) ?? null;
}

function detecterDomaines(titre: string, description: string, motsCles: MotsCles): Domaine[] {
  return DOMAINES.filter((domaine) => {
    const { forts, faibles } = motsCles.domaines[domaine];
    let points = 0;
    for (const mot of forts) {
      if (containsWord(titre, mot)) points += 3;
      else if (containsWord(description, mot)) points += 1;
    }
    for (const mot of faibles) {
      if (containsWord(titre, mot)) points += 1;
      else if (containsWord(description, mot)) points += 0.5;
    }
    return points >= SEUIL_DOMAINE;
  });
}

function detecterType(titre: string, motsCles: MotsCles, typeSource?: TypeOffre | null): TypeOffre {
  // Le titre seul : « stage » dans une description en anglais veut dire « phase », pas « stage ».
  // En anglais, « late-stage », « early stage »… parlent d'une phase, pas d'un stage.
  const nettoye = titre.replace(
    /\b(late|early|growth|mid|seed|clinical|multi|next|final|first|second) stage\b/g,
    ' ',
  );
  if (contientUn(nettoye, motsCles.types.alternance)) return 'alternance';
  if (contientUn(nettoye, motsCles.types.stage)) return 'stage';
  return typeSource ?? 'autre';
}

/** Langue dominante d'un texte, d'après l'écriture puis quelques mots très courants. */
export function detecterLangue(texte: string): string | null {
  const lettres = texte.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (lettres.length < 40) return null;
  const part = (motif: RegExp) => (texte.match(motif)?.length ?? 0) / lettres.length;
  if (part(/[぀-ヿ]/g) > 0.1) return 'ja';
  if (part(/[가-힯]/g) > 0.2) return 'ko';

  const mots = ` ${normalizeText(texte)} `;
  const compte = (liste: string[]) =>
    liste.reduce((total, mot) => total + (mots.split(` ${mot} `).length - 1), 0);
  const scores: [string, number][] = [
    ['en', compte(['the', 'and', 'with', 'you', 'our', 'will', 'for'])],
    ['fr', compte(['les', 'des', 'vous', 'nous', 'avec', 'une', 'pour'])],
    ['es', compte(['los', 'las', 'con', 'para', 'una', 'nuestro', 'del'])],
  ];
  scores.sort((a, b) => b[1] - a[1]);
  const [premier, second] = scores;
  if (!premier || premier[1] < 4 || (second && premier[1] < second[1] * 1.5)) return null;
  return premier[0];
}

const EXIGENCES_LANGUE: [string, RegExp][] = [
  [
    'ja',
    /\b(jlpt|n[12]\b.{0,20}japanese|japanese.{0,40}(fluen|native|business|proficien|n[12]\b)|(fluen|native|business.level|proficien)\w*.{0,25}japanese)|日本語(能力|が|で|レベル|ネイティブ|ビジネス)/i,
  ],
  [
    'ko',
    /\b(topik|korean.{0,40}(fluen|native|business|proficien)|(fluen|native|business.level|proficien)\w*.{0,25}korean)|한국어/i,
  ],
  [
    'es',
    /\b(spanish.{0,40}(fluen|native|proficien|advanced)|(fluen|native|proficien|advanced)\w*.{0,25}spanish|espa[nñ]ol (nativo|avanzado|fluido))/i,
  ],
];

const LANGUE_NON_EXIGEE =
  /\b(no|not|without)\b.{0,30}(japanese|korean|spanish).{0,20}(required|needed|necessary)|(japanese|korean|spanish).{0,30}(not required|is a plus|nice to have|is not necessary|optional|preferred but)/i;

function detecterLangues(brut: string): string[] {
  const langues = new Set<string>();
  const redaction = detecterLangue(brut);
  // Une annonce rédigée en japonais, coréen ou espagnol suppose de lire cette langue.
  if (redaction && redaction !== 'en' && redaction !== 'fr') langues.add(redaction);
  for (const [langue, motif] of EXIGENCES_LANGUE) {
    const trouve = motif.exec(brut);
    if (!trouve) continue;
    const autour = brut.slice(Math.max(0, trouve.index - 60), trouve.index + trouve[0].length + 60);
    if (!LANGUE_NON_EXIGEE.test(autour)) langues.add(langue);
  }
  return [...langues];
}

const SAISONS: Record<string, 'ete' | 'autre'> = {
  summer: 'ete',
  ete: 'ete',
  verano: 'ete',
  fall: 'autre',
  autumn: 'autre',
  automne: 'autre',
  otono: 'autre',
  winter: 'autre',
  hiver: 'autre',
  invierno: 'autre',
  spring: 'autre',
  printemps: 'autre',
  primavera: 'autre',
};

/**
 * Compatibilité d'un stage avec l'été visé (§4.2) : « explicite » si l'annonce cite l'été de la
 * bonne année, « incompatible » si elle cite une autre saison ou une autre année, sinon non précisée.
 */
function detecterPeriodeStage(titre: string, description: string, profil: Profil): Periode {
  const annee = profil.stage.debut.slice(0, 4);
  const saisons = Object.keys(SAISONS).join('|');
  const motif = new RegExp(`\\b(?:(${saisons}) (20\\d\\d)|(20\\d\\d) (${saisons}))\\b`, 'g');

  let ete = false;
  let autre = false;
  for (const texte of [titre, description]) {
    for (const trouve of texte.matchAll(motif)) {
      const saison = SAISONS[(trouve[1] ?? trouve[4])!];
      const an = trouve[2] ?? trouve[3];
      if (saison === 'ete' && an === annee) ete = true;
      else autre = true;
    }
    // Le titre prime : « Summer 2027 » dans le titre l'emporte sur une autre saison citée plus bas.
    if (ete) return 'explicite';
    if (autre) return 'incompatible';
  }

  // Sans saison : une année dans le titre (« Intern 2026 ») suffit à trancher.
  const annees = [...titre.matchAll(/\b(20\d\d)\b/g)].map((trouve) => trouve[1]);
  if (annees.length > 0) return annees.includes(annee) ? 'explicite' : 'incompatible';
  return 'non_precisee';
}

function detecterNiveau(titre: string, description: string, motsCles: MotsCles): Niveau {
  const texte = `${titre} ${description}`;
  if (contientUn(titre, motsCles.niveau_trop_eleve)) return 'trop_eleve';
  if (contientUn(texte, motsCles.niveau_accessible)) return 'accessible';
  if (contientUn(texte, motsCles.niveau_trop_eleve)) return 'trop_eleve';
  return 'non_precise';
}

/** « 3+ years of experience », « 2 ans d'expérience », « 5 años de experiencia »… */
function experienceExigee(description: string): number {
  let max = 0;
  const motif =
    /\b(\d{1,2})\s?\+?\s?(?:years?|yrs?|ans|annees|anos)\b.{0,30}\b(?:experience|experiencia)\b/g;
  for (const trouve of description.matchAll(motif)) max = Math.max(max, Number(trouve[1]));
  return max;
}

/**
 * Classe une offre d'après son titre et sa description (§4.2).
 * Fonction pure : mêmes textes, mêmes mots-clés, même résultat.
 */
export function classify(offre: TexteOffre, motsCles: MotsCles, profil: Profil): Classification {
  const brut = `${offre.titre}\n${offre.description ?? ''}`;
  const titre = normalizeText(offre.titre);
  const description = normalizeText(offre.description);

  const type = detecterType(titre, motsCles, offre.type_source);
  const domaines = detecterDomaines(titre, description, motsCles);
  const niveau = detecterNiveau(titre, description, motsCles);
  const periode: Periode =
    type === 'stage' ? detecterPeriodeStage(titre, description, profil) : 'non_precisee';

  let exclue_raison: string | null = null;
  const horsDomaine = contientUn(titre, motsCles.hors_domaine);
  const fortDansTitre = DOMAINES.some((domaine) =>
    contientUn(titre, motsCles.domaines[domaine].forts),
  );
  const annees = experienceExigee(description);
  if (domaines.length === 0 || (horsDomaine && !fortDansTitre)) exclue_raison = 'Hors domaine';
  else if (niveau === 'trop_eleve') exclue_raison = 'Niveau trop élevé (Bac+4/5, fin d’études)';
  else if (annees >= 2) exclue_raison = `${annees} ans d’expérience exigés`;
  else if (periode === 'incompatible') exclue_raison = 'Période incompatible';

  return {
    type,
    domaines: exclue_raison === 'Hors domaine' && horsDomaine && !fortDansTitre ? [] : domaines,
    langues_requises: detecterLangues(brut),
    niveau,
    periode,
    exclue_raison,
  };
}
