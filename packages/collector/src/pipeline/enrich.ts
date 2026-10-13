import {
  classify,
  normalizeText,
  scoreOffer,
  type MotsCles,
  type Offer,
  type Poids,
  type Profil,
  type ScoreDetail,
} from '@stageradar/shared';

/** Réglages lus en base au début de chaque collecte. */
export interface Reglages {
  profil: Profil;
  poids: Poids;
  motsCles: MotsCles;
}

/** Offre prête à être enregistrée : classée, notée, avec ses formes normalisées. */
export interface OffreEnrichie extends Offer {
  score: number;
  score_details: ScoreDetail[];
  titre_norm: string;
  entreprise_norm: string;
  periode_compatible: boolean | null;
  exclue_raison: string | null;
}

const DESCRIPTION_MAX = 20_000;

/**
 * Classe et note une offre normalisée (§4.2, §4.3).
 * Renvoie `null` si elle sort du périmètre : ni un stage dans un pays visé, ni une alternance
 * en France. Les sites carrières publient surtout des postes classiques, qu'il est inutile de garder.
 */
export function enrich(offre: Offer, reglages: Reglages, maintenant: Date): OffreEnrichie | null {
  const classe = classify(
    { titre: offre.titre, description: offre.description, type_source: offre.type },
    reglages.motsCles,
    reglages.profil,
  );

  const stageVise =
    classe.type === 'stage' && !!offre.pays && reglages.profil.stage.pays.includes(offre.pays);
  const alternanceVisee = classe.type === 'alternance' && offre.pays === 'FR';
  if (!stageVise && !alternanceVisee) return null;

  const { score, details } = scoreOffer(
    { type: classe.type, pays: offre.pays, date_publication: offre.date_publication },
    classe,
    reglages.profil,
    reglages.poids,
    maintenant,
  );

  return {
    ...offre,
    type: classe.type,
    domaines: classe.domaines,
    langues_requises: classe.langues_requises,
    description: offre.description?.slice(0, DESCRIPTION_MAX) ?? null,
    score,
    score_details: details,
    titre_norm: normalizeText(offre.titre),
    entreprise_norm: normalizeText(offre.entreprise),
    periode_compatible: classe.type === 'stage' ? classe.periode !== 'incompatible' : null,
    exclue_raison: classe.exclue_raison,
  };
}
