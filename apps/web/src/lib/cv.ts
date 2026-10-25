import { profilCvComplet, type OffreCiblee, type ProfilCv } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

const CLE = ['settings', 'cv'] as const;

/** Profil du générateur de CV (colonne `settings.cv`). */
export function useProfilCv() {
  return useQuery({
    queryKey: CLE,
    queryFn: async (): Promise<ProfilCv> => {
      const { data, error } = await supabase!
        .from('settings')
        .select('cv')
        .maybeSingle()
        .overrideTypes<{ cv: unknown }, { merge: false }>();
      if (error) throw error;
      return profilCvComplet(data?.cv);
    },
  });
}

export function useEnregistrerProfilCv() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (cv: ProfilCv) => {
      const { error } = await supabase!.from('settings').update({ cv }).eq('id', true);
      if (error) throw error;
    },
    onSuccess: (_, cv) => client.setQueryData(CLE, cv),
  });
}

export interface OffreCv extends OffreCiblee {
  id: string;
  pays: string | null;
}

/** Offre visée par le CV : sa description sert à repérer ce qu'elle attend. */
export function useOffreCv(id: string | null) {
  return useQuery({
    queryKey: ['offers', id, 'cv'],
    enabled: !!id,
    queryFn: async (): Promise<OffreCv | null> => {
      const { data, error } = await supabase!
        .from('offers')
        .select('id,titre,entreprise,pays,description,competences,langues_requises')
        .eq('id', id!)
        .maybeSingle()
        .overrideTypes<OffreCv, { merge: false }>();
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60_000,
  });
}
