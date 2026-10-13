import { PostgrestClient } from '@supabase/postgrest-js';
import {
  DEFAULT_POIDS,
  DEFAULT_PROFIL,
  mergeKeywords,
  type MotsCles,
  type Poids,
  type Profil,
} from '@stageradar/shared';
import type { OffreEnrichie, Reglages } from './enrich';
import type { ConnectorResult } from './run-connectors';

/** Ce dont la collecte a besoin côté base. Remplacé par un double dans les tests. */
export interface Store {
  lireReglages(): Promise<Reglages>;
  /** Enregistre une offre ; `nouvelle` est vrai si elle n'était pas encore connue. */
  enregistrer(offre: OffreEnrichie, runId: string): Promise<{ id: string; nouvelle: boolean }>;
  /** Enregistre une offre ajoutée à la main et renvoie son identifiant. */
  importer(offre: OffreEnrichie): Promise<{ id: string; nouvelle: boolean }>;
  /** Clôt la collecte d'une source lue en entier ; renvoie le nombre d'offres désactivées. */
  cloreSource(source: string, runId: string): Promise<number>;
  journaliser(runId: string, resultat: ConnectorResult, nbNouvelles: number): Promise<void>;
}

/** Sans base : réglages par défaut, aucune écriture. Pour `npm run collect -- --a-blanc`. */
export function createDryStore(): Store {
  return {
    lireReglages: () =>
      Promise.resolve({
        profil: DEFAULT_PROFIL,
        poids: DEFAULT_POIDS,
        motsCles: mergeKeywords(null),
      }),
    enregistrer: () => Promise.resolve({ id: '', nouvelle: false }),
    importer: () => Promise.resolve({ id: '', nouvelle: false }),
    cloreSource: () => Promise.resolve(0),
    journaliser: () => Promise.resolve(),
  };
}

/**
 * Accès à la base par PostgREST, avec la clé secrète (rôle service_role, qui contourne la RLS).
 * `url` est la racine de PostgREST : http://rest:3000 sur le serveur, http://127.0.0.1:54332 en local.
 */
export function createStore(url: string, cleSecrete: string): Store {
  const db = new PostgrestClient(url, {
    headers: { Authorization: `Bearer ${cleSecrete}`, apikey: cleSecrete },
  });

  return {
    async lireReglages() {
      const { data, error } = await db.from('settings').select('profil, poids, mots_cles').single<{
        profil: Partial<Profil>;
        poids: Partial<Poids>;
        mots_cles: Partial<MotsCles>;
      }>();
      if (error) throw new Error(`Lecture des réglages : ${error.message}`);
      return {
        profil: {
          alternance: { ...DEFAULT_PROFIL.alternance, ...data.profil.alternance },
          stage: { ...DEFAULT_PROFIL.stage, ...data.profil.stage },
          langues: data.profil.langues ?? DEFAULT_PROFIL.langues,
        },
        poids: { ...DEFAULT_POIDS, ...data.poids },
        motsCles: mergeKeywords(data.mots_cles),
      };
    },

    async enregistrer(offre, runId) {
      const { data, error } = await db
        .rpc('ingest_offer', { o: offre, p_run_id: runId })
        .single<{ offer_id: string; nouvelle: boolean }>();
      if (error) throw new Error(`Enregistrement de « ${offre.titre} » : ${error.message}`);
      return { id: data.offer_id, nouvelle: data.nouvelle };
    },

    async importer(offre) {
      const { data, error } = await db
        .rpc('ingest_offer', { o: offre, p_run_id: 'manuel' })
        .single<{ offer_id: string; nouvelle: boolean }>();
      if (error) throw new Error(`Import de « ${offre.titre} » : ${error.message}`);
      return { id: data.offer_id, nouvelle: data.nouvelle };
    },

    async cloreSource(source, runId) {
      const { data, error } = await db.rpc('close_source_run', {
        p_source: source,
        p_run_id: runId,
      });
      if (error) throw new Error(`Clôture de ${source} : ${error.message}`);
      return data as number;
    },

    async journaliser(runId, resultat, nbNouvelles) {
      const { error } = await db.from('sources_status').insert({
        source: resultat.source,
        run_id: runId,
        debut: resultat.debut.toISOString(),
        fin: resultat.fin.toISOString(),
        statut: resultat.statut,
        nb_offres: resultat.offers.length,
        nb_nouvelles: nbNouvelles,
        erreurs: resultat.erreurs.slice(0, 20),
      });
      if (error) throw new Error(`Journal de ${resultat.source} : ${error.message}`);
    },
  };
}
