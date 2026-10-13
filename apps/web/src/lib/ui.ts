// Classes communes du style « Pulse » (CAHIER_DES_CHARGES.md §9, C3) : un seul endroit à modifier
// pour que tous les écrans gardent les mêmes cartes, boutons, champs et badges.

/** Carte : fond blanc sur page grise, très arrondie, bordure légère, ombre discrète. */
export const CARTE =
  'rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900';

/** Carte cliquable : la bordure passe au vert au survol. */
export const CARTE_SURVOL = 'transition hover:border-primary-400 dark:hover:border-primary-500';

// Texte sombre sur le vert vif : le blanc n'y est pas assez lisible.
export const BOUTON_PRINCIPAL =
  'rounded-2xl bg-primary-500 px-5 py-3 font-bold text-gray-950 transition hover:bg-primary-400 disabled:opacity-60';

export const BOUTON_SECONDAIRE =
  'rounded-2xl border border-gray-200 px-5 py-2.5 text-sm font-bold transition hover:border-primary-400 disabled:opacity-60 dark:border-gray-800 dark:hover:border-primary-500';

export const CHAMP =
  'mt-1.5 block w-full rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-base dark:border-gray-700 dark:bg-gray-950';

/** Texte secondaire, à l'intérieur d'une carte. */
export const SECONDAIRE = 'text-gray-500 dark:text-gray-400';

const BADGE_BASE = 'rounded-full px-3 py-1 text-xs font-bold';

/** Badges : fond pastel et texte saturé en clair, fond translucide et texte clair en sombre. */
export const BADGE = {
  neutre: `${BADGE_BASE} bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300`,
  vert: `${BADGE_BASE} bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400`,
  bleu: `${BADGE_BASE} bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400`,
  ambre: `${BADGE_BASE} bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400`,
  rouge: `${BADGE_BASE} bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400`,
} as const;

/** Bouton-filtre en forme de pilule (pays, thème), sélectionné ou non. */
export function pilule(choisie: boolean): string {
  return `rounded-full border px-3.5 py-1.5 text-sm font-bold transition ${
    choisie
      ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
      : 'border-gray-200 bg-white hover:border-primary-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-500'
  }`;
}
