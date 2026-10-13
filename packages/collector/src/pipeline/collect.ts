import type { Connector } from '@stageradar/shared';
import { enrich, type OffreEnrichie } from './enrich';
import { runConnectors } from './run-connectors';
import type { Store } from './store';

export interface BilanSource {
  source: string;
  statut: 'ok' | 'partiel' | 'erreur';
  /** Annonces renvoyées par la source. */
  lues: number;
  /** Annonces dans le périmètre (stage dans un pays visé, alternance en France). */
  retenues: number;
  nouvelles: number;
  desactivees: number;
  erreurs: string[];
}

export interface OptionsCollecte {
  runId: string;
  maintenant: Date;
  /** Sans écriture : classe et note, mais n'enregistre rien. */
  aBlanc?: boolean;
  signal?: AbortSignal;
  /** Appelé pour chaque offre retenue (affichage en mode à blanc). */
  surOffre?: (offre: OffreEnrichie) => void;
}

/**
 * Une collecte complète : lecture des réglages, exécution des connecteurs, classification,
 * notation, enregistrement (avec dédoublonnage en base) et journal par source.
 * Une source en échec n'interrompt pas les autres (§5.4).
 */
export async function collect(
  connectors: Connector[],
  store: Store,
  options: OptionsCollecte,
): Promise<BilanSource[]> {
  const reglages = await store.lireReglages();
  const resultats = await runConnectors(connectors, {
    signal: options.signal,
    pays: reglages.profil.stage.pays,
  });

  const bilans: BilanSource[] = [];
  for (const resultat of resultats) {
    const bilan: BilanSource = {
      source: resultat.source,
      statut: resultat.statut,
      lues: resultat.offers.length,
      retenues: 0,
      nouvelles: 0,
      desactivees: 0,
      erreurs: [...resultat.erreurs],
    };

    for (const offre of resultat.offers) {
      const enrichie = enrich(offre, reglages, options.maintenant);
      if (!enrichie) continue;
      bilan.retenues++;
      options.surOffre?.(enrichie);
      if (options.aBlanc) continue;
      try {
        if (await store.enregistrer(enrichie, options.runId)) bilan.nouvelles++;
      } catch (erreur) {
        bilan.erreurs.push(erreur instanceof Error ? erreur.message : String(erreur));
        if (bilan.statut === 'ok') bilan.statut = 'partiel';
      }
    }

    if (!options.aBlanc) {
      // Une source en erreur n'a rien dit sur ses offres : on ne compte aucune absence.
      if (resultat.statut !== 'erreur') {
        bilan.desactivees = await store.cloreSource(resultat.source, options.runId);
      }
      await store.journaliser(
        options.runId,
        { ...resultat, statut: bilan.statut, erreurs: bilan.erreurs },
        bilan.nouvelles,
      );
    }
    bilans.push(bilan);
  }
  return bilans;
}
