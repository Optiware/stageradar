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
