// Paramètres de suivi qui ne changent pas la page affichée.
const PARAMETRES_DE_SUIVI =
  /^(utm_.+|gh_src|lever-source.*|lever-origin|source|src|ref|referrer|trk|trackingid|fbclid|gclid)$/i;

/**
 * Forme canonique d'une adresse d'offre, pour reconnaître deux liens vers la même page (§4.4) :
 * hôte en minuscules sans `www.`, sans fragment, sans paramètres de suivi, sans `/` final.
 */
export function canonicalUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const parametres = [...url.searchParams.entries()]
    .filter(([cle]) => !PARAMETRES_DE_SUIVI.test(cle))
    .sort(([a], [b]) => a.localeCompare(b));
  const requete = new URLSearchParams(parametres).toString();
  const hote = url.hostname.toLowerCase().replace(/^www\./, '');
  const chemin = url.pathname.replace(/\/+$/, '');
  return `https://${hote}${chemin}${requete ? `?${requete}` : ''}`;
}
