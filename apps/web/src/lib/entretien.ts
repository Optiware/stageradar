import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/** Fiche de préparation d'un entretien (table `interview_preps`, une par candidature). */
export interface FicheEntretien {
  application_id: string;
  checklist: Record<string, boolean>;
  reponses: Record<string, string>;
  mes_questions: string[];
  impression: 'bien' | 'mitige' | 'difficile' | null;
  prochaine_etape: string | null;
}

export function ficheVide(applicationId: string): FicheEntretien {
  return {
    application_id: applicationId,
    checklist: {},
    reponses: {},
    mes_questions: [],
    impression: null,
    prochaine_etape: null,
  };
}

function cle(applicationId: string) {
  return ['interview_preps', applicationId] as const;
}

export function useFicheEntretien(applicationId: string | null) {
  return useQuery({
    queryKey: cle(applicationId ?? ''),
    enabled: applicationId !== null,
    queryFn: async (): Promise<FicheEntretien> => {
      const { data, error } = await supabase!
        .from('interview_preps')
        .select('application_id,checklist,reponses,mes_questions,impression,prochaine_etape')
        .eq('application_id', applicationId!)
        .maybeSingle()
        .overrideTypes<FicheEntretien, { merge: false }>();
      if (error) throw error;
      return data ?? ficheVide(applicationId!);
    },
  });
}

/** Enregistre la fiche entière (création ou mise à jour), et l'affiche aussitôt. */
export function useEnregistrerFicheEntretien() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (fiche: FicheEntretien) => {
      const { error } = await supabase!
        .from('interview_preps')
        .upsert({ ...fiche, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onMutate: (fiche) => {
      client.setQueryData(cle(fiche.application_id), fiche);
    },
    onSettled: (_, __, fiche) => client.invalidateQueries({ queryKey: cle(fiche.application_id) }),
  });
}
