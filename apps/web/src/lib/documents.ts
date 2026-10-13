import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/**
 * CV ou lettre (table `documents`). Le fichier lui-même reste là où il est rangé (ordinateur,
 * espace en ligne) : l'application garde son titre, sa version et, si l'on veut, son adresse.
 */
export interface DocumentCandidature {
  id: string;
  type: 'cv' | 'lettre' | 'autre';
  langue: string | null;
  titre: string;
  version: number;
  /** Adresse du fichier, s'il est en ligne. */
  chemin_stockage: string | null;
  notes: string | null;
}

export type ChampsDocument = Omit<DocumentCandidature, 'id'>;

export const LIBELLES_TYPE_DOCUMENT: Record<DocumentCandidature['type'], string> = {
  cv: 'CV',
  lettre: 'Lettre',
  autre: 'Autre',
};

export const LANGUES_DOCUMENT: [string, string][] = [
  ['fr', 'Français'],
  ['en', 'Anglais'],
  ['es', 'Espagnol'],
  ['ja', 'Japonais'],
  ['ko', 'Coréen'],
];

/** « CV anglais v2 : Développeur ». */
export function nomDocument(document: DocumentCandidature): string {
  const langue = LANGUES_DOCUMENT.find(([code]) => code === document.langue)?.[1].toLowerCase();
  return `${[LIBELLES_TYPE_DOCUMENT[document.type], langue, `v${document.version}`]
    .filter(Boolean)
    .join(' ')} : ${document.titre}`;
}

const CLE = ['documents'] as const;

export function useDocuments() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('documents')
        .select('id,type,langue,titre,version,chemin_stockage,notes')
        .order('type')
        .order('version', { ascending: false })
        .overrideTypes<DocumentCandidature[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useAjouterDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (champs: ChampsDocument) => {
      const { error } = await supabase!.from('documents').insert(champs);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useSupprimerDocument() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}
