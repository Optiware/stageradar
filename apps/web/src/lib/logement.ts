import type { LigneBudget } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LienRecherche } from './liens-recherche';
import { supabase } from './supabase';

// Sites où chercher un logement, par pays. L'application n'y collecte rien : ce sont des liens.
// Adresses vérifiées le 13 octobre 2026 (elles répondaient).
export const SITES_LOGEMENT: Record<string, LienRecherche[]> = {
  JP: [
    { libelle: 'Oakhouse (maisons partagées)', url: 'https://www.oakhouse.jp/eng' },
    { libelle: 'Borderless House (colocations)', url: 'https://www.borderless-house.com/' },
    { libelle: 'Airbnb (séjours au mois)', url: 'https://www.airbnb.fr/' },
  ],
  KR: [
    { libelle: 'Borderless House Corée', url: 'https://www.borderless-house.com/kr/' },
    { libelle: 'Airbnb (séjours au mois)', url: 'https://www.airbnb.fr/' },
  ],
  CO: [
    { libelle: 'Fincaraíz', url: 'https://www.fincaraiz.com.co/' },
    { libelle: 'Airbnb (séjours au mois)', url: 'https://www.airbnb.fr/' },
  ],
  CA: [
    { libelle: 'Kijiji', url: 'https://www.kijiji.ca/' },
    { libelle: 'PadMapper', url: 'https://www.padmapper.com/' },
    { libelle: 'Airbnb (séjours au mois)', url: 'https://www.airbnb.fr/' },
  ],
  GB: [
    { libelle: 'SpareRoom (colocations)', url: 'https://www.spareroom.co.uk/' },
    { libelle: 'Rightmove', url: 'https://www.rightmove.co.uk/' },
    { libelle: 'Airbnb (séjours au mois)', url: 'https://www.airbnb.fr/' },
  ],
  FR: [
    { libelle: 'Crous : trouver un logement', url: 'https://trouverunlogement.lescrous.fr/' },
    { libelle: 'Studapart', url: 'https://www.studapart.com/fr' },
    { libelle: 'La Carte des colocs', url: 'https://www.lacartedescolocs.fr/' },
  ],
};

/** Pour se faire une idée des prix avant de remplir son budget : des chiffres déclarés par des habitants. */
export const COUT_DE_LA_VIE: LienRecherche = {
  libelle: 'Numbeo : coût de la vie par ville',
  url: 'https://www.numbeo.com/cost-of-living/',
};

export const STATUTS_LOGEMENT = ['repere', 'contacte', 'visite', 'retenu', 'ecarte'] as const;
export type StatutLogement = (typeof STATUTS_LOGEMENT)[number];

export const LIBELLES_STATUT_LOGEMENT: Record<StatutLogement, string> = {
  repere: 'Repéré',
  contacte: 'Contacté',
  visite: 'Visité',
  retenu: 'Retenu',
  ecarte: 'Écarté',
};

/** Logement repéré à la main (table `housings`). */
export interface Logement {
  id: string;
  pays: string;
  ville: string | null;
  titre: string;
  url: string | null;
  prix_mensuel: number | null;
  devise: string | null;
  quartier: string | null;
  trajet_min: number | null;
  statut: StatutLogement;
  notes: string | null;
}

export type ChampsLogement = Omit<Logement, 'id'>;

const CLE_LOGEMENTS = ['housings'] as const;

export function useLogements() {
  return useQuery({
    queryKey: CLE_LOGEMENTS,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('housings')
        .select('id,pays,ville,titre,url,prix_mensuel,devise,quartier,trajet_min,statut,notes')
        .order('created_at', { ascending: false })
        .overrideTypes<Logement[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useAjouterLogement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (champs: ChampsLogement) => {
      const { error } = await supabase!.from('housings').insert(champs);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE_LOGEMENTS }),
  });
}

export function useModifierLogement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...champs }: Partial<ChampsLogement> & { id: string }) => {
      const { error } = await supabase!.from('housings').update(champs).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE_LOGEMENTS }),
  });
}

export function useSupprimerLogement() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('housings').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE_LOGEMENTS }),
  });
}

/** Budget estimé pour un pays (table `budgets`). */
export interface Budget {
  pays: string;
  devise: string;
  lignes: LigneBudget[];
}

const CLE_BUDGETS = ['budgets'] as const;

export function useBudgets() {
  return useQuery({
    queryKey: CLE_BUDGETS,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('budgets')
        .select('pays,devise,lignes')
        .overrideTypes<Budget[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnregistrerBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (budget: Budget) => {
      const { error } = await supabase!.from('budgets').upsert(budget, { onConflict: 'pays' });
      if (error) throw error;
    },
    onSuccess: (_, budget) => {
      client.setQueryData<Budget[]>(CLE_BUDGETS, (budgets) => [
        ...(budgets ?? []).filter((autre) => autre.pays !== budget.pays),
        budget,
      ]);
    },
  });
}

/** Devise locale proposée par défaut pour le budget d'un pays (codes ISO 4217). */
export const DEVISES: Record<string, string> = {
  JP: 'JPY',
  KR: 'KRW',
  CO: 'COP',
  CA: 'CAD',
  GB: 'GBP',
  FR: 'EUR',
};
