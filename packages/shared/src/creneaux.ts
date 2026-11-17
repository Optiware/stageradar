// Créneaux d'entretien proposés dans un message (« Tuesday 17 Nov at 10:00 JST ») : repérés dans
// le texte, puis ramenés à un instant précis pour être affichés à l'heure de Paris.

/** Fuseau horaire principal de chaque pays du projet. */
export const FUSEAUX_PAYS: Record<string, string> = {
  JP: 'Asia/Tokyo',
  KR: 'Asia/Seoul',
  CO: 'America/Bogota',
  CA: 'America/Toronto',
  GB: 'Europe/London',
  FR: 'Europe/Paris',
};

/** Décalage par rapport à UTC, en minutes, des abréviations écrites dans les messages. */
const ABREVIATIONS: Record<string, number> = {
  UTC: 0,
  GMT: 0,
  BST: 60,
  CET: 60,
  CEST: 120,
  JST: 540,
  KST: 540,
  COT: -300,
  EST: -300,
  EDT: -240,
  CST: -360,
  CDT: -300,
  PST: -480,
  PDT: -420,
};

const MOIS: Record<string, number> = {
  january: 0,
  jan: 0,
  janvier: 0,
  janv: 0,
  february: 1,
  feb: 1,
  février: 1,
  fevrier: 1,
  févr: 1,
  fevr: 1,
  march: 2,
  mar: 2,
  mars: 2,
  april: 3,
  apr: 3,
  avril: 3,
  avr: 3,
  may: 4,
  mai: 4,
  june: 5,
  jun: 5,
  juin: 5,
  july: 6,
  jul: 6,
  juillet: 6,
  juil: 6,
  august: 7,
  aug: 7,
  août: 7,
  aout: 7,
  september: 8,
  sept: 8,
  sep: 8,
  septembre: 8,
  october: 9,
  oct: 9,
  octobre: 9,
  november: 10,
  nov: 10,
  novembre: 10,
  december: 11,
  dec: 11,
  décembre: 11,
  decembre: 11,
  déc: 11,
};

const NOMS_MOIS = Object.keys(MOIS)
  .sort((a, b) => b.length - a.length)
  .join('|');

// « 17 Nov », « 17th November », « 17 novembre » ou « Nov 17 », « November 17th ».
const DATE = new RegExp(
  `(?<![\\w])(?:(\\d{1,2})(?:st|nd|rd|th|er)?\\s+(${NOMS_MOIS})|(${NOMS_MOIS})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?)(?![\\wéû])\\.?`,
  'giu',
);

// Ce qui suit la date : « at 10:00 JST », « à 16h », « , 4pm KST », avec une année éventuelle.
const HEURE =
  /^\s*(?:\d{4})?\s*,?\s*(at|à|a|@)?\s*(\d{1,2})(?:\s*([:h.])\s*(\d{2})?)?\s*(am|pm)?\s*\(?([A-Z]{2,4})?/iu;

export interface Creneau {
  /** Instant du créneau (ISO, UTC). */
  debut: string;
  /** Le passage du message d'où il vient, pour le montrer tel qu'il a été écrit. */
  texte: string;
}

/** Décalage d'un fuseau par rapport à UTC, en minutes, à un instant donné. */
function decalage(fuseau: string, instant: number): number {
  const parties = new Intl.DateTimeFormat('en-US', {
    timeZone: fuseau,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).formatToParts(new Date(instant));
  const lire = (type: string) => Number(parties.find((partie) => partie.type === type)?.value);
  const local = Date.UTC(
    lire('year'),
    lire('month') - 1,
    lire('day'),
    lire('hour'),
    lire('minute'),
  );
  return Math.round((local - Math.floor(instant / 60_000) * 60_000) / 60_000);
}

/**
 * Créneaux écrits dans un message. L'année n'est presque jamais donnée : c'est la prochaine fois
 * que la date tombe après `reference`. Sans abréviation de fuseau, l'heure est comprise dans
 * `fuseauParDefaut` (celui du pays du contact).
 */
export function repererCreneaux(
  texte: string,
  reference: Date,
  fuseauParDefaut = 'Europe/Paris',
): Creneau[] {
  const creneaux: Creneau[] = [];
  for (const trouve of texte.matchAll(DATE)) {
    const jour = Number(trouve[1] ?? trouve[4]);
    const mois = MOIS[(trouve[2] ?? trouve[3])!.toLowerCase()];
    const suite = texte.slice(
      trouve.index + trouve[0].length,
      trouve.index + trouve[0].length + 40,
    );
    const heure = HEURE.exec(suite);
    if (mois === undefined || jour < 1 || jour > 31 || !heure) continue;
    const [passage, mot, heures, separateur, minutes, demiJournee, abreviation] = heure;
    // « 17 Nov 2027 » seul n'est pas une heure : il faut « at », des minutes, « h » ou am/pm.
    if (!mot && !separateur && !demiJournee) continue;

    let h = Number(heures);
    if (demiJournee) h = (h % 12) + (demiJournee.toLowerCase() === 'pm' ? 12 : 0);
    const min = Number(minutes ?? 0);
    if (h > 23 || min > 59) continue;

    let annee = reference.getUTCFullYear();
    // Une date passée depuis plus d'un jour désigne l'année suivante.
    if (Date.UTC(annee, mois, jour, h, min) < reference.getTime() - 86_400_000) annee += 1;
    const local = Date.UTC(annee, mois, jour, h, min);
    const minutesUtc =
      abreviation && abreviation.toUpperCase() in ABREVIATIONS
        ? ABREVIATIONS[abreviation.toUpperCase()]!
        : decalage(fuseauParDefaut, local);
    const debut = new Date(local - minutesUtc * 60_000).toISOString();
    if (!creneaux.some((autre) => autre.debut === debut)) {
      creneaux.push({ debut, texte: (trouve[0] + passage).trim() });
    }
  }
  return creneaux;
}

/** Heure (0 à 23) d'un instant dans un fuseau. */
export function heureDans(fuseau: string, instant: Date): number {
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: fuseau,
      hourCycle: 'h23',
      hour: 'numeric',
    }).format(instant),
  );
}

/** Vrai si l'instant tombe entre 23 h et 7 h dans le fuseau donné. */
export function enPleineNuit(instant: Date, fuseau = 'Europe/Paris'): boolean {
  const heure = heureDans(fuseau, instant);
  return heure >= 23 || heure < 7;
}
