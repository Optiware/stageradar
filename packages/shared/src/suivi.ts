import type { StatutSuivi } from './types';

/** Délai proposé avant une relance, après une candidature ou une première relance (§5.1). */
export const DELAI_RELANCE_JOURS = 7;

/** Jour d'une date au format AAAA-MM-JJ, dans le fuseau de l'appareil. */
export function jourIso(date: Date): string {
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const jour = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mois}-${jour}`;
}

export function ajouterJours(jour: string, nombre: number): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + nombre);
  return date.toISOString().slice(0, 10);
}

/** Lundi de la semaine qui contient ce jour. */
export function lundiDe(jour: string): string {
  const rang = new Date(`${jour}T00:00:00Z`).getUTCDay();
  return ajouterJours(jour, -((rang + 6) % 7));
}

/** Nombre de jours de `debut` à `fin` (négatif si `fin` est avant). */
export function joursEntre(debut: string, fin: string): number {
  const ecart = new Date(`${fin}T00:00:00Z`).getTime() - new Date(`${debut}T00:00:00Z`).getTime();
  return Math.round(ecart / 86_400_000);
}

/** Les champs d'une candidature qui dépendent de sa colonne dans le suivi. */
export interface EtatSuivi {
  statut: StatutSuivi;
  date_candidature: string | null;
  prochaine_relance: string | null;
}

/**
 * État d'une candidature après un changement de colonne :
 * - « Postulé » : la candidature est datée du jour et une relance est proposée à J+7 ;
 * - « Relance » : la relance vient d'être faite, la suivante est proposée sept jours plus tard ;
 * - « Entretien », « Offre », « Refus » : plus rien à relancer ;
 * - retour avant « Postulé » : la candidature n'est plus comptée comme envoyée.
 */
export function changerStatut(avant: EtatSuivi, vers: StatutSuivi, aujourdhui: string): EtatSuivi {
  if (vers === avant.statut) return avant;
  switch (vers) {
    case 'a_etudier':
    case 'a_postuler':
      return { statut: vers, date_candidature: null, prochaine_relance: null };
    case 'postule':
    case 'relance':
      return {
        statut: vers,
        date_candidature: avant.date_candidature ?? aujourdhui,
        prochaine_relance: ajouterJours(aujourdhui, DELAI_RELANCE_JOURS),
      };
    default:
      return { statut: vers, date_candidature: avant.date_candidature, prochaine_relance: null };
  }
}

/** Vrai si une relance est à faire aujourd'hui ou en retard. */
export function relanceDue(candidature: EtatSuivi, aujourdhui: string): boolean {
  return (
    (candidature.statut === 'postule' || candidature.statut === 'relance') &&
    candidature.prochaine_relance !== null &&
    candidature.prochaine_relance <= aujourdhui
  );
}

/** Nombre de candidatures envoyées du lundi au dimanche de la semaine en cours. */
export function envoyeesCetteSemaine(
  candidatures: Pick<EtatSuivi, 'date_candidature'>[],
  aujourdhui: string,
): number {
  const lundi = lundiDe(aujourdhui);
  const dimanche = ajouterJours(lundi, 6);
  return candidatures.filter(
    ({ date_candidature: jour }) => jour !== null && jour >= lundi && jour <= dimanche,
  ).length;
}
