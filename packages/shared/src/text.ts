/**
 * Forme normalisée d'un texte pour les comparaisons (dédoublonnage, mots-clés) :
 * minuscules, sans accents, ponctuation remplacée par des espaces, espaces réduits.
 * Les écritures non latines (japonais, coréen) sont conservées.
 */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return '';
  return (
    input
      .normalize('NFKD')
      // Uniquement les diacritiques latins : retirer tous les signes combinants
      // casserait les kana voisés (ジ → シ) et les syllabes coréennes décomposées.
      .replace(/[\u0300-\u036f]+/g, '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}+#]+/gu, ' ')
      .trim()
  );
}

const SANS_ESPACES = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/**
 * Vrai si `mot` apparaît dans `texte` (tous deux normalisés) comme mot entier.
 * Le japonais et le coréen s'écrivent sans espaces : leurs mots se cherchent tels quels.
 */
export function containsWord(texte: string, mot: string): boolean {
  if (SANS_ESPACES.test(mot)) return texte.includes(mot);
  return ` ${texte} `.includes(` ${mot} `);
}
