import { LIBELLES_PAYS, type PaysStage } from '@stageradar/shared';
import type { OffreNouvelle } from '../pipeline/collect';

// Contenu et moment des notifications (§5.3). Fonctions pures : l'envoi est dans envoi.ts.

/** Ce que reçoit le téléphone ou le PC ; lu par apps/web/public/push-sw.js. */
export interface Message {
  titre: string;
  corps: string;
  /** Écran de l'application ouvert par un appui sur la notification. */
  url: string;
  /** Deux notifications de même étiquette se remplacent au lieu de s'empiler. */
  etiquette: string;
}

export interface ReglagesNotifications {
  seuil_push: number;
  resume_quotidien: { actif: boolean; heure: string; fuseau: string };
  heures_calmes: { debut: string; fin: string };
}

export const NOTIFICATIONS_DEFAUT: ReglagesNotifications = {
  seuil_push: 75,
  resume_quotidien: { actif: true, heure: '19:00', fuseau: 'Europe/Paris' },
  heures_calmes: { debut: '22:00', fin: '08:00' },
};

/** Jour (AAAA-MM-JJ) et heure (HH:MM) d'un instant dans un fuseau donné. */
export function momentLocal(date: Date, fuseau: string): { jour: string; heure: string } {
  const parties = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: fuseau,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map(({ type, value }) => [type, value]),
  );
  return {
    jour: `${parties.year}-${parties.month}-${parties.day}`,
    heure: `${parties.hour}:${parties.minute}`,
  };
}

/** Vrai pendant les heures calmes, y compris quand elles passent minuit (22:00 → 08:00). */
export function enHeuresCalmes(heure: string, calmes: { debut: string; fin: string }): boolean {
  const { debut, fin } = calmes;
  if (debut === fin) return false;
  return debut < fin ? heure >= debut && heure < fin : heure >= debut || heure < fin;
}

/** Nombre de minutes à attendre avant la fin des heures calmes. */
export function minutesAvantFin(heure: string, fin: string): number {
  const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  return (minutes(fin) - minutes(heure) + 24 * 60) % (24 * 60);
}

function nomPays(code: string | null): string | null {
  return code ? (LIBELLES_PAYS[code as PaysStage] ?? code) : null;
}

/** Au-delà, les nouvelles offres sont annoncées en une seule notification. */
const DETAIL_MAX = 3;

/**
 * Notifications pour les offres vues pour la première fois : une par offre au score suffisant,
 * ou une seule qui les compte s'il y en a beaucoup. Les offres hors cible ne sont jamais signalées.
 */
export function messagesNouvelles(offres: OffreNouvelle[], seuil: number): Message[] {
  const retenues = offres
    .filter((offre) => offre.exclue_raison === null && offre.score >= seuil)
    .sort((a, b) => b.score - a.score);
  if (retenues.length === 0) return [];
  if (retenues.length > DETAIL_MAX) {
    const meilleure = retenues[0]!;
    return [
      {
        titre: `${retenues.length} nouvelles offres bien notées`,
        corps: `La mieux notée (${meilleure.score}) : ${meilleure.titre}${meilleure.entreprise ? `, ${meilleure.entreprise}` : ''}.`,
        url: '/',
        etiquette: 'nouvelles-offres',
      },
    ];
  }
  return retenues.map((offre) => ({
    titre: `Nouvelle offre notée ${offre.score}`,
    corps: [offre.titre, offre.entreprise, nomPays(offre.pays)].filter(Boolean).join(' · '),
    url: `/?offre=${offre.id}`,
    etiquette: `offre-${offre.id}`,
  }));
}

export interface DonneesResume {
  nouvelles: number;
  relances: number;
  /** Échéances des fiches pays dans les sept jours. */
  echeances: string[];
}

/** Résumé du jour, ou `null` s'il n'y a rien à dire. */
export function messageResume(donnees: DonneesResume): Message | null {
  const lignes: string[] = [];
  if (donnees.nouvelles > 0) {
    lignes.push(
      donnees.nouvelles === 1 ? '1 nouvelle offre' : `${donnees.nouvelles} nouvelles offres`,
    );
  }
  if (donnees.relances > 0) {
    lignes.push(
      donnees.relances === 1 ? '1 relance à faire' : `${donnees.relances} relances à faire`,
    );
  }
  for (const echeance of donnees.echeances.slice(0, 2)) lignes.push(`Échéance : ${echeance}`);
  if (lignes.length === 0) return null;
  return {
    titre: 'StageRadar : le point du jour',
    corps: lignes.join(' · '),
    url: '/important',
    etiquette: 'resume-quotidien',
  };
}
