import { LIBELLES_PAYS, type Domaine, type PaysStage, type StoredOffer } from '@stageradar/shared';

/** Champs d'une offre chargés pour la liste (la description n'est lue qu'à l'ouverture). */
export type FeedOffer = Pick<
  StoredOffer,
  | 'id'
  | 'source'
  | 'titre'
  | 'entreprise'
  | 'pays'
  | 'ville'
  | 'teletravail'
  | 'type'
  | 'contrat'
  | 'domaines'
  | 'date_debut'
  | 'duree_semaines'
  | 'remuneration_texte'
  | 'score'
  | 'score_details'
  | 'exclue_raison'
  | 'periode_compatible'
  | 'langues_requises'
  | 'url'
  | 'date_publication'
  | 'masquee'
> & { created_at: string };

export const COLONNES_FIL =
  'id,source,titre,entreprise,pays,ville,teletravail,type,contrat,domaines,date_debut,' +
  'duree_semaines,remuneration_texte,score,score_details,exclue_raison,periode_compatible,' +
  'langues_requises,url,date_publication,masquee,created_at';

export const LIBELLES_DOMAINE: Record<Domaine, string> = {
  dev: 'Dev',
  cyber: 'Cyber',
  devops: 'DevOps',
};
export const LIBELLES_LANGUE: Record<string, string> = {
  ja: 'Japonais',
  ko: 'Coréen',
  es: 'Espagnol',
};
export const LIBELLES_TYPE: Record<FeedOffer['type'], string> = {
  stage: 'Stage',
  alternance: 'Alternance',
  autre: 'Autre contrat',
};
export const LIBELLES_TELETRAVAIL: Record<NonNullable<FeedOffer['teletravail']>, string> = {
  remote: 'Télétravail',
  hybride: 'Hybride',
  sur_site: 'Sur site',
};

/** Une offre est « nouvelle » pendant les deux jours qui suivent sa première collecte. */
const NOUVEAU_MS = 48 * 3600 * 1000;
const JOUR_MS = 86_400_000;

export function estNouvelle(offre: FeedOffer, maintenant: number): boolean {
  return maintenant - new Date(offre.created_at).getTime() < NOUVEAU_MS;
}

export function nomPays(code: string | null): string | null {
  return code ? (LIBELLES_PAYS[code as PaysStage | 'FR'] ?? code) : null;
}

export function lieu(offre: Pick<FeedOffer, 'ville' | 'pays'>): string {
  return [offre.ville, nomPays(offre.pays)].filter(Boolean).join(', ');
}

/** « aujourd'hui », « il y a 3 j », « il y a 2 sem. »… ou rien si la date est inconnue. */
export function anciennete(dateIso: string | null, maintenant: number): string | null {
  if (!dateIso) return null;
  const jours = Math.floor((maintenant - new Date(dateIso).getTime()) / JOUR_MS);
  if (Number.isNaN(jours)) return null;
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return 'hier';
  if (jours < 14) return `il y a ${jours} j`;
  if (jours < 60) return `il y a ${Math.floor(jours / 7)} sem.`;
  return `il y a ${Math.floor(jours / 30)} mois`;
}

export function dateLongue(dateIso: string | null): string | null {
  if (!dateIso) return null;
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Les adresses viennent de sources extérieures : seul un lien web ordinaire est rendu cliquable. */
export function lienSur(url: string): string | null {
  const debut = url.slice(0, 8).toLowerCase();
  return debut.startsWith('https://') || debut.startsWith('http://') ? url : null;
}

/** Pastille pleine du score : cyan si l'offre colle au profil, ambre si moyenne, gris sinon. */
export function couleurScore(score: number): string {
  if (score >= 75) return 'bg-primary-600 text-white dark:bg-primary-400 dark:text-primary-ink';
  if (score >= 50) return 'bg-amber-400 text-gray-950';
  return 'bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-100';
}

/** Même code couleur, pour un score écrit sur fond blanc (carte non sélectionnée). */
export function couleurTexteScore(score: number): string {
  if (score >= 75) return 'text-primary-700 dark:text-primary-400';
  if (score >= 50) return 'text-amber-700 dark:text-amber-400';
  return 'text-gray-600 dark:text-gray-400';
}

/** « Excellent match », « Très bon match »… d'après le score sur 100. */
export function libelleScore(score: number): string {
  if (score >= 90) return 'Excellent match';
  if (score >= 80) return 'Très bon match';
  if (score >= 70) return 'Bon match';
  return 'Match partiel';
}

const NOMS_SOURCE: Record<string, string> = {
  'japan-dev': 'Japan Dev',
  manuel: 'Ajoutée à la main',
};

/** Nom lisible de la source : « greenhouse:moloco » → « Greenhouse ». */
export function nomSource(source: string): string {
  const nom = source.split(':')[0] ?? source;
  return NOMS_SOURCE[nom] ?? nom.charAt(0).toUpperCase() + nom.slice(1);
}
