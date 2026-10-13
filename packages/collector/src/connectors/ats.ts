import {
  canonicalUrl,
  findLieux,
  htmlToText,
  type Connector,
  type ConnectorParams,
  type Offer,
  type Teletravail,
} from '@stageradar/shared';
import { fetchJson, type FetchJsonOptions } from '../http';

/** Une entreprise de `config/watchlist.yaml`. */
export interface WatchlistEntry {
  nom: string;
  /** Pays (codes ISO) où l'entreprise a des postes techniques, vérifiés à la date indiquée. */
  pays: string[];
  ats: AtsId;
  slug: string;
  url_carriere: string;
  /** Pays à retenir quand le lieu d'une annonce ne nomme ni pays ni ville connue. */
  pays_defaut?: string;
  verifie_le: string;
}

export const ATS_IDS = ['greenhouse', 'lever', 'ashby'] as const;
export type AtsId = (typeof ATS_IDS)[number];

/** Champs communs tirés d'une annonce d'ATS, avant la mise en forme finale. */
interface Annonce {
  source_id: string;
  url: string;
  titre: string;
  /** Tous les libellés de lieu de l'annonce, du plus précis au plus général. */
  lieux: (string | null | undefined)[];
  description: string;
  teletravail: Teletravail | null;
  stage: boolean;
  date_publication: string | null;
  remuneration_texte?: string | null;
}

function versOffer(entree: WatchlistEntry, pays: string[], annonce: Annonce): Offer {
  // Une annonce peut citer plusieurs lieux : on retient le pays le mieux classé du profil.
  const lieux = annonce.lieux.flatMap((libelle) => findLieux(libelle));
  const rang = (code: string | null) => {
    const position = code ? pays.indexOf(code) : -1;
    return position === -1 ? Infinity : position;
  };
  const lieu = lieux.sort((a, b) => rang(a.pays) - rang(b.pays))[0] ?? {
    pays: entree.pays_defaut ?? null,
    ville: null,
  };
  const libelle = annonce.lieux.find((valeur) => valeur?.trim())?.trim() ?? null;

  return {
    source: `${entree.ats}:${entree.slug}`,
    source_id: annonce.source_id,
    url: annonce.url,
    url_canonique: canonicalUrl(annonce.url),
    titre: annonce.titre.trim(),
    entreprise: entree.nom,
    pays: lieu.pays,
    ville: lieu.ville ?? (lieu.pays ? libelle : null),
    teletravail: annonce.teletravail,
    type: annonce.stage ? 'stage' : 'autre',
    contrat: annonce.stage ? 'stage' : null,
    domaines: [],
    date_debut: null,
    duree_semaines: null,
    remuneration_texte: annonce.remuneration_texte ?? null,
    remuneration_montant: null,
    remuneration_devise: null,
    langues_requises: [],
    niveau_etudes: null,
    description: annonce.description || null,
    competences: [],
    date_publication: annonce.date_publication,
    date_expiration: null,
    attribution: null,
  };
}

function iso(valeur: string | number | null | undefined): string | null {
  if (valeur === null || valeur === undefined) return null;
  const date = new Date(valeur);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

// ---------------------------------------------------------------------------
// Greenhouse — https://docs.greenhouse.io/job-board.html (vérifié le 2026-10-13)
// GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true, sans clé.
// `content` est du HTML dont les balises sont encodées en entités.
// ---------------------------------------------------------------------------

export interface GreenhouseJob {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string | null } | null;
  offices?: { name?: string | null; location?: string | null }[] | null;
  content?: string | null;
  updated_at?: string | null;
  first_published?: string | null;
}

const RECYCLEE_APRES_MS = 180 * 86_400_000;

/**
 * Certaines entreprises réutilisent la même annonce d'une année sur l'autre (« Intern (2027) »
 * publiée pour la première fois en 2023). Quand la dernière modification est postérieure de plus
 * de six mois à la première publication, c'est elle qui date l'offre.
 */
function datePublicationGreenhouse(job: GreenhouseJob): string | null {
  const premiere = iso(job.first_published);
  const modification = iso(job.updated_at);
  if (!premiere || !modification) return premiere ?? modification;
  const ecart = new Date(modification).getTime() - new Date(premiere).getTime();
  return ecart > RECYCLEE_APRES_MS ? modification : premiere;
}

function greenhouse(entree: WatchlistEntry, options: FetchJsonOptions): Connector<GreenhouseJob> {
  let pays: string[] = [];
  return {
    id: `greenhouse:${entree.slug}`,
    async fetch(params) {
      pays = params.pays ?? [];
      const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(entree.slug)}/jobs?content=true`;
      const reponse = await fetchJson<{ jobs: GreenhouseJob[] }>(url, {
        ...options,
        signal: params.signal,
      });
      return reponse.jobs;
    },
    normalize(job) {
      return versOffer(entree, pays, {
        source_id: String(job.id),
        url: job.absolute_url,
        titre: job.title,
        lieux: [
          job.location?.name,
          ...(job.offices ?? []).flatMap((office) => [office.location, office.name]),
        ],
        // Deux passes : la première décode les entités, la seconde retire les balises obtenues.
        description: htmlToText(htmlToText(job.content)),
        teletravail: /\bremote\b/i.test(job.location?.name ?? '') ? 'remote' : null,
        stage: false,
        date_publication: datePublicationGreenhouse(job),
      });
    },
  };
}

// ---------------------------------------------------------------------------
// Lever — https://github.com/lever/postings-api (vérifié le 2026-10-13)
// GET https://api.lever.co/v0/postings/{site}?mode=json, sans clé.
// `createdAt` (millisecondes) n'est pas documenté mais présent dans les réponses réelles.
// ---------------------------------------------------------------------------

export interface LeverPosting {
  id: string;
  text: string;
  hostedUrl: string;
  categories?: {
    commitment?: string | null;
    location?: string | null;
    allLocations?: string[] | null;
  } | null;
  country?: string | null;
  workplaceType?: string | null;
  descriptionPlain?: string | null;
  lists?: { text?: string; content?: string }[] | null;
  additionalPlain?: string | null;
  salaryDescriptionPlain?: string | null;
  createdAt?: number | null;
}

const LEVER_TELETRAVAIL: Record<string, Teletravail> = {
  remote: 'remote',
  hybrid: 'hybride',
  'on-site': 'sur_site',
  onsite: 'sur_site',
};

function lever(entree: WatchlistEntry, options: FetchJsonOptions): Connector<LeverPosting> {
  let pays: string[] = [];
  return {
    id: `lever:${entree.slug}`,
    async fetch(params) {
      pays = params.pays ?? [];
      const url = `https://api.lever.co/v0/postings/${encodeURIComponent(entree.slug)}?mode=json`;
      return fetchJson<LeverPosting[]>(url, { ...options, signal: params.signal });
    },
    normalize(posting) {
      const listes = (posting.lists ?? [])
        .map((liste) => `${liste.text ?? ''}\n${htmlToText(liste.content)}`)
        .join('\n\n');
      const offre = versOffer(entree, pays, {
        source_id: posting.id,
        url: posting.hostedUrl,
        titre: posting.text,
        lieux: [posting.categories?.location, ...(posting.categories?.allLocations ?? [])],
        description: [posting.descriptionPlain, listes, posting.additionalPlain]
          .filter(Boolean)
          .join('\n\n')
          .trim(),
        teletravail: LEVER_TELETRAVAIL[posting.workplaceType ?? ''] ?? null,
        stage: /\bintern(ship)?\b|co-?op/i.test(posting.categories?.commitment ?? ''),
        date_publication: iso(posting.createdAt),
        remuneration_texte: posting.salaryDescriptionPlain?.trim() || null,
      });
      // Lever donne le pays du lieu principal : il fait foi si le libellé n'a rien donné.
      if (!offre.pays && posting.country && /^[A-Z]{2}$/.test(posting.country)) {
        offre.pays = posting.country;
        offre.ville = posting.categories?.location?.trim() ?? null;
      }
      return offre;
    },
  };
}

// ---------------------------------------------------------------------------
// Ashby — https://developers.ashbyhq.com/docs/public-job-posting-api (vérifié le 2026-10-13)
// GET https://api.ashbyhq.com/posting-api/job-board/{nom}?includeCompensation=true, sans clé.
// ---------------------------------------------------------------------------

interface AshbyAdresse {
  addressLocality?: string | null;
  addressRegion?: string | null;
  addressCountry?: string | null;
}

export interface AshbyJob {
  id: string;
  title: string;
  jobUrl: string;
  location?: string | null;
  secondaryLocations?: { location?: string | null; address?: AshbyAdresse | null }[] | null;
  address?: { postalAddress?: AshbyAdresse | null } | null;
  employmentType?: string | null;
  workplaceType?: string | null;
  isListed?: boolean;
  descriptionHtml?: string | null;
  publishedAt?: string | null;
  compensation?: { compensationTierSummary?: string | null } | null;
}

const ASHBY_TELETRAVAIL: Record<string, Teletravail> = {
  Remote: 'remote',
  Hybrid: 'hybride',
  OnSite: 'sur_site',
};

function adresse(valeur: AshbyAdresse | null | undefined): string | null {
  if (!valeur) return null;
  return (
    [valeur.addressLocality, valeur.addressRegion, valeur.addressCountry]
      .filter(Boolean)
      .join(', ') || null
  );
}

function ashby(entree: WatchlistEntry, options: FetchJsonOptions): Connector<AshbyJob> {
  let pays: string[] = [];
  return {
    id: `ashby:${entree.slug}`,
    async fetch(params) {
      pays = params.pays ?? [];
      const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(entree.slug)}?includeCompensation=true`;
      const reponse = await fetchJson<{ jobs: AshbyJob[] }>(url, {
        ...options,
        signal: params.signal,
      });
      return reponse.jobs.filter((job) => job.isListed !== false);
    },
    normalize(job) {
      return versOffer(entree, pays, {
        source_id: job.id,
        url: job.jobUrl,
        titre: job.title,
        lieux: [
          adresse(job.address?.postalAddress),
          job.location,
          ...(job.secondaryLocations ?? []).flatMap((lieu) => [
            adresse(lieu.address),
            lieu.location,
          ]),
        ],
        description: htmlToText(job.descriptionHtml),
        teletravail: ASHBY_TELETRAVAIL[job.workplaceType ?? ''] ?? null,
        stage: job.employmentType === 'Intern',
        date_publication: iso(job.publishedAt),
        remuneration_texte: job.compensation?.compensationTierSummary?.trim() || null,
      });
    },
  };
}

const FABRIQUES = { greenhouse, lever, ashby } as const;

/** Connecteur pour une entreprise de la watchlist, selon son ATS. */
export function atsConnector(entree: WatchlistEntry, options: FetchJsonOptions = {}): Connector {
  return FABRIQUES[entree.ats](entree, options) as unknown as Connector<
    Record<string, unknown>,
    ConnectorParams
  >;
}
