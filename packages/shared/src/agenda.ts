// Agenda : rassemble les dates à ne pas manquer (entretiens, relances, échéances par pays) et les
// exporte au format iCalendar, lisible par Google Agenda, Outlook et l'agenda du téléphone.

export type TypeEcheance = 'entretien' | 'relance' | 'echeance' | 'stage';

export interface Echeance {
  /** Identifiant stable : sert de clé d'affichage et d'UID dans le fichier .ics. */
  id: string;
  type: TypeEcheance;
  titre: string;
  /** Jour (AAAA-MM-JJ) pour un événement sur la journée, date et heure ISO pour un entretien. */
  date: string;
  /** Vrai si `date` porte une heure. */
  heure: boolean;
  details?: string;
  lien?: string;
  pays?: string | null;
}

/** Jour (AAAA-MM-JJ) d'une échéance, dans le fuseau de l'appareil pour celles qui ont une heure. */
export function jourDe(echeance: Pick<Echeance, 'date' | 'heure'>): string {
  if (!echeance.heure) return echeance.date.slice(0, 10);
  const date = new Date(echeance.date);
  const deux = (nombre: number) => String(nombre).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

/** Trie par date, les événements sur la journée avant ceux qui ont une heure le même jour. */
export function trierEcheances<T extends Pick<Echeance, 'date' | 'heure'>>(echeances: T[]): T[] {
  const cle = (echeance: T) =>
    `${jourDe(echeance)} ${echeance.heure ? new Date(echeance.date).toISOString() : ''}`;
  return [...echeances].sort((a, b) => cle(a).localeCompare(cle(b)));
}

// Format iCalendar : RFC 5545 (https://www.rfc-editor.org/rfc/rfc5545).

/** Échappe un texte (§3.3.11) : barre oblique inverse, point-virgule, virgule, retour à la ligne. */
function texte(valeur: string): string {
  return valeur
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Coupe une ligne à 75 octets (§3.1), sans trancher un caractère : la suite commence par un espace. */
function plier(ligne: string): string {
  const encodeur = new TextEncoder();
  const morceaux: string[] = [];
  let courant = '';
  let octets = 0;
  for (const caractere of ligne) {
    const taille = encodeur.encode(caractere).length;
    // 75 octets pour la première ligne, 74 pour les suivantes (l'espace de tête compte).
    if (octets + taille > (morceaux.length === 0 ? 75 : 74)) {
      morceaux.push(courant);
      courant = '';
      octets = 0;
    }
    courant += caractere;
    octets += taille;
  }
  morceaux.push(courant);
  return morceaux.join('\r\n ');
}

function horodatage(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
}

function lendemain(jour: string): string {
  const date = new Date(`${jour}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

/** Durée retenue pour un entretien dont seule l'heure de début est connue. */
const DUREE_ENTRETIEN_MS = 60 * 60 * 1000;

/** Fichier .ics complet. `maintenant` date la création des événements (DTSTAMP). */
export function versIcs(echeances: Echeance[], maintenant: Date): string {
  const lignes = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//StageRadar//Agenda//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:StageRadar',
  ];
  for (const echeance of trierEcheances(echeances)) {
    lignes.push(
      'BEGIN:VEVENT',
      `UID:${echeance.id}@stageradar`,
      `DTSTAMP:${horodatage(maintenant)}`,
    );
    if (echeance.heure) {
      const debut = new Date(echeance.date);
      lignes.push(
        `DTSTART:${horodatage(debut)}`,
        `DTEND:${horodatage(new Date(debut.getTime() + DUREE_ENTRETIEN_MS))}`,
      );
    } else {
      const jour = echeance.date.slice(0, 10);
      lignes.push(
        `DTSTART;VALUE=DATE:${jour.replaceAll('-', '')}`,
        `DTEND;VALUE=DATE:${lendemain(jour)}`,
      );
    }
    lignes.push(`SUMMARY:${texte(echeance.titre)}`);
    if (echeance.details) lignes.push(`DESCRIPTION:${texte(echeance.details)}`);
    if (echeance.lien) lignes.push(`URL:${echeance.lien}`);
    if (echeance.type === 'entretien') {
      // Rappels la veille et une heure avant (§9, C6).
      for (const delai of ['-P1D', '-PT1H']) {
        lignes.push(
          'BEGIN:VALARM',
          'ACTION:DISPLAY',
          `DESCRIPTION:${texte(echeance.titre)}`,
          `TRIGGER:${delai}`,
          'END:VALARM',
        );
      }
    }
    lignes.push('END:VEVENT');
  }
  lignes.push('END:VCALENDAR');
  return lignes.map(plier).join('\r\n') + '\r\n';
}
