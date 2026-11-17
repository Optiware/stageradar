import { TERMES_TECHNOLOGIES } from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/** Un projet du portfolio (table `projects`). */
export interface Projet {
  id: string;
  titre: string;
  description: string;
  technologies: string[];
  statut: 'en_cours' | 'termine';
  url_code: string | null;
  url_demo: string | null;
  /** Capture réduite, en data URL. */
  image: string | null;
  appris: string;
  a_readme: boolean;
  a_captures: boolean;
  a_tests: boolean;
  position: number;
  created_at: string;
}

export type ChampsProjet = Omit<Projet, 'id' | 'position' | 'created_at'>;

export const PROJET_VIDE: ChampsProjet = {
  titre: '',
  description: '',
  technologies: [],
  statut: 'en_cours',
  url_code: null,
  url_demo: null,
  image: null,
  appris: '',
  a_readme: false,
  a_captures: false,
  a_tests: false,
};

const CLE = ['projets'] as const;

/** Projets dans l'ordre choisi, puis du plus récent au plus ancien. */
export function useProjets() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('projects')
        .select('*')
        .order('position')
        .order('created_at', { ascending: false })
        .overrideTypes<Projet[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

/** Crée le projet (sans `id`) ou le met à jour. */
export function useEnregistrerProjet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, champs }: { id?: string; champs: ChampsProjet }) => {
      const requete = id
        ? supabase!.from('projects').update(champs).eq('id', id)
        : supabase!.from('projects').insert(champs);
      const { error } = await requete;
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useSupprimerProjet() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('projects').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/** Nombre d'offres visibles qui citent chaque technologie connue (calculé par la base). */
export function useTechnologiesDemandees() {
  return useQuery({
    queryKey: ['technologies-demandees'],
    queryFn: async () => {
      const { data, error } = await supabase!.rpc('technologies_demandees', {
        termes: [...TERMES_TECHNOLOGIES],
      });
      if (error) throw error;
      return data as { terme: string; nombre: number }[];
    },
    staleTime: 60 * 60_000,
  });
}

/**
 * Réduit une image choisie sur l'appareil (640 px de large au plus, JPEG) : le résultat reste
 * petit pour la base et pour le cache gardé hors ligne.
 */
export async function reduireImage(fichier: File): Promise<string> {
  const bitmap = await createImageBitmap(fichier);
  const echelle = Math.min(1, 640 / bitmap.width);
  const toile = document.createElement('canvas');
  toile.width = Math.round(bitmap.width * echelle);
  toile.height = Math.round(bitmap.height * echelle);
  toile.getContext('2d')!.drawImage(bitmap, 0, 0, toile.width, toile.height);
  bitmap.close();
  return toile.toDataURL('image/jpeg', 0.75);
}
