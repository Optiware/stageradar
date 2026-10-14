// Classes communes du style « Pulse » (CAHIER_DES_CHARGES.md §9, C3) : un seul endroit à modifier
// pour que tous les écrans gardent les mêmes cartes, boutons, champs et badges.
// Palette noir + cyan : les couleurs elles-mêmes sont dans index.css.

/** Carte : fond blanc sur page grise, très arrondie, bordure légère, ombre discrète. */
export const CARTE =
  'rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900';

/** Carte cliquable : la bordure passe au cyan au survol. */
export const CARTE_SURVOL = 'transition hover:border-primary-600 dark:hover:border-primary-400';

/** Action principale : noir en clair, cyan vif en sombre. */
export const BOUTON_PRINCIPAL =
  'rounded-2xl bg-gray-950 px-5 py-3 font-bold text-white transition hover:bg-gray-800 disabled:opacity-60 dark:bg-primary-400 dark:text-primary-ink dark:hover:bg-primary-300';

/** Action d'accent sur une carte (« Sauver ») : cyan foncé, texte blanc. */
export const BOUTON_ACCENT =
  'rounded-2xl bg-primary-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-primary-600 disabled:opacity-60 dark:bg-primary-600 dark:hover:bg-primary-500';

export const BOUTON_SECONDAIRE =
  'rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:border-primary-600 disabled:opacity-60 dark:border-gray-800 dark:hover:border-primary-400';

/** Bouton discret, sur fond gris : action secondaire d'une carte (« Masquer »). */
export const BOUTON_DOUX =
  'rounded-2xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-850 dark:text-gray-300 dark:hover:bg-gray-800';

export const CHAMP =
  'mt-1.5 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base dark:border-gray-800 dark:bg-black';

/** Texte secondaire, à l'intérieur d'une carte. */
export const SECONDAIRE = 'text-gray-600 dark:text-gray-400';

const BADGE_BASE = 'rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap';

/** Badges : fond pastel et texte saturé en clair, fond translucide et texte clair en sombre. */
export const BADGE = {
  neutre: `${BADGE_BASE} bg-gray-100 text-gray-700 dark:bg-gray-850 dark:text-gray-300`,
  accent: `${BADGE_BASE} bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-400`,
  bleu: `${BADGE_BASE} bg-sky-50 text-sky-700 dark:bg-sky-400/15 dark:text-sky-400`,
  ambre: `${BADGE_BASE} bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400`,
  rouge: `${BADGE_BASE} bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-400`,
  violet: `${BADGE_BASE} bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400`,
} as const;

/** Bouton-filtre en forme de pilule (pays, thème), sélectionné ou non : le choisi est en noir. */
export function pilule(choisie: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-sm font-bold whitespace-nowrap transition ${
    choisie
      ? 'border-gray-950 bg-gray-950 text-white dark:border-gray-50 dark:bg-gray-50 dark:text-gray-950'
      : 'border-gray-200 bg-white hover:border-primary-600 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-400'
  }`;
}
