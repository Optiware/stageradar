import { findLieux } from './geo';
import { decodeEntities, htmlToText } from './html';
import type { Offer, Teletravail, TypeOffre } from './types';
import { canonicalUrl } from './url';

// Import manuel d'une offre (Lot 4). Deux cas :
// - la page est lue à la demande de l'utilisateur, et ses données structurées « JobPosting »
//   (https://schema.org/JobPosting, au format JSON-LD) remplissent l'offre ;
// - le site interdit la lecture automatique : l'offre est créée avec ce que l'utilisateur a
//   partagé (titre, texte, adresse), sans rien aller chercher.

/** Source des offres ajoutées à la main. */
export const SOURCE_MANUELLE = 'manuel';

/**
 * Sites dont les conditions interdisent la lecture automatique (§3.4) : une adresse de ces
 * domaines n'est jamais téléchargée, même à la demande.
 */
const SANS_LECTURE = [
  'linkedin.com',
  'indeed.com',
  'glassdoor.com',
  'glassdoor.fr',
  'welcometothejungle.com',
  'scholar.google.com',
];

export function lectureInterdite(url: string): boolean {
  let hote: string;
  try {
    hote = new URL(url).hostname.toLowerCase();
  } catch {
    return true;
  }
  return SANS_LECTURE.some(
    (domaine) =>
      hote === domaine ||
      hote.endsWith(`.${domaine}`) ||
      // Indeed a un sous-domaine par pays : jp.indeed.com, fr.indeed.com…
      (domaine === 'indeed.com' && /(^|\.)indeed\.[a-z.]+$/.test(hote)),
  );
}

type Json = Record<string, unknown>;

function estObjet(valeur: unknown): valeur is Json {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function texte(valeur: unknown): string | null {
  if (typeof valeur === 'string') return decodeEntities(valeur).trim() || null;
  if (typeof valeur === 'number') return String(valeur);
  // Une valeur peut être un objet nommé : { "@type": "Country", "name": "Japan" }.
  if (estObjet(valeur)) return texte(valeur.name);
  return null;
}

function premier(valeur: unknown): unknown {
  return Array.isArray(valeur) ? valeur[0] : valeur;
}

function estJobPosting(noeud: Json): boolean {
  const type = noeud['@type'];
  return type === 'JobPosting' || (Array.isArray(type) && type.includes('JobPosting'));
}

/** Cherche un JobPosting dans un document JSON-LD : à la racine, dans un tableau ou un @graph. */
function trouverJobPosting(document: unknown): Json | null {
  if (Array.isArray(document)) {
    for (const element of document) {
      const trouve = trouverJobPosting(element);
      if (trouve) return trouve;
    }
    return null;
  }
  if (!estObjet(document)) return null;
  if (estJobPosting(document)) return document;
  return trouverJobPosting(document['@graph']);
}

function jour(valeur: unknown): string | null {
  const brut = texte(valeur);
  if (!brut) return null;
  const date = new Date(brut);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const TYPES: Record<string, TypeOffre> = { INTERN: 'stage', INTERNSHIP: 'stage' };

function lieu(poste: Json): { pays: string | null; ville: string | null } {
  const adresse = premier(
    estObjet(premier(poste.jobLocation)) ? (premier(poste.jobLocation) as Json).address : null,
  );
  const morceaux = estObjet(adresse)
    ? [adresse.addressLocality, adresse.addressRegion, adresse.addressCountry].map(texte)
    : [texte(adresse)];
  const libelle = morceaux.filter(Boolean).join(', ');
  const connu = findLieux(libelle)[0];
  if (connu) return { pays: connu.pays, ville: connu.ville ?? morceaux[0] ?? null };
  // Pays hors de la liste suivie : son code ISO est gardé s'il est fourni tel quel.
  const code = estObjet(adresse) ? texte(adresse.addressCountry) : null;
  return {
    pays: code && /^[A-Za-z]{2}$/.test(code) ? code.toUpperCase() : null,
    ville: morceaux[0] ?? null,
  };
}

function remuneration(
  poste: Json,
): Pick<Offer, 'remuneration_texte' | 'remuneration_montant' | 'remuneration_devise'> {
  const vide = { remuneration_texte: null, remuneration_montant: null, remuneration_devise: null };
  const salaire = premier(poste.baseSalary);
  if (!estObjet(salaire)) return vide;
  const valeur = estObjet(salaire.value) ? salaire.value : salaire;
  const devise = texte(salaire.currency) ?? texte(valeur.currency);
  const montant = Number(valeur.value ?? valeur.minValue);
  if (!Number.isFinite(montant) || montant <= 0) return vide;
  const max = Number(valeur.maxValue);
  const unite = texte(valeur.unitText)?.toLowerCase();
  const fourchette =
    Number.isFinite(max) && max > montant ? `${montant} à ${max}` : String(montant);
  return {
    remuneration_texte: [fourchette, devise, unite ? `par ${unite}` : null]
      .filter(Boolean)
      .join(' '),
    remuneration_montant: montant,
    remuneration_devise: devise && /^[A-Za-z]{3}$/.test(devise) ? devise.toUpperCase() : null,
  };
}

function balise(html: string, motif: RegExp): string | null {
  const trouve = motif.exec(html)?.[1];
  return trouve ? decodeEntities(trouve.replace(/\s+/g, ' ')).trim() || null : null;
}

function meta(html: string, nom: string): string | null {
  // L'attribut `content` peut précéder ou suivre `property` / `name`.
  return (
    balise(
      html,
      new RegExp(`<meta[^>]+(?:property|name)=["']${nom}["'][^>]*content=["']([^"']*)["']`, 'i'),
    ) ??
    balise(
      html,
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${nom}["']`, 'i'),
    )
  );
}

function base(url: string): Offer {
  return {
    source: SOURCE_MANUELLE,
    source_id: canonicalUrl(url) ?? url,
    url,
    url_canonique: canonicalUrl(url),
    titre: '',
    entreprise: null,
    pays: null,
    ville: null,
    teletravail: null,
    type: 'autre',
    contrat: null,
    domaines: [],
    date_debut: null,
    duree_semaines: null,
    remuneration_texte: null,
    remuneration_montant: null,
    remuneration_devise: null,
    langues_requises: [],
    niveau_etudes: null,
    description: null,
    competences: [],
    date_publication: null,
    date_expiration: null,
    attribution: null,
  };
}

/**
 * Offre lue dans le HTML d'une annonce : d'après son JobPosting s'il y en a un, sinon d'après le
 * titre et la description de la page. `null` si la page n'a même pas de titre.
 */
export function extraireOffre(html: string, url: string): Offer | null {
  const offre = base(url);
  const blocs = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const [, contenu] of blocs) {
    let poste: Json | null;
    try {
      poste = trouverJobPosting(JSON.parse(contenu ?? ''));
    } catch {
      continue; // JSON-LD mal formé : on essaie le bloc suivant.
    }
    const titre = poste && texte(poste.title);
    if (!poste || !titre) continue;

    const type = texte(premier(poste.employmentType))?.toUpperCase() ?? '';
    const distance = texte(poste.jobLocationType)?.toUpperCase() === 'TELECOMMUTE';
    return {
      ...offre,
      ...lieu(poste),
      ...remuneration(poste),
      titre,
      entreprise: texte(poste.hiringOrganization),
      teletravail: distance ? ('remote' satisfies Teletravail) : null,
      type: TYPES[type] ?? 'autre',
      contrat: type ? type.toLowerCase() : null,
      description: htmlToText(texte(poste.description)) || null,
      date_publication: jour(poste.datePosted),
      date_expiration: jour(poste.validThrough),
    };
  }

  const titre = meta(html, 'og:title') ?? balise(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!titre) return null;
  return {
    ...offre,
    titre,
    entreprise: meta(html, 'og:site_name'),
    description: meta(html, 'og:description') ?? meta(html, 'description'),
  };
}

/** Offre créée avec ce que l'utilisateur a partagé, sans lire la page. */
export function offreDepuisPartage(partage: {
  url: string;
  titre?: string | null;
  texte?: string | null;
}): Offer {
  const titre = partage.titre?.trim() || partage.texte?.trim().split('\n')[0] || partage.url;
  return {
    ...base(partage.url),
    titre: titre.slice(0, 300),
    description: partage.texte?.trim() || null,
  };
}

/** Première adresse web d'un texte : certaines applications partagent « Titre https://… ». */
export function adresseDans(texteLibre: string | null | undefined): string | null {
  return /https?:\/\/[^\s<>"']+/i.exec(texteLibre ?? '')?.[0] ?? null;
}
