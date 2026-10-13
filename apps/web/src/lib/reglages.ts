import { DEFAULT_POIDS, DEFAULT_PROFIL, type Poids, type Profil } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface Notifications {
  seuil_push: number;
  resume_quotidien: { actif: boolean; heure: string; fuseau: string };
  heures_calmes: { debut: string; fin: string };
}

/** Ligne unique de la table `settings`. */
export interface Reglages {
  profil: Profil;
  poids: Poids;
  notifications: Notifications;
  objectif_hebdo: number;
  /** Présentation reprise dans les messages aux entreprises. */
  presentation: string;
}

export const NOTIFICATIONS_DEFAUT: Notifications = {
  seuil_push: 75,
  resume_quotidien: { actif: true, heure: '19:00', fuseau: 'Europe/Paris' },
  heures_calmes: { debut: '22:00', fin: '08:00' },
};

const CLE = ['settings'] as const;

export function useReglages() {
  return useQuery({
    queryKey: CLE,
    queryFn: async (): Promise<Reglages> => {
      const { data, error } = await supabase!
        .from('settings')
        .select('profil,poids,notifications,objectif_hebdo,presentation')
        .maybeSingle()
        .overrideTypes<Partial<Reglages>, { merge: false }>();
      if (error) throw error;
      // Une base ancienne peut ne pas avoir toutes les clés : les valeurs par défaut comblent.
      return {
        profil: {
          ...DEFAULT_PROFIL,
          ...data?.profil,
          alternance: { ...DEFAULT_PROFIL.alternance, ...data?.profil?.alternance },
          stage: { ...DEFAULT_PROFIL.stage, ...data?.profil?.stage },
        },
        poids: { ...DEFAULT_POIDS, ...data?.poids },
        notifications: {
          ...NOTIFICATIONS_DEFAUT,
          ...data?.notifications,
          resume_quotidien: {
            ...NOTIFICATIONS_DEFAUT.resume_quotidien,
            ...data?.notifications?.resume_quotidien,
          },
          heures_calmes: {
            ...NOTIFICATIONS_DEFAUT.heures_calmes,
            ...data?.notifications?.heures_calmes,
          },
        },
        objectif_hebdo: data?.objectif_hebdo ?? 5,
        presentation: data?.presentation ?? '',
      };
    },
  });
}

export function useEnregistrerReglages() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (reglages: Partial<Reglages>) => {
      const { error } = await supabase!.from('settings').update(reglages).eq('id', true);
      if (error) throw error;
    },
    onSuccess: (_, reglages) => {
      client.setQueryData<Reglages>(CLE, (actuels) => actuels && { ...actuels, ...reglages });
      // L'objectif est aussi lu, seul, par l'écran « Important ».
      void client.invalidateQueries({ queryKey: ['settings', 'objectif_hebdo'] });
    },
  });
}
