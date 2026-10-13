const ENTITES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  eacute: 'é',
  egrave: 'è',
  agrave: 'à',
  ccedil: 'ç',
};

/** Remplace les entités HTML (`&amp;`, `&#39;`, `&#x27;`) par leur caractère. */
export function decodeEntities(input: string): string {
  return input.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (tout, corps: string) => {
    if (corps[0] === '#') {
      const code =
        corps[1] === 'x' || corps[1] === 'X'
          ? parseInt(corps.slice(2), 16)
          : parseInt(corps.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : tout;
    }
    return ENTITES[corps.toLowerCase()] ?? tout;
  });
}

/**
 * Texte lisible à partir du HTML d'une annonce : les balises disparaissent, les blocs et les
 * listes deviennent des retours à la ligne. Le résultat est du texte brut, jamais réinjecté en HTML.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return '';
  const texte = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|ul|ol|tr|section)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // Balise restée ouverte en fin de texte (contenu tronqué par la source).
    .replace(/<[a-z/][^>]*$/i, '');
  return decodeEntities(texte)
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
