import { extraireOffre, type Connector, type Offer } from '@stageradar/shared';
import { fetchText, type FetchJsonOptions } from '../http';

// Sites d'annonces sans API ni flux, mais qui publient pour les robots : un plan du site
// (sitemap.xml) et, sur chaque page d'offre, des données structurées JobPosting (JSON-LD,
// https://schema.org/JobPosting). Le connecteur lit le plan, ne garde que les pages de stage
// (adresse contenant « intern »), puis lit ces quelques pages, une à la fois.
//
// Conditions vérifiées le 14 octobre 2026 :
// - https://japan-dev.com/robots.txt : aucun chemin d'offre interdit, et ses pages répondent au
//   serveur de collecte.
// - TokyoDev n'est PAS dans la liste : son robots.txt autorise la lecture, mais ses pages d'offres
//   répondent au serveur par un contrôle anti-robot (403, « Just a moment… »). Cette protection
//   n'est pas contournée : le site reste proposé en lien (apps/web/src/lib/methodes.ts).
// Si un site change ses règles ou se met à refuser la lecture, retirer son entrée.

export interface SiteAnnonces {
  /** Identifiant du connecteur, et source des offres. */
  id: string;
  nom: string;
  sitemap: string;
  /** Adresses du plan à lire : uniquement les pages de stage. */
  motif: RegExp;
  /** Pays retenu quand la page ne le précise pas. */
  pays_defaut: string;
}

export const SITES_ANNONCES: SiteAnnonces[] = [
  {
    id: 'japan-dev',
    nom: 'Japan Dev',
    sitemap: 'https://japan-dev.com/cdn/sitemaps/sitemap.xml',
    motif: /^https:\/\/japan-dev\.com\/jobs\/[^/]+\/[^/]*intern[^/]*$/i,
    pays_defaut: 'JP',
  },
];

/** Garde-fou : un plan de site inattendu ne doit pas déclencher des centaines de lectures. */
const PAGES_MAX = 40;

export interface PageAnnonce {
  url: string;
  html: string;
}

/** Adresses d'un plan de site (balises <loc>) qui correspondent au motif. */
export function adressesDuPlan(xml: string, motif: RegExp): string[] {
  const adresses = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(([, adresse]) =>
    adresse!.replaceAll('&amp;', '&'),
  );
  return [...new Set(adresses.filter((adresse) => motif.test(adresse)))];
}

export function siteAnnoncesConnector(
  site: SiteAnnonces,
  options: Pick<FetchJsonOptions, 'fetchImpl'> = {},
): Connector<PageAnnonce> {
  return {
    id: site.id,
    async fetch(params) {
      const acces = { ...options, signal: params.signal };
      const plan = await fetchText(site.sitemap, acces);
      const pages: PageAnnonce[] = [];
      for (const url of adressesDuPlan(plan, site.motif).slice(0, PAGES_MAX)) {
        pages.push({ url, html: await fetchText(url, acces) });
      }
      return pages;
    },
    normalize({ url, html }): Offer {
      const offre = extraireOffre(html, url);
      if (!offre) throw new Error(`aucune offre lisible sur ${url}`);
      return {
        ...offre,
        source: site.id,
        pays: offre.pays ?? site.pays_defaut,
        attribution: site.nom,
      };
    },
  };
}
