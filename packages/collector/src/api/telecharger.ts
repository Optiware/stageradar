import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// Lecture d'une page à la demande de l'utilisateur (import manuel d'une offre). Le serveur
// télécharge une adresse qu'on lui donne : il ne doit jamais pouvoir être envoyé vers lui-même,
// vers les autres services du serveur ou vers un réseau privé.

const USER_AGENT = 'StageRadar/0.1 (agregateur personnel, import a la demande)';
const DELAI_MS = 15_000;
const TAILLE_MAX = 2 * 1024 * 1024;
const REDIRECTIONS_MAX = 4;

export class PageIllisible extends Error {}

function ipv4Privee(adresse: string): boolean {
  const [a = 0, b = 0, c = 0] = adresse.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

/** Vrai pour une adresse locale, privée ou réservée (IPv4 ou IPv6). */
export function adressePrivee(adresse: string): boolean {
  if (isIP(adresse) === 4) return ipv4Privee(adresse);
  const ip = adresse.toLowerCase();
  // Adresse IPv4 présentée en IPv6 (::ffff:10.0.0.1).
  const v4 = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip)?.[1];
  if (v4) return ipv4Privee(v4);
  return (
    ip === '::' ||
    ip === '::1' ||
    ip.startsWith('fc') ||
    ip.startsWith('fd') ||
    /^fe[89ab]/.test(ip) ||
    ip.startsWith('ff')
  );
}

export type Resolveur = (hote: string) => Promise<string[]>;

const resoudreDns: Resolveur = async (hote) =>
  (await lookup(hote, { all: true })).map(({ address }) => address);

/** Refuse tout ce qui n'est pas une page web publique ordinaire. */
async function verifier(url: URL, resoudre: Resolveur): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new PageIllisible('Seules les adresses http et https sont acceptées.');
  }
  if (url.username || url.password || (url.port && url.port !== '80' && url.port !== '443')) {
    throw new PageIllisible('Adresse refusée (identifiants ou port inhabituel).');
  }
  const hote = url.hostname.replace(/^\[|\]$/g, '');
  const adresses = isIP(hote) ? [hote] : await resoudre(hote).catch(() => []);
  if (adresses.length === 0) throw new PageIllisible(`Site introuvable : ${hote}`);
  if (adresses.some(adressePrivee)) {
    throw new PageIllisible('Adresse refusée : elle ne mène pas à un site public.');
  }
}

async function corps(reponse: Response): Promise<string> {
  const lecteur = reponse.body?.getReader();
  if (!lecteur) return '';
  const morceaux: Uint8Array[] = [];
  let taille = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    taille += value.length;
    if (taille > TAILLE_MAX) {
      await lecteur.cancel();
      throw new PageIllisible('Page trop volumineuse.');
    }
    morceaux.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(morceaux));
}

export interface OptionsLecture {
  fetchImpl?: typeof fetch;
  resoudre?: Resolveur;
}

/** HTML d'une page publique. Chaque redirection est contrôlée comme l'adresse de départ. */
export async function lirePage(adresse: string, options: OptionsLecture = {}): Promise<string> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const resoudre = options.resoudre ?? resoudreDns;
  let url: URL;
  try {
    url = new URL(adresse);
  } catch {
    throw new PageIllisible("Ce n'est pas une adresse web.");
  }

  for (let saut = 0; saut <= REDIRECTIONS_MAX; saut++) {
    await verifier(url, resoudre);
    let reponse: Response;
    try {
      reponse = await fetchImpl(url, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
        signal: AbortSignal.timeout(DELAI_MS),
      });
    } catch {
      throw new PageIllisible(`Le site ${url.hostname} n'a pas répondu.`);
    }
    const suite = reponse.headers.get('location');
    if (reponse.status >= 300 && reponse.status < 400 && suite) {
      url = new URL(suite, url);
      continue;
    }
    if (!reponse.ok) throw new PageIllisible(`Le site a répondu ${reponse.status}.`);
    if (!/html|text\/plain/i.test(reponse.headers.get('content-type') ?? '')) {
      throw new PageIllisible("Cette adresse n'est pas une page web.");
    }
    return corps(reponse);
  }
  throw new PageIllisible('Trop de redirections.');
}
