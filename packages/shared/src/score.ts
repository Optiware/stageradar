import type { Classification, Profil } from './classify';
import {
  LIBELLES_PAYS,
  type Domaine,
  type PaysStage,
  type ScoreDetail,
  type TypeOffre,
} from './types';

/** Poids des critères (§4.3), tels que stockés dans `settings.poids`. */
export type Poids = Record<ScoreDetail['critere'], number>;

export const DEFAULT_POIDS: Poids = {
  domaine: 30,
  periode: 20,
  pays: 15,
  niveau: 15,
  langue: 10,
  fraicheur: 10,
};

const LIBELLES_DOMAINE: Record<Domaine, string> = {
  dev: 'développement',
  cyber: 'cybersécurité',
  devops: 'DevOps',
};

const LIBELLES_LANGUE: Record<string, string> = {
  ja: 'japonais',
  ko: 'coréen',
  es: 'espagnol',
  fr: 'français',
  en: 'anglais',
};

/** Ancienneté au-delà de laquelle la fraîcheur ne rapporte plus rien. */
const FRAICHEUR_JOURS_MAX = 45;

export interface OffreANoter {
  type: TypeOffre;
  pays: string | null;
  date_publication: string | null;
}

function nomPays(code: string | null): string {
  if (!code) return 'pays inconnu';
  return LIBELLES_PAYS[code as PaysStage | 'FR'] ?? code;
}

/**
 * Note de pertinence de 0 à 100, avec une ligne d'explication par critère (§4.3).
 * Fonction pure : `maintenant` est passé en argument pour que les tests soient stables.
 */
export function scoreOffer(
  offre: OffreANoter,
  classe: Classification,
  profil: Profil,
  poids: Poids,
  maintenant: Date,
): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  const ajouter = (critere: ScoreDetail['critere'], part: number, libelle: string) => {
    details.push({
      critere,
      points: Math.round(poids[critere] * part),
      max: poids[critere],
      libelle,
    });
  };

  // Domaine
  if (classe.domaines.length > 0) {
    ajouter('domaine', 1, classe.domaines.map((domaine) => LIBELLES_DOMAINE[domaine]).join(', '));
  } else {
    ajouter('domaine', 0, 'hors domaine');
  }

  // Période
  if (offre.type === 'stage') {
    const annee = profil.stage.debut.slice(0, 4);
    if (classe.periode === 'explicite') ajouter('periode', 1, `été ${annee} annoncé`);
    else if (classe.periode === 'non_precisee') ajouter('periode', 0.6, 'dates non précisées');
    else ajouter('periode', 0, 'autre période');
  } else if (offre.type === 'alternance') {
    ajouter('periode', 0.6, 'rentrée non précisée');
  } else {
    ajouter('periode', 0, 'ni stage ni alternance');
  }

  // Pays : ordre de préférence du profil pour les stages, France pour l'alternance.
  if (offre.type === 'alternance') {
    ajouter('pays', offre.pays === 'FR' ? 1 : 0, nomPays(offre.pays));
  } else {
    const rang = offre.pays ? profil.stage.pays.indexOf(offre.pays) : -1;
    const part = rang === -1 ? 0 : 1 - rang / (profil.stage.pays.length + 1);
    ajouter(
      'pays',
      part,
      rang === -1
        ? `${nomPays(offre.pays)} (hors liste)`
        : `${nomPays(offre.pays)} (choix n° ${rang + 1})`,
    );
  }

  // Niveau
  if (classe.niveau === 'accessible') ajouter('niveau', 1, 'ouvert aux premières années');
  else if (classe.niveau === 'non_precise') ajouter('niveau', 0.6, 'niveau non précisé');
  else ajouter('niveau', 0, 'niveau trop élevé');

  // Langue : français et anglais acquis, les autres selon le profil.
  const inconnues = classe.langues_requises.filter(
    (langue) => langue !== 'fr' && langue !== 'en' && !profil.langues.includes(langue),
  );
  if (inconnues.length === 0) {
    ajouter('langue', 1, 'français ou anglais');
  } else {
    const noms = inconnues.map((langue) => LIBELLES_LANGUE[langue] ?? langue).join(', ');
    // L'espagnol reste abordable ; le japonais ou le coréen exigés ferment presque la porte.
    const seulementEspagnol = inconnues.every((langue) => langue === 'es');
    // Pénalité franche (§4.3 : « −10 japonais N2 exigé »), pas un simple zéro.
    ajouter('langue', seulementEspagnol ? 0.5 : -1, `${noms} exigé`);
  }

  // Fraîcheur
  if (offre.date_publication) {
    const jours = Math.max(
      0,
      (maintenant.getTime() - new Date(offre.date_publication).getTime()) / 86_400_000,
    );
    const part = Math.max(0, 1 - jours / FRAICHEUR_JOURS_MAX);
    const age = Math.floor(jours);
    ajouter('fraicheur', part, age === 0 ? "publiée aujourd'hui" : `publiée il y a ${age} j`);
  } else {
    ajouter('fraicheur', 0.5, 'date de publication inconnue');
  }

  const total = details.reduce((somme, detail) => somme + detail.points, 0);
  return { score: Math.max(0, Math.min(100, total)), details };
}
