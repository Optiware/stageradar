import { LIBELLES_STATUT } from '@stageradar/shared';
import { supabase } from './supabase';
import type { Candidature } from './suivi';
import { ligneCsv } from './telechargement';

type Ligne = Record<string, unknown>;

/** Sauvegarde complète de ce que l'utilisateur a saisi (les offres collectées se recollectent). */
export interface Sauvegarde {
  format: 'stageradar';
  version: 1;
  date: string;
  settings: Ligne | null;
  country_sheets: Ligne[];
  companies: Ligne[];
  documents: Ligne[];
  /** Offres suivies ou annotées : une candidature ne peut pas exister sans son offre. */
  offers: Ligne[];
  applications: Ligne[];
  events: Ligne[];
  /** Absents des sauvegardes faites avant le lot 8. */
  housings?: Ligne[];
  budgets?: Ligne[];
}

async function lire(table: string): Promise<Ligne[]> {
  const { data, error } = await supabase!
    .from(table)
    .select('*')
    .overrideTypes<Ligne[], { merge: false }>();
  if (error) throw error;
  return data;
}

/** Copie d'une ligne sans certaines colonnes (celles que la base calcule elle-même). */
function sans(ligne: Ligne, ...colonnes: string[]): Ligne {
  return Object.fromEntries(Object.entries(ligne).filter(([cle]) => !colonnes.includes(cle)));
}

export async function exporter(): Promise<Sauvegarde> {
  const [settings, country_sheets, companies, documents, applications, events, housings, budgets] =
    await Promise.all([
      lire('settings'),
      lire('country_sheets'),
      lire('companies'),
      lire('documents'),
      lire('applications'),
      lire('events'),
      lire('housings'),
      lire('budgets'),
    ]);
  const suivies = applications.map((candidature) => candidature.offer_id).filter(Boolean);
  // Offres du suivi, plus celles que l'utilisateur a masquées, annotées ou fait traduire.
  const { data: offers, error } = await supabase!
    .from('offers')
    .select('*')
    .or(
      [
        suivies.length > 0 ? `id.in.(${suivies.join(',')})` : null,
        'masquee.eq.true',
        'notes.not.is.null',
        'traduction.not.is.null',
      ]
        .filter(Boolean)
        .join(','),
    )
    .overrideTypes<Ligne[], { merge: false }>();
  if (error) throw error;
  return {
    format: 'stageradar',
    version: 1,
    date: new Date().toISOString(),
    settings: settings[0] ?? null,
    country_sheets,
    companies,
    documents,
    // `recherche` est une colonne calculée par la base : elle ne se réimporte pas.
    offers: offers.map((offre) => sans(offre, 'recherche')),
    applications,
    events,
    housings,
    budgets,
  };
}

export function estSauvegarde(valeur: unknown): valeur is Sauvegarde {
  const sauvegarde = valeur as Partial<Sauvegarde> | null;
  return (
    !!sauvegarde &&
    sauvegarde.format === 'stageradar' &&
    sauvegarde.version === 1 &&
    ['country_sheets', 'companies', 'documents', 'offers', 'applications', 'events'].every((cle) =>
      Array.isArray(sauvegarde[cle as keyof Sauvegarde]),
    )
  );
}

async function ecrire(table: string, lignes: Ligne[], cle = 'id'): Promise<void> {
  if (lignes.length === 0) return;
  const { error } = await supabase!.from(table).upsert(lignes, { onConflict: cle });
  if (error) throw error;
}

/**
 * Réimporte une sauvegarde : chaque ligne remplace celle du même identifiant, rien n'est supprimé.
 * L'ordre suit les dépendances entre tables.
 */
export async function importer(sauvegarde: Sauvegarde): Promise<void> {
  await ecrire('companies', sauvegarde.companies);
  await ecrire('documents', sauvegarde.documents);
  await ecrire('offers', sauvegarde.offers);
  await ecrire('applications', sauvegarde.applications);
  await ecrire('events', sauvegarde.events);
  await ecrire('housings', sauvegarde.housings ?? []);
  await ecrire('budgets', sauvegarde.budgets ?? [], 'pays');
  await ecrire('country_sheets', sauvegarde.country_sheets, 'pays');
  if (sauvegarde.settings) {
    const { error } = await supabase!
      .from('settings')
      .update(sans(sauvegarde.settings, 'id', 'updated_at'))
      .eq('id', true);
    if (error) throw error;
  }
}

/** Tableau des candidatures, lisible dans un tableur (séparateur point-virgule, comme Excel en français). */
export function candidaturesEnCsv(candidatures: Candidature[]): string {
  const lignes = [
    ligneCsv([
      'Entreprise',
      'Intitulé',
      'Pays',
      'Ville',
      'Étape',
      'Candidature envoyée le',
      'Prochaine relance',
      'Annonce',
      'Notes',
    ]),
    ...candidatures.map((candidature) =>
      ligneCsv([
        candidature.resume.entreprise,
        candidature.resume.titre,
        candidature.resume.pays,
        candidature.resume.ville,
        LIBELLES_STATUT[candidature.statut],
        candidature.date_candidature,
        candidature.prochaine_relance,
        candidature.offre?.url,
        candidature.notes,
      ]),
    ),
  ];
  // Marque d'ordre des octets en tête : sans elle, Excel lit mal les accents.
  return `${String.fromCharCode(0xfeff)}${lignes.join('\r\n')}\r\n`;
}
