import { ajouterJours, lundiDe } from './suivi';
import { STATUTS_SUIVI, type StatutSuivi } from './types';

/** Ce qu'il faut d'une candidature pour les statistiques. */
export interface CandidatureComptee {
  statut: StatutSuivi;
  date_candidature: string | null;
  pays: string | null;
  /** Vrai pour une candidature spontanée (sans offre). */
  spontanee: boolean;
}

/** Colonnes qui supposent une candidature envoyée. */
const ENVOYEES: readonly StatutSuivi[] = ['postule', 'relance', 'entretien', 'offre', 'refus'];
/** Colonnes qui supposent une réponse de l'entreprise. */
const REPONDUES: readonly StatutSuivi[] = ['entretien', 'offre', 'refus'];

export interface Taux {
  envoyees: number;
  reponses: number;
  entretiens: number;
  offres: number;
  /** Part des candidatures envoyées qui ont reçu une réponse, de 0 à 1 ; `null` sans envoi. */
  taux_reponse: number | null;
}

export function taux(candidatures: Pick<CandidatureComptee, 'statut'>[]): Taux {
  const compter = (statuts: readonly StatutSuivi[]) =>
    candidatures.filter((candidature) => statuts.includes(candidature.statut)).length;
  const envoyees = compter(ENVOYEES);
  const reponses = compter(REPONDUES);
  return {
    envoyees,
    reponses,
    entretiens: compter(['entretien', 'offre']),
    offres: compter(['offre']),
    taux_reponse: envoyees === 0 ? null : reponses / envoyees,
  };
}

/** Nombre de candidatures dans chaque colonne, dans l'ordre du tableau de suivi. */
export function parStatut(
  candidatures: Pick<CandidatureComptee, 'statut'>[],
): { statut: StatutSuivi; nombre: number }[] {
  return STATUTS_SUIVI.map((statut) => ({
    statut,
    nombre: candidatures.filter((candidature) => candidature.statut === statut).length,
  }));
}

/** Taux par groupe (pays, type de candidature…), les groupes les plus fournis d'abord. */
export function tauxPar<T extends Pick<CandidatureComptee, 'statut'>>(
  candidatures: T[],
  groupe: (candidature: T) => string,
): { groupe: string; taux: Taux }[] {
  const groupes = new Map<string, T[]>();
  for (const candidature of candidatures) {
    const cle = groupe(candidature);
    groupes.set(cle, [...(groupes.get(cle) ?? []), candidature]);
  }
  return [...groupes.entries()]
    .map(([cle, membres]) => ({ groupe: cle, taux: taux(membres) }))
    .filter((ligne) => ligne.taux.envoyees > 0)
    .sort((a, b) => b.taux.envoyees - a.taux.envoyees || a.groupe.localeCompare(b.groupe));
}

/** Candidatures envoyées par semaine, sur les `nombre` dernières semaines (la plus ancienne d'abord). */
export function parSemaine(
  candidatures: Pick<CandidatureComptee, 'date_candidature'>[],
  aujourdhui: string,
  nombre: number,
): { lundi: string; envoyees: number }[] {
  const dernier = lundiDe(aujourdhui);
  return Array.from({ length: nombre }, (_, rang) => {
    const lundi = ajouterJours(dernier, -7 * (nombre - 1 - rang));
    const dimanche = ajouterJours(lundi, 6);
    return {
      lundi,
      envoyees: candidatures.filter(
        ({ date_candidature: jour }) => jour !== null && jour >= lundi && jour <= dimanche,
      ).length,
    };
  });
}
