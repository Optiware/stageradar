import {
  MISE_EN_PAGE_DEFAUT,
  profilCvComplet,
  type MiseEnPageCv,
  type OffreCiblee,
  type ProfilCv,
} from '@stageradar/shared';
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

const CLE_MISES_EN_PAGE = ['settings', 'cv_mises_en_page'] as const;

/** Clé d'une mise en page enregistrée : « JP:general », « JP:<id de l'offre> ». */
export function cleMiseEnPage(pays: string, offreId: string | null): string {
  return `${pays}:${offreId ?? 'general'}`;
}

/** Mises en page enregistrées de l'éditeur de CV (colonne `settings.cv_mises_en_page`). */
export function useMisesEnPage() {
  return useQuery({
    queryKey: CLE_MISES_EN_PAGE,
    queryFn: async (): Promise<Record<string, MiseEnPageCv>> => {
      const { data, error } = await supabase!
        .from('settings')
        .select('cv_mises_en_page')
        .maybeSingle()
        .overrideTypes<
          { cv_mises_en_page: Record<string, Partial<MiseEnPageCv>> | null },
          { merge: false }
        >();
      if (error) throw error;
      // Complète une mise en page enregistrée avant l'ajout d'un réglage.
      return Object.fromEntries(
        Object.entries(data?.cv_mises_en_page ?? {}).map(([cle, valeur]) => [
          cle,
          { ...MISE_EN_PAGE_DEFAUT, ...valeur },
        ]),
      );
    },
  });
}

export function useEnregistrerMiseEnPage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ cle, miseEnPage }: { cle: string; miseEnPage: MiseEnPageCv }) => {
      const toutes = {
        ...(client.getQueryData<Record<string, MiseEnPageCv>>(CLE_MISES_EN_PAGE) ?? {}),
        [cle]: miseEnPage,
      };
      const { error } = await supabase!
        .from('settings')
        .update({ cv_mises_en_page: toutes })
        .eq('id', true);
      if (error) throw error;
      return toutes;
    },
    onSuccess: (toutes) => client.setQueryData(CLE_MISES_EN_PAGE, toutes),
  });
}
