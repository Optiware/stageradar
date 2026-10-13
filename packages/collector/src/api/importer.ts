import {
  adresseDans,
  canonicalUrl,
  extraireOffre,
  lectureInterdite,
  offreDepuisPartage,
} from '@stageradar/shared';
import { enrichirSansPerimetre } from '../pipeline/enrich';
import type { Store } from '../pipeline/store';
import { PageIllisible } from './telecharger';

export interface DemandeImport {
  url?: string | null;
  titre?: string | null;
  texte?: string | null;
}

export interface ResultatImport {
  id: string;
  /** Faux si l'offre était déjà connue (même adresse). */
  nouvelle: boolean;
  /**
   * Comment l'offre a été remplie : `page` (lue sur le site), `partage` (site sans lecture
   * automatique : seuls le titre et le texte fournis sont repris) ou `illisible` (la page n'a pas
   * pu être lue, l'offre est créée avec ce qui a été fourni).
   */
  origine: 'page' | 'partage' | 'illisible';
  titre: string;
}

export class DemandeInvalide extends Error {}

/**
 * Importe une offre choisie par l'utilisateur. Contrairement à la collecte, rien n'est écarté :
 * une offre ajoutée à la main est gardée même hors des pays visés.
 */
export async function importerOffre(
  demande: DemandeImport,
  dependances: { store: Store; lire: (url: string) => Promise<string>; maintenant: Date },
): Promise<ResultatImport> {
  // Certaines applications partagent l'adresse dans le texte (« Titre https://… »).
  const url = demande.url?.trim() || adresseDans(demande.texte) || adresseDans(demande.titre);
  if (!url || !canonicalUrl(url)) {
    throw new DemandeInvalide("Aucune adresse web valide n'a été fournie.");
  }
  const partage = { url, titre: demande.titre, texte: demande.texte };

  let origine: ResultatImport['origine'] = 'partage';
  let offre = offreDepuisPartage(partage);
  if (!lectureInterdite(url)) {
    try {
      const lue = extraireOffre(await dependances.lire(url), url);
      if (lue) {
        offre = lue;
        origine = 'page';
      } else {
        origine = 'illisible';
      }
    } catch (erreur) {
      if (!(erreur instanceof PageIllisible)) throw erreur;
      origine = 'illisible';
    }
  }

  const reglages = await dependances.store.lireReglages();
  const enrichie = enrichirSansPerimetre(offre, reglages, dependances.maintenant);
  const { id, nouvelle } = await dependances.store.importer(enrichie);
  return { id, nouvelle, origine, titre: enrichie.titre };
}
