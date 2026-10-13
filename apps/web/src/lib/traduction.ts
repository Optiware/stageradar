import {
  decouperPourTraduction,
  jourIso,
  LANGUE_CIBLE,
  type TraductionOffre,
} from '@stageradar/shared';

// Traducteur intégré à Chrome (« Translator API ») : la traduction se fait sur l'appareil, sans
// clé ni envoi du texte à un service. Disponible à partir de Chrome 138 sur ordinateur, pas sur
// téléphone. Doc : https://developer.chrome.com/docs/ai/translator-api (lue le 13 octobre 2026).

interface TraducteurNatif {
  translate(texte: string): Promise<string>;
  destroy?: () => void;
}

interface OptionsTraducteur {
  sourceLanguage: string;
  targetLanguage: string;
  monitor?: (moniteur: EventTarget) => void;
}

interface ApiTraducteur {
  /** 'available', 'downloadable' ou 'downloading' si la paire de langues est prise en charge. */
  availability(options: OptionsTraducteur): Promise<string>;
  create(options: OptionsTraducteur): Promise<TraducteurNatif>;
}

function api(): ApiTraducteur | null {
  return (globalThis as { Translator?: ApiTraducteur }).Translator ?? null;
}

const UTILISABLE = ['available', 'downloadable', 'downloading'];

/** Vrai si ce navigateur sait traduire cette langue vers le français, sur l'appareil. */
export async function traductionSurAppareil(langue: string): Promise<boolean> {
  const traducteur = api();
  if (!traducteur) return false;
  try {
    const etat = await traducteur.availability({
      sourceLanguage: langue,
      targetLanguage: LANGUE_CIBLE,
    });
    return UTILISABLE.includes(etat);
  } catch {
    return false;
  }
}

export interface Avancement {
  etape: 'telechargement' | 'traduction';
  /** De 0 à 1. */
  part: number;
}

/**
 * Traduit l'intitulé et la description en français. À appeler depuis un clic : la première fois,
 * Chrome télécharge le modèle de la langue, ce qu'il n'accepte qu'à la demande de l'utilisateur.
 */
export async function traduireOffre(
  langue: string,
  titre: string,
  description: string | null,
  suivre: (avancement: Avancement) => void,
): Promise<TraductionOffre> {
  const fabrique = api();
  if (!fabrique) throw new Error('Traducteur indisponible sur ce navigateur');

  const traducteur = await fabrique.create({
    sourceLanguage: langue,
    targetLanguage: LANGUE_CIBLE,
    monitor(moniteur) {
      moniteur.addEventListener('downloadprogress', (evenement) => {
        suivre({ etape: 'telechargement', part: (evenement as ProgressEvent).loaded });
      });
    },
  });

  try {
    // Ligne par ligne, l'une après l'autre : le traducteur traite les demandes en file, et la
    // mise en page de l'annonce (paragraphes, puces) est ainsi conservée.
    const lignes = [
      ...decouperPourTraduction(titre, langue),
      ...decouperPourTraduction(description ?? '', langue),
    ];
    const aFaire = lignes.filter((ligne) => ligne.traduire).length || 1;
    let faites = 0;
    const traduites: string[] = [];
    for (const ligne of lignes) {
      if (!ligne.traduire) {
        traduites.push(ligne.prefixe + ligne.texte);
        continue;
      }
      traduites.push(ligne.prefixe + (await traducteur.translate(ligne.texte)));
      faites += 1;
      suivre({ etape: 'traduction', part: faites / aFaire });
    }
    const nbLignesTitre = titre.split('\n').length;
    return {
      langue,
      titre: traduites.slice(0, nbLignesTitre).join(' '),
      description: description === null ? null : traduites.slice(nbLignesTitre).join('\n'),
      date: jourIso(new Date()),
    };
  } finally {
    traducteur.destroy?.();
  }
}
