import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/** Une personne d'une entreprise démarchée (table `company_contacts`). */
export interface ContactEntreprise {
  id: string;
  company_id: string;
  nom: string;
  role: string | null;
  email: string | null;
  linkedin: string | null;
  langue: string | null;
  notes: string | null;
  principal: boolean;
  dernier_echange: string | null;
  created_at: string;
}

export type ChampsContact = Omit<
  ContactEntreprise,
  'id' | 'company_id' | 'principal' | 'created_at'
>;

export const CONTACT_VIDE: ChampsContact = {
  nom: '',
  role: null,
  email: null,
  linkedin: null,
  langue: null,
  notes: null,
  dernier_echange: null,
};

const CLE = ['company_contacts'] as const;

/** Tous les contacts, le principal d'abord puis du plus ancien au plus récent. */
export function useContacts() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('company_contacts')
        .select('*')
        .order('principal', { ascending: false })
        .order('created_at')
        .overrideTypes<ContactEntreprise[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnregistrerContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      companyId,
      champs,
      principal = false,
    }: {
      id?: string;
      companyId: string;
      champs: ChampsContact;
      principal?: boolean;
    }) => {
      const requete = id
        ? supabase!.from('company_contacts').update(champs).eq('id', id)
        : supabase!
            .from('company_contacts')
            .insert({ ...champs, company_id: companyId, principal });
      const { error } = await requete;
      if (error) throw error;
      if (principal) await recopierSurEntreprise(companyId, champs);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: CLE });
      void client.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

/** Le contact principal est aussi celui des messages de démarchage (`companies.contact_*`). */
async function recopierSurEntreprise(companyId: string, contact: ChampsContact) {
  const { error } = await supabase!
    .from('companies')
    .update({
      contact_nom: contact.nom,
      contact_email: contact.email,
      contact_linkedin: contact.linkedin,
    })
    .eq('id', companyId);
  if (error) throw error;
}

/** Rend un contact principal : l'ancien perd l'étoile d'abord (un seul principal par entreprise). */
export function useRendrePrincipal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contact,
      ancien,
    }: {
      contact: ContactEntreprise;
      ancien: ContactEntreprise | undefined;
    }) => {
      const base = supabase!;
      if (ancien) {
        const { error: erreur } = await base
          .from('company_contacts')
          .update({ principal: false })
          .eq('id', ancien.id);
        if (erreur) throw erreur;
      }
      const { error } = await base
        .from('company_contacts')
        .update({ principal: true })
        .eq('id', contact.id);
      if (error) throw error;
      await recopierSurEntreprise(contact.company_id, contact);
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: CLE });
      void client.invalidateQueries({ queryKey: ['companies'] });
    },
  });
}

export function useSupprimerContact() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('company_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}
