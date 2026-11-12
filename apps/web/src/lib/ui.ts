// Classes communes (CAHIER_DES_CHARGES.md §9, C3) : un seul endroit à modifier pour que tous les
// écrans gardent les mêmes cartes, boutons, champs et badges.
// Style de la maquette du 11 novembre 2026 : les couleurs elles-mêmes sont dans index.css.

/** Carte : fond blanc sur page gris bleuté, arrondi de 16 px, bordure légère. */
export const CARTE =
  'rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_1px_2px_rgb(20_22_43/0.04)] md:p-6 dark:border-gray-800 dark:bg-gray-900';

/** Carte cliquable : la bordure passe au bleu au survol. */
export const CARTE_SURVOL = 'transition hover:border-primary-300 dark:hover:border-primary-400';

/** Action principale : bleu plein, texte blanc. */
export const BOUTON_PRINCIPAL =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60 dark:bg-primary-400 dark:text-primary-ink dark:hover:bg-primary-300';

/** Action d'accent sur une carte (« Sauver ») : bleu plein, plus petite. */
export const BOUTON_ACCENT =
  'rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60 dark:bg-primary-400 dark:text-primary-ink dark:hover:bg-primary-300';

/** Action secondaire : fond blanc, bordure grise. */
export const BOUTON_SECONDAIRE =
  'rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-950 transition hover:border-primary-600 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:border-primary-400';

/** Bouton discret, fond bleu très clair : « Écrire », « Ajouter au calendrier ». */
export const BOUTON_DOUX =
  'rounded-xl bg-primary-50 px-4 py-2.5 text-sm font-semibold text-primary-700 transition hover:bg-primary-100 disabled:opacity-60 dark:bg-primary-400/15 dark:text-primary-300 dark:hover:bg-primary-400/25';

export const CHAMP =
  'mt-1.5 block w-full rounded-[0.625rem] border border-gray-300 bg-white px-3.5 py-2.5 text-base dark:border-gray-800 dark:bg-gray-950';

/** Texte secondaire, à l'intérieur d'une carte. */
export const SECONDAIRE = 'text-gray-600 dark:text-gray-400';

const BADGE_BASE = 'rounded-full px-3 py-1 text-[0.8125rem] font-medium whitespace-nowrap';

/** Badges : fond pastel et texte saturé en clair, fond translucide et texte clair en sombre. */
export const BADGE = {
  neutre: `${BADGE_BASE} bg-[#f0f2f7] text-[#2b2e45] dark:bg-gray-850 dark:text-gray-300`,
  accent: `${BADGE_BASE} font-semibold bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300`,
  bleu: `${BADGE_BASE} font-semibold bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300`,
  ambre: `${BADGE_BASE} font-semibold bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300`,
  rouge: `${BADGE_BASE} font-semibold bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300`,
  violet: `${BADGE_BASE} font-semibold bg-[#efe5ff] text-[#5b2eb0] dark:bg-violet-500/20 dark:text-violet-300`,
  orange: `${BADGE_BASE} font-bold bg-orange-50 text-orange-700 dark:bg-orange-500/20 dark:text-orange-100`,
  vert: `${BADGE_BASE} font-semibold bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50`,
} as const;

/** Bouton-filtre en forme de pilule (pays, thème), sélectionné ou non : le choisi est bleu clair. */
export function pilule(choisie: boolean): string {
  return `min-h-10 rounded-full border px-3.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
    choisie
      ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-400/40 dark:bg-primary-400/15 dark:text-primary-300'
      : 'border-gray-300 bg-white text-gray-950 hover:border-primary-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:border-primary-400'
  }`;
}

/** Sélecteur segmenté (« Stage été / Alternance / Tout ») : le rail gris et ses onglets. */
export const SEGMENTS = 'inline-flex gap-1 rounded-full bg-[#e9ebf2] p-1 dark:bg-gray-850';

export function segment(actif: boolean): string {
  return `min-h-10 shrink-0 rounded-full px-4 text-sm transition md:px-[1.125rem] md:text-[0.9375rem] ${
    actif
      ? 'bg-white font-semibold text-gray-950 shadow-[0_1px_3px_rgb(20_22_43/0.12)] dark:bg-gray-900 dark:text-gray-50'
      : 'font-medium text-gray-700 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-50'
  }`;
}

/** Score sur 100 : vert si l'offre colle au profil, ambre si moyenne, gris sinon. */
export function teinteScore(score: number): { fond: string; texte: string; trait: string } {
  if (score >= 75) {
    return {
      fond: 'bg-vert-50 dark:bg-vert-500/20',
      texte: 'text-vert-700 dark:text-vert-50',
      trait: '#1f9d57',
    };
  }
  if (score >= 50) {
    return {
      fond: 'bg-amber-50 dark:bg-amber-500/20',
      texte: 'text-amber-700 dark:text-amber-200',
      trait: '#e0a100',
    };
  }
  return {
    fond: 'bg-[#eef0f5] dark:bg-gray-850',
    texte: 'text-gray-700 dark:text-gray-300',
    trait: '#8a8fa8',
  };
}
