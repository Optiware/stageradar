import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chiffrer, cleDepuisMotDePasse, dechiffrer, nouveauSel } from './chiffrement';
import { estSauvegarde, exporter, importer } from './donnees';
import { supabase } from './supabase';

/** Une sauvegarde chiffrée gardée sur le serveur (table `backups`), sans son contenu. */
export interface SauvegardeChiffree {
  id: string;
  created_at: string;
  taille: number;
  origine: 'auto' | 'manuelle';
}

export type Frequence = 'jour' | 'semaine';

/** Réglages de l'appareil : la clé n'existe que sur celui où le mot de passe a été saisi. */
export interface ReglagesSauvegarde {
  auto: boolean;
  frequence: Frequence;
}

const GARDEES = 5;
const CLE_REGLAGES = 'stageradar-sauvegarde';
const CLE = ['backups'] as const;

export function lireReglages(): ReglagesSauvegarde {
  try {
    const brut = localStorage.getItem(CLE_REGLAGES);
    const valeur = brut ? (JSON.parse(brut) as Partial<ReglagesSauvegarde>) : {};
    return {
      auto: valeur.auto === true,
      frequence: valeur.frequence === 'semaine' ? 'semaine' : 'jour',
    };
  } catch {
    return { auto: false, frequence: 'jour' };
  }
}

export function ecrireReglages(reglages: ReglagesSauvegarde): void {
  try {
    localStorage.setItem(CLE_REGLAGES, JSON.stringify(reglages));
  } catch {
    // Stockage indisponible (navigation privée) : la sauvegarde reste possible à la main.
  }
}

// La clé dérivée du mot de passe est gardée dans IndexedDB : une CryptoKey non exportable s'y
// enregistre telle quelle, sans que le mot de passe ni la clé brute soient lisibles.
const BASE = 'stageradar-cles';
const MAGASIN = 'cles';

function ouvrirBase(): Promise<IDBDatabase> {
  return new Promise((resoudre, rejeter) => {
    const requete = indexedDB.open(BASE, 1);
    requete.onupgradeneeded = () => requete.result.createObjectStore(MAGASIN);
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

async function magasin<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const base = await ouvrirBase();
  return new Promise((resoudre, rejeter) => {
    const requete = action(base.transaction(MAGASIN, mode).objectStore(MAGASIN));
    requete.onsuccess = () => resoudre(requete.result);
    requete.onerror = () => rejeter(requete.error);
  });
}

interface CleGardee {
  cle: CryptoKey;
  sel: string;
}

export async function cleGardee(): Promise<CleGardee | null> {
  try {
    return (await magasin('readonly', (store) => store.get('sauvegarde'))) ?? null;
  } catch {
    return null;
  }
}

/** Choisit (ou change) le mot de passe de sauvegarde sur cet appareil. */
export async function definirMotDePasse(motDePasse: string): Promise<void> {
  const sel = nouveauSel();
  const cle = await cleDepuisMotDePasse(motDePasse, sel);
  await magasin('readwrite', (store) => store.put({ cle, sel }, 'sauvegarde'));
}

export function useSauvegardesChiffrees() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('backups')
        .select('id,created_at,taille,origine')
        .order('created_at', { ascending: false })
        .overrideTypes<SauvegardeChiffree[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

/** Chiffre une sauvegarde complète, l'envoie, puis ne garde que les cinq plus récentes. */
export async function sauvegarderChiffre(origine: SauvegardeChiffree['origine']): Promise<void> {
  const gardee = await cleGardee();
  if (!gardee) throw new Error('Aucun mot de passe de sauvegarde sur cet appareil.');
  const texte = JSON.stringify(await exporter());
  const { iv, donnees } = await chiffrer(gardee.cle, texte);
  const base = supabase!;
  const { error } = await base.from('backups').insert({
    taille: new TextEncoder().encode(texte).length,
    sel: gardee.sel,
    iv,
    donnees,
    origine,
  });
  if (error) throw error;
  const { data, error: erreur } = await base
    .from('backups')
    .select('id')
    .order('created_at', { ascending: false });
  if (erreur) throw erreur;
  const anciennes = (data as { id: string }[]).slice(GARDEES).map((ligne) => ligne.id);
  if (anciennes.length > 0) {
    const { error: suppression } = await base.from('backups').delete().in('id', anciennes);
    if (suppression) throw suppression;
  }
}

export function useSauvegarderChiffre() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => sauvegarderChiffre('manuelle'),
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/**
 * Restaure une sauvegarde avec le mot de passe qui l'a chiffrée (il peut différer de l'actuel).
 * Comme le réimport d'un fichier, chaque ligne remplace celle du même identifiant.
 */
export function useRestaurerChiffre() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, motDePasse }: { id: string; motDePasse: string }) => {
      const { data, error } = await supabase!
        .from('backups')
        .select('sel,iv,donnees')
        .eq('id', id)
        .single()
        .overrideTypes<{ sel: string; iv: string; donnees: string }, { merge: false }>();
      if (error) throw error;
      const cle = await cleDepuisMotDePasse(motDePasse, data.sel);
      let contenu: unknown;
      try {
        contenu = JSON.parse(await dechiffrer(cle, data.iv, data.donnees));
      } catch {
        throw new Error('mot de passe');
      }
      if (!estSauvegarde(contenu)) throw new Error('contenu');
      await importer(contenu);
    },
    onSuccess: () => client.invalidateQueries(),
  });
}

/**
 * À l'ouverture de l'application : lance la sauvegarde automatique si elle est activée sur cet
 * appareil et si la dernière date de plus d'un jour (ou d'une semaine). Silencieuse en cas d'échec :
 * elle sera retentée à la prochaine ouverture.
 */
export async function sauvegardeAutoSiDue(maintenant = new Date()): Promise<boolean> {
  const reglages = lireReglages();
  if (!reglages.auto || !supabase || !(await cleGardee())) return false;
  const { data, error } = await supabase
    .from('backups')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return false;
  const derniere = (data as { created_at: string }[])[0]?.created_at;
  const delai = (reglages.frequence === 'jour' ? 1 : 7) * 24 * 3600_000;
  if (derniere && maintenant.getTime() - new Date(derniere).getTime() < delai) return false;
  try {
    await sauvegarderChiffre('auto');
    return true;
  } catch {
    return false;
  }
}
