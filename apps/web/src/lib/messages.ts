import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

/**
 * Un message d'une conversation. L'application ne lit aucune boîte e-mail : « envoyé » veut dire
 * parti de ma messagerie après un clic sur « Envoyer », « reçu » une réponse que j'ai collée.
 */
export interface MessageConversation {
  id: string;
  sens: 'envoye' | 'recu';
  corps: string;
  /** Noms des documents joints. */
  pieces: string[];
  date: string;
}

export interface Conversation {
  id: string;
  application_id: string | null;
  contact_nom: string;
  contact_role: string | null;
  contact_email: string | null;
  entreprise: string | null;
  pays: string | null;
  non_lu: boolean;
  created_at: string;
  messages: MessageConversation[];
}

export type ChampsConversation = Pick<
  Conversation,
  'application_id' | 'contact_nom' | 'contact_role' | 'contact_email' | 'entreprise' | 'pays'
>;

const SELECTION =
  'id,application_id,contact_nom,contact_role,contact_email,entreprise,pays,non_lu,created_at,' +
  'messages:messages!messages_conversation_id_fkey(id,sens,corps,pieces,date)';

const CLE = ['conversations'] as const;

/** Conversations, la plus récemment active d'abord ; leurs messages du plus ancien au plus récent. */
export function useConversations() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('conversations')
        .select(SELECTION)
        .overrideTypes<Conversation[], { merge: false }>();
      if (error) throw error;
      return data
        .map((conversation) => ({
          ...conversation,
          messages: [...conversation.messages].sort((a, b) => a.date.localeCompare(b.date)),
        }))
        .sort((a, b) => derniereActivite(b).localeCompare(derniereActivite(a)));
    },
  });
}

export function dernierMessage(conversation: Conversation): MessageConversation | undefined {
  return conversation.messages[conversation.messages.length - 1];
}

function derniereActivite(conversation: Conversation): string {
  return dernierMessage(conversation)?.date ?? conversation.created_at;
}

/** Crée une conversation et renvoie son identifiant (choisi ici pour pouvoir l'ouvrir aussitôt). */
export function useCreerConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (champs: ChampsConversation) => {
      const id = crypto.randomUUID();
      const { error } = await supabase!.from('conversations').insert({ id, ...champs });
      if (error) throw error;
      return id;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useModifierConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      champs,
    }: {
      id: string;
      champs: Partial<ChampsConversation & { non_lu: boolean }>;
    }) => {
      const { error } = await supabase!.from('conversations').update(champs).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useSupprimerConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('conversations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/**
 * Ajoute un message. Une réponse reçue marque la conversation « non lue » ailleurs que sur l'écran
 * où elle vient d'être collée, et annule la relance prévue de la candidature liée : la personne a
 * répondu, il n'y a plus à relancer.
 */
export function useAjouterMessage() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversation,
      sens,
      corps,
      pieces = [],
    }: {
      conversation: Conversation;
      sens: MessageConversation['sens'];
      corps: string;
      pieces?: string[];
    }) => {
      const base = supabase!;
      const { error } = await base
        .from('messages')
        .insert({ conversation_id: conversation.id, sens, corps, pieces });
      if (error) throw error;
      if (sens === 'recu' && conversation.application_id) {
        const { error: erreur } = await base
          .from('applications')
          .update({ prochaine_relance: null })
          .eq('id', conversation.application_id);
        if (erreur) throw erreur;
      }
    },
    onSettled: () =>
      Promise.all([
        client.invalidateQueries({ queryKey: CLE }),
        client.invalidateQueries({ queryKey: ['candidatures'] }),
      ]),
  });
}

/** Nombre de conversations avec une réponse pas encore ouverte : la pastille de l'onglet. */
export function useNonLus(): number {
  return (useConversations().data ?? []).filter((conversation) => conversation.non_lu).length;
}

export type LangueReponse = 'en' | 'fr';

/** Réponses rapides proposées au-dessus du champ : un point de départ, toujours à relire. */
export function reponseRapide(
  type: 'accepter' | 'remercier' | 'autre_horaire',
  langue: LangueReponse,
  prenom: string,
  creneau: string | null,
): string {
  if (langue === 'fr') {
    const bonjour = `Bonjour ${prenom},`;
    if (type === 'accepter') {
      return `${bonjour}\n\nMerci beaucoup ! ${creneau ? `Le créneau « ${creneau} » me convient très bien.` : 'Le créneau proposé me convient très bien.'} À bientôt.`;
    }
    if (type === 'remercier') {
      return `${bonjour}\n\nMerci beaucoup pour votre réponse et pour le temps que vous m'accordez.`;
    }
    return `${bonjour}\n\nMerci pour votre proposition. Je ne suis malheureusement pas disponible à ces horaires. Seriez-vous libre [autre créneau, avec le fuseau horaire] ?`;
  }
  const bonjour = `Hi ${prenom},`;
  if (type === 'accepter') {
    return `${bonjour}\n\nThank you! ${creneau ? `${creneau} works well for me.` : 'The proposed time works well for me.'} Looking forward to our call.`;
  }
  if (type === 'remercier') {
    return `${bonjour}\n\nThank you very much for your reply and for your time.`;
  }
  return `${bonjour}\n\nThank you for the proposal. Unfortunately I am not available at those times. Would [another slot, with the time zone] work for you?`;
}
