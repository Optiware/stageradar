import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Connector } from '@stageradar/shared';
import { parse } from 'yaml';
import { ATS_IDS, atsConnector, type AtsId, type WatchlistEntry } from './ats';

// Sur le serveur, le collecteur est un fichier unique : le chemin de la liste lui est donné.
const WATCHLIST =
  process.env.STAGERADAR_WATCHLIST ??
  join(import.meta.dirname, '../../../../config/watchlist.yaml');

/** Lit et valide `config/watchlist.yaml` : une entrée mal formée arrête la collecte avec un message clair. */
export function loadWatchlist(chemin: string = WATCHLIST): WatchlistEntry[] {
  const entrees = parse(readFileSync(chemin, 'utf8')) as unknown;
  if (!Array.isArray(entrees)) throw new Error(`${chemin} : une liste est attendue`);

  const vus = new Set<string>();
  return entrees.map((entree: Partial<WatchlistEntry>, index) => {
    const ou = `${chemin}, entrée ${index + 1} (${entree.nom ?? 'sans nom'})`;
    if (!entree.nom || !entree.slug || !entree.url_carriere || !entree.verifie_le) {
      throw new Error(`${ou} : nom, slug, url_carriere et verifie_le sont obligatoires`);
    }
    if (!ATS_IDS.includes(entree.ats as AtsId)) {
      throw new Error(`${ou} : ats doit valoir ${ATS_IDS.join(', ')}`);
    }
    const pays = [...(entree.pays ?? []), ...(entree.pays_defaut ? [entree.pays_defaut] : [])];
    if (pays.length === 0 || pays.some((code) => !/^[A-Z]{2}$/.test(code))) {
      throw new Error(`${ou} : pays doit lister des codes ISO à deux lettres`);
    }
    const cle = `${entree.ats}:${entree.slug}`;
    if (vus.has(cle)) throw new Error(`${ou} : ${cle} est déjà dans la liste`);
    vus.add(cle);
    // YAML lit une date nue comme un objet Date : on la garde en texte AAAA-MM-JJ.
    const verifie_le = new Date(entree.verifie_le).toISOString().slice(0, 10);
    return { ...entree, verifie_le } as WatchlistEntry;
  });
}

/**
 * Connecteurs exécutés à chaque collecte : un par entreprise de la watchlist.
 * Adzuna (clé à créer) et La bonne alternance (Lot 1) s'ajouteront ici.
 */
export function buildConnectors(): Connector[] {
  return loadWatchlist().map((entree) => atsConnector(entree));
}
