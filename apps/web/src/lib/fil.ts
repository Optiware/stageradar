import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { COLONNES_FIL, type FeedOffer } from './offres';
import { supabase } from './supabase';

const CLE_FIL = ['offers', 'feed'] as const;

/**
 * Offres actives, la mieux notée d'abord. Mono-utilisateur, quelques centaines d'offres au plus :
 * tout est chargé d'un coup, et les filtres s'appliquent sur place, sans nouvel appel.
 */
export function useOffresDuFil() {
  return useQuery({
    queryKey: CLE_FIL,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('offers')
        .select(COLONNES_FIL)
        .eq('actif', true)
        .order('score', { ascending: false })
        .order('date_publication', { ascending: false, nullsFirst: false })
        .limit(500)
        .overrideTypes<FeedOffer[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

/** Masque une offre du fil, ou la fait revenir. */
export function useMasquerOffre() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, masquee }: { id: string; masquee: boolean }) => {
      const { error } = await supabase!.from('offers').update({ masquee }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { id, masquee }) => {
      client.setQueryData<FeedOffer[]>(CLE_FIL, (offres) =>
        offres?.map((offre) => (offre.id === id ? { ...offre, masquee } : offre)),
      );
    },
  });
}
