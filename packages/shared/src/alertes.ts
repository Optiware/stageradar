// Alertes e-mail de LinkedIn et d'Indeed : l'utilisateur colle une alerte reçue, l'application y
// repère les liens d'offres et les propose à l'import. Aucune page de ces sites n'est téléchargée
// (cahier des charges §3.4) : l'offre est créée avec ce que l'e-mail contient.
//
// Les formats exacts de ces e-mails ne sont pas publiés : le repérage reste volontairement large
// (adresse d'offre reconnue, texte voisin), et chaque offre est montrée avant d'être importée.

export interface OffreAlerte {
  source: 'linkedin' | 'indeed';
  /** Adresse canonique de l'offre. */
  url: string;
  titre: string | null;
  /** Lignes voisines (entreprise, lieu…), telles qu'elles sont dans l'e-mail. */
  contexte: string[];
}

/** Décode un e-mail « quoted-printable » (affichage « Message d'origine » de Gmail). */
export function decoderQuotedPrintable(texte: string): string {
  // Signes sûrs : coupures douces en fin de ligne, ou « = » codé en =3D. Un simple « jk=11… »
  // dans une adresse ne doit pas déclencher le décodage.
  if (!/=\r?\n|=3D/.test(texte)) return texte;
  const sansCoupures = texte.replace(/=\r?\n/g, '');
  const octets: number[] = [];
  for (let rang = 0; rang < sansCoupures.length; rang++) {
    const hexa = sansCoupures.slice(rang + 1, rang + 3);
    if (sansCoupures[rang] === '=' && /^[0-9A-F]{2}$/.test(hexa)) {
      octets.push(parseInt(hexa, 16));
      rang += 2;
    } else {
      octets.push(...new TextEncoder().encode(sansCoupures[rang]!));
    }
  }
  return new TextDecoder().decode(new Uint8Array(octets));
}

function decoderEntites(texte: string): string {
  return texte
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

/** Adresse canonique d'une offre LinkedIn ou Indeed, ou `null` si ce n'en est pas une. */
export function urlOffreAlerte(
  adresse: string,
): { source: OffreAlerte['source']; url: string } | null {
  let url: URL;
  try {
    url = new URL(decoderEntites(adresse));
  } catch {
    return null;
  }
  const hote = url.hostname.toLowerCase();
  if (/(^|\.)linkedin\.com$/.test(hote)) {
    const id = /\/jobs\/view\/(?:[^/]*-)?(\d{6,})/.exec(url.pathname)?.[1];
    return id ? { source: 'linkedin', url: `https://www.linkedin.com/jobs/view/${id}/` } : null;
  }
  if (/(^|\.)indeed\.[a-z.]+$/.test(hote)) {
    const jk = url.searchParams.get('jk') ?? url.searchParams.get('vjk');
    return jk && /^[0-9a-f]{8,}$/i.test(jk)
      ? { source: 'indeed', url: `https://${hote}/viewjob?jk=${jk}` }
      : null;
  }
  return null;
}

const BRUIT =
  /^(view job|voir l['’]offre|ver empleo|apply|postuler|see all jobs|new|nouveau|nuevo|easy apply|candidature simplifiée|\W*)\s*[:：]?$/i;

/** Texte lisible d'un e-mail HTML : une ligne par bloc, sans balises. */
function texteDepuisHtml(html: string): string {
  return decoderEntites(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
      .replace(/<br\s*\/?>|<\/(p|div|tr|td|li|h\d|table)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  );
}

/**
 * Repère les offres d'une alerte collée. Dans le HTML, le texte du lien sert de titre ; dans le
 * texte brut, ce sont les lignes qui précèdent l'adresse.
 */
export function lireAlerte(contenu: string): OffreAlerte[] {
  const texte = decoderQuotedPrintable(contenu);
  const trouvees = new Map<string, OffreAlerte>();

  for (const [, adresse, interieur] of texte.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
  )) {
    const offre = urlOffreAlerte(adresse!);
    if (!offre) continue;
    const titre = texteDepuisHtml(interieur!).replace(/\s+/g, ' ').trim();
    const existante = trouvees.get(offre.url);
    if (existante && existante.titre) continue;
    trouvees.set(offre.url, {
      ...offre,
      titre: titre && !BRUIT.test(titre) ? titre : (existante?.titre ?? null),
      contexte: [],
    });
  }

  // Texte brut (ou partie texte de l'e-mail) : les lignes au-dessus de chaque adresse.
  const lignes = (/<html|<a\b/i.test(texte) ? texteDepuisHtml(texte) : texte)
    .split(/\r?\n/)
    .map((ligne) => ligne.trim());
  let debutBloc = 0;
  lignes.forEach((ligne, rang) => {
    for (const [adresse] of ligne.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
      const offre = urlOffreAlerte(adresse);
      if (!offre) continue;
      const avant = lignes
        .slice(debutBloc, rang)
        .concat(ligne.replace(adresse, '').trim())
        .filter((autre) => autre && !BRUIT.test(autre) && !/https?:\/\//.test(autre));
      const voisines = avant.slice(-3);
      const existante = trouvees.get(offre.url);
      trouvees.set(offre.url, {
        ...offre,
        titre: existante?.titre ?? voisines[0] ?? null,
        contexte: existante?.contexte.length ? existante.contexte : voisines.slice(1),
      });
      debutBloc = rang + 1;
    }
  });

  return [...trouvees.values()];
}

/** Recherche LinkedIn publique (format vérifié le 13 octobre 2026, cf. liens de recherche). */
export function rechercheLinkedin(motsCles: string, lieu: string): string {
  const params = new URLSearchParams({ keywords: motsCles, location: lieu });
  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
}

/** Domaine Indeed de chaque pays visé. */
export const DOMAINES_INDEED: Record<string, string> = {
  FR: 'fr.indeed.com',
  JP: 'jp.indeed.com',
  KR: 'kr.indeed.com',
  CO: 'co.indeed.com',
  CA: 'ca.indeed.com',
  GB: 'uk.indeed.com',
};

/**
 * Recherche Indeed (paramètres `q` et `l`). Indeed refuse la lecture automatique : ce format n'a
 * pas pu être vérifié par un robot, il se confirme en ouvrant le lien.
 */
export function rechercheIndeed(pays: string, motsCles: string, lieu: string): string {
  const params = new URLSearchParams({ q: motsCles, l: lieu });
  return `https://${DOMAINES_INDEED[pays] ?? 'www.indeed.com'}/jobs?${params.toString()}`;
}
