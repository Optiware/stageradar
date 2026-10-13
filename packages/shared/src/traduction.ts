/** Langues lues sans aide : une annonce rédigée dans une autre langue est proposée à la traduction. */
export const LANGUES_LUES: readonly string[] = ['fr', 'en'];

export const LANGUE_CIBLE = 'fr';

export function aTraduire(langue: string | null): langue is string {
  return langue !== null && !LANGUES_LUES.includes(langue);
}

/** Traduction d'une annonce, telle qu'enregistrée dans `offers.traduction`. */
export interface TraductionOffre {
  /** Langue d'origine (code ISO 639-1). */
  langue: string;
  titre: string;
  description: string | null;
  /** Jour de la traduction (AAAA-MM-JJ). */
  date: string;
}

const ECRITURE: Record<string, RegExp> = {
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
};

export interface Segment {
  /** Puce ou retrait en début de ligne, recopié tel quel. */
  prefixe: string;
  texte: string;
  /** Faux pour une ligne vide ou déjà lisible (passage en anglais dans une annonce japonaise). */
  traduire: boolean;
}

/**
 * Découpe un texte ligne par ligne pour le traducteur : la mise en page (paragraphes, puces) est
 * conservée, et les lignes qui ne sont pas dans la langue d'origine sont laissées telles quelles.
 * Les annonces japonaises et coréennes mêlent souvent des passages en anglais, qu'un traducteur
 * réglé sur « japonais vers français » abîmerait.
 */
export function decouperPourTraduction(texte: string, langue: string): Segment[] {
  const ecriture = ECRITURE[langue] ?? /\p{L}/u;
  return texte.split('\n').map((ligne) => {
    const prefixe = /^[\s•\-–*·]*/u.exec(ligne)?.[0] ?? '';
    const reste = ligne.slice(prefixe.length);
    return { prefixe, texte: reste, traduire: ecriture.test(reste) };
  });
}

// Google Traduction : deux adresses publiques, ouvertes dans un nouvel onglet (aucune clé, rien
// n'est envoyé par l'application elle-même). Vérifiées le 13 octobre 2026 : la première répond par
// une redirection vers <site>.translate.goog, la seconde ouvre le traducteur avec le texte rempli.

/** Page web traduite en français par Google Traduction. */
export function lienGoogleTraductionPage(url: string): string {
  return `https://translate.google.com/translate?sl=auto&tl=${LANGUE_CIBLE}&u=${encodeURIComponent(url)}`;
}

/** Longueur maximale du texte une fois encodé : au-delà, l'adresse risque d'être refusée. */
const ADRESSE_MAX = 6000;

/**
 * Texte ouvert dans Google Traduction. Un texte trop long pour tenir dans une adresse est coupé :
 * `complet` l'indique.
 */
export function lienGoogleTraductionTexte(texte: string): { url: string; complet: boolean } {
  let extrait = texte;
  let encode = encodeURIComponent(extrait);
  while (encode.length > ADRESSE_MAX) {
    // Coupe par caractères entiers (un idéogramme ne doit pas être tranché en deux).
    const caracteres = [...extrait];
    extrait = caracteres
      .slice(0, Math.floor((caracteres.length * ADRESSE_MAX) / encode.length) - 1)
      .join('');
    encode = encodeURIComponent(extrait);
  }
  return {
    url: `https://translate.google.com/?sl=auto&tl=${LANGUE_CIBLE}&text=${encode}&op=translate`,
    complet: extrait.length === texte.length,
  };
}
