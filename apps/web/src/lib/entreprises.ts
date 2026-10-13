import { normalizeText } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/** Entreprise cible à démarcher (table `companies`). */
export interface Entreprise {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
  site: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  contact_linkedin: string | null;
  notes: string | null;
}

export type ChampsEntreprise = Omit<Entreprise, 'id'>;

export const ENTREPRISE_VIDE: ChampsEntreprise = {
  nom: '',
  pays: null,
  ville: null,
  site: null,
  contact_nom: null,
  contact_email: null,
  contact_linkedin: null,
  notes: null,
};

const CLE = ['companies'] as const;

export function useEntreprises() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('companies')
        .select('id,nom,pays,ville,site,contact_nom,contact_email,contact_linkedin,notes')
        .order('created_at', { ascending: false })
        .overrideTypes<Entreprise[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

/** Crée l'entreprise, ou la modifie si `id` est fourni. */
export function useEnregistrerEntreprise() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, champs }: { id?: string; champs: ChampsEntreprise }) => {
      const ligne = { ...champs, nom: champs.nom.trim(), nom_norm: normalizeText(champs.nom) };
      const { error } = id
        ? await supabase!.from('companies').update(ligne).eq('id', id)
        : await supabase!.from('companies').insert({ ...ligne, origine: 'manuel' });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useSupprimerEntreprise() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('companies').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}
