// Accès HTTP du collecteur : agent identifiable, délai maximal, nouvelles tentatives espacées,
// et une pause entre deux appels au même hôte (§3 « Règles absolues »).

const USER_AGENT = 'StageRadar/0.1 (agregateur personnel, usage non commercial)';
const DELAI_MS = 30_000;
const PAUSE_PAR_HOTE_MS = 500;
const TENTATIVES = 3;

/** Erreur HTTP définitive : la source a répondu, mais pas avec ce qu'on attendait. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    url: string,
  ) {
    super(`HTTP ${status} pour ${url}`);
  }
}

const dernierAppel = new Map<string, Promise<void>>();

const attendre = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Met les appels vers un même hôte en file, espacés de PAUSE_PAR_HOTE_MS. */
function tour(hote: string): Promise<void> {
  const precedent = dernierAppel.get(hote) ?? Promise.resolve();
  const mien = precedent.then(() => attendre(PAUSE_PAR_HOTE_MS));
  dernierAppel.set(hote, mien);
  return precedent;
}

export interface FetchJsonOptions {
  signal?: AbortSignal;
  /** Remplaçable dans les tests. */
  fetchImpl?: typeof fetch;
  headers?: Record<string, string>;
}

/**
 * GET d'un document JSON. Réessaie sur une erreur réseau, un 429 ou un 5xx (1 s, puis 3 s) ;
 * un 404 ou un autre 4xx échoue tout de suite : réessayer n'y changerait rien.
 */
export async function fetchJson<T>(url: string, options: FetchJsonOptions = {}): Promise<T> {
  const fetchImpl = options.fetchImpl ?? fetch;
  let derniere: unknown;
  for (let tentative = 0; tentative < TENTATIVES; tentative++) {
    if (tentative > 0) await attendre(tentative === 1 ? 1000 : 3000);
    await tour(new URL(url).host);
    try {
      const signaux = [AbortSignal.timeout(DELAI_MS)];
      if (options.signal) signaux.push(options.signal);
      const reponse = await fetchImpl(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...options.headers },
        signal: AbortSignal.any(signaux),
      });
      if (reponse.ok) return (await reponse.json()) as T;
      const erreur = new HttpError(reponse.status, url);
      if (reponse.status !== 429 && reponse.status < 500) throw erreur;
      derniere = erreur;
    } catch (erreur) {
      if (erreur instanceof HttpError && erreur.status !== 429 && erreur.status < 500) throw erreur;
      if (options.signal?.aborted) throw erreur;
      derniere = erreur;
    }
  }
  throw derniere;
}
