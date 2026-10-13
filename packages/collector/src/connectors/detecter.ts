import type { FetchJsonOptions } from '../http';
import { atsConnector, type AtsId, type WatchlistEntry } from './ats';

// Reconnaît le logiciel de recrutement (« ATS ») d'un site carrière et vérifie que son API
// publique répond. Rien n'est deviné sans preuve : un site n'est proposé que si l'API a répondu.

const MOTIFS: [AtsId, RegExp][] = [
  [
    'greenhouse',
    /(?:job-boards|boards)(?:\.eu)?\.greenhouse\.io\/(?:embed\/job_board\?for=)?([\w-]+)/i,
  ],
  ['lever', /jobs\.lever\.co\/([\w-]+)/i],
  ['ashby', /jobs\.ashbyhq\.com\/([\w.-]+)/i],
];

export const PAGE_CARRIERE: Record<AtsId, (slug: string) => string> = {
  greenhouse: (slug) => `https://job-boards.greenhouse.io/${slug}`,
  lever: (slug) => `https://jobs.lever.co/${slug}`,
  ashby: (slug) => `https://jobs.ashbyhq.com/${slug}`,
};

/** Sites carrières cités dans un texte : une adresse, ou le HTML d'une page qui y renvoie. */
export function reconnaitreAts(texte: string): [AtsId, string][] {
  const trouves = new Map<string, [AtsId, string]>();
  for (const [ats, motif] of MOTIFS) {
    for (const [, slug] of texte.matchAll(new RegExp(motif.source, 'gi'))) {
      // « embed », « js » : chemins techniques de ces services, pas des entreprises.
      if (!slug || ['embed', 'js', 'api'].includes(slug.toLowerCase())) continue;
      // La première écriture rencontrée est gardée (certaines adresses varient par la casse).
      const cle = `${ats}:${slug.toLowerCase()}`;
      if (!trouves.has(cle)) trouves.set(cle, [ats, slug]);
    }
  }
  return [...trouves.values()];
}

export interface SiteCarriere {
  ats: AtsId;
  slug: string;
  url_carriere: string;
  /** Nombre d'annonces publiées en ce moment. */
  annonces: number;
  /** Dont celles qui ressemblent à un stage. */
  stages: number;
  /** Pays suivis où l'entreprise a des annonces (information). */
  pays: string[];
}

/** Interroge l'API publique du site carrière ; `null` si elle ne répond pas pour cette entreprise. */
export async function essayerSite(
  ats: AtsId,
  slug: string,
  options: FetchJsonOptions = {},
): Promise<SiteCarriere | null> {
  const entree: WatchlistEntry = {
    nom: slug,
    pays: [],
    ats,
    slug,
    url_carriere: PAGE_CARRIERE[ats](slug),
    verifie_le: new Date().toISOString().slice(0, 10),
  };
  const connecteur = atsConnector(entree, options);
  let brutes: unknown[];
  try {
    brutes = await connecteur.fetch({ pays: [], signal: options.signal });
  } catch {
    return null;
  }
  const pays = new Set<string>();
  let stages = 0;
  for (const brute of brutes) {
    const offre = connecteur.normalize(brute as never);
    if (offre.type === 'stage' || /\bintern|stage|co-?op|인턴|インターン/i.test(offre.titre))
      stages++;
    if (offre.pays) pays.add(offre.pays);
  }
  return {
    ats,
    slug,
    url_carriere: entree.url_carriere,
    annonces: brutes.length,
    stages,
    pays: [...pays],
  };
}
