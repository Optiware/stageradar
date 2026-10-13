import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface LienFiche {
  libelle: string;
  url: string;
  officiel?: boolean;
}

export interface EcheanceFiche {
  libelle: string;
  /** AAAA-MM-JJ. */
  date: string;
  source?: string;
}

/** Fiche d'un pays (table `country_sheets`) : notes sur le visa, liens officiels, échéances. */
export interface FichePays {
  pays: string;
  nom: string;
  contenu_md: string;
  liens: LienFiche[];
  echeances: EcheanceFiche[];
  statut: 'verifie' | 'a_verifier';
  derniere_verification: string | null;
}

const CLE = ['country_sheets'] as const;

export function useFichesPays() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('country_sheets')
        .select('pays,nom,contenu_md,liens,echeances,statut,derniere_verification')
        .overrideTypes<FichePays[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnregistrerFiche() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ pays, ...champs }: FichePays) => {
      const { error } = await supabase!.from('country_sheets').update(champs).eq('pays', pays);
      if (error) throw error;
    },
    onSuccess: (_, fiche) => {
      client.setQueryData<FichePays[]>(CLE, (fiches) =>
        fiches?.map((autre) => (autre.pays === fiche.pays ? fiche : autre)),
      );
    },
  });
}
