// Modèle normalisé partagé entre le collecteur et le front.
// Les noms de champs suivent le cahier des charges (§4.1) et les colonnes Postgres.

import type { TraductionOffre } from './traduction';

export const DOMAINES = ['dev', 'cyber', 'devops'] as const;
export type Domaine = (typeof DOMAINES)[number];

export const TYPES_OFFRE = ['alternance', 'stage', 'autre'] as const;
export type TypeOffre = (typeof TYPES_OFFRE)[number];

export const TELETRAVAIL = ['sur_site', 'hybride', 'remote'] as const;
export type Teletravail = (typeof TELETRAVAIL)[number];

/** Pays visés pour le stage d'été, par ordre de priorité (codes ISO 3166-1 alpha-2). */
export const PAYS_STAGE = ['JP', 'KR', 'CO', 'CA'] as const;
export type PaysStage = (typeof PAYS_STAGE)[number];

export const LIBELLES_PAYS: Record<PaysStage | 'FR', string> = {
  FR: 'France',
  JP: 'Japon',
  KR: 'Corée du Sud',
  CO: 'Colombie',
  CA: 'Canada',
};

/** Colonnes du Kanban de suivi (§5.1), dans l'ordre d'affichage. */
export const STATUTS_SUIVI = [
  'a_etudier',
  'a_postuler',
  'postule',
  'relance',
  'entretien',
  'offre',
  'refus',
] as const;
export type StatutSuivi = (typeof STATUTS_SUIVI)[number];

export const LIBELLES_STATUT: Record<StatutSuivi, string> = {
  a_etudier: 'À étudier',
  a_postuler: 'À postuler',
  postule: 'Postulé',
  relance: 'Relance',
  entretien: 'Entretien',
  offre: 'Offre',
  refus: 'Refus / Abandon',
};

/** Offre normalisée produite par un connecteur, avant dédoublonnage et notation. */
export interface Offer {
  source: string;
  source_id: string;
  url: string;
  url_canonique: string | null;
  titre: string;
  entreprise: string | null;
  /** Code ISO 3166-1 alpha-2 en majuscules. */
  pays: string | null;
  ville: string | null;
  teletravail: Teletravail | null;
  type: TypeOffre;
  /** Apprentissage, professionnalisation, stage, co-op… */
  contrat: string | null;
  domaines: Domaine[];
  /** Date ISO (AAAA-MM-JJ). */
  date_debut: string | null;
  duree_semaines: number | null;
  remuneration_texte: string | null;
  remuneration_montant: number | null;
  /** Code ISO 4217. */
  remuneration_devise: string | null;
  /** Codes ISO 639-1 (fr, en, es, ja, ko…). */
  langues_requises: string[];
  niveau_etudes: string | null;
  description: string | null;
  competences: string[];
  date_publication: string | null;
  date_expiration: string | null;
  /** Mention exigée par la source (ex. France Travail). */
  attribution: string | null;
}

/** Une ligne d'explication du score : « +30 domaine DevOps », « −10 japonais N2 exigé »… */
export interface ScoreDetail {
  critere: 'domaine' | 'periode' | 'pays' | 'niveau' | 'langue' | 'fraicheur';
  points: number;
  /** Poids du critère : le maximum qu'il pouvait rapporter. */
  max: number;
  libelle: string;
}

/** Offre telle que stockée en base. */
export interface StoredOffer extends Omit<Offer, 'attribution'> {
  id: string;
  date_collecte: string;
  score: number | null;
  score_details: ScoreDetail[];
  hash_dedup: string | null;
  /** Stage compatible avec l'été visé, ou alternance compatible avec la rentrée. */
  periode_compatible: boolean | null;
  /** Renseigné quand l'offre est masquée par défaut (Bac+5, expérience exigée, hors domaine). */
  exclue_raison: string | null;
  actif: boolean;
  masquee: boolean;
  notes: string | null;
  traduction: TraductionOffre | null;
}

/** Réponse brute d'une source, telle que renvoyée par son API. */
export type RawOffer = Record<string, unknown>;

/** Paramètres de recherche passés aux connecteurs par le collecteur. */
export interface ConnectorParams {
  /** Pays à couvrir (codes ISO), pour les sources qui s'interrogent pays par pays. */
  pays?: string[];
  /** Signal d'annulation (délai global de la collecte). */
  signal?: AbortSignal;
}

/**
 * Contrat commun des connecteurs (§5.4).
 * `fetch` interroge la source ; `normalize` convertit une réponse brute en offre normalisée.
 */
export interface Connector<Raw = RawOffer, Params extends ConnectorParams = ConnectorParams> {
  id: string;
  fetch(params: Params): Promise<Raw[]>;
  normalize(raw: Raw): Offer;
}
