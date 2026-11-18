import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

// Communautés où rencontrer des startups et des développeurs (maquette du 18 novembre 2026). Chaque
// fiche a été ouverte le 18 novembre 2026 ; la phrase citée est recopiée telle quelle de la page.
// Une page qui refuse la lecture automatique (TokyoDev) n'est pas listée : elle n'a pas pu être vérifiée.

export const VERIFICATION_COMMUNAUTES = '18 novembre 2026';

export type TypeCommunaute = 'meetup' | 'communaute' | 'agenda';

export interface Communaute {
  id: string;
  nom: string;
  pays: string;
  ville: string;
  type: TypeCommunaute;
  url: string;
  /** Phrase de la page, recopiée mot pour mot. */
  citation: string;
  /** Langue des échanges, quand la page l'indique. */
  langue: 'anglais' | null;
  /** `true` si la page dit que c'est gratuit ; `null` si elle ne le dit pas. */
  gratuit: true | null;
  /** Ce que la page dit d'autre et qu'il faut savoir. */
  note?: string;
}

export const LIBELLES_TYPE_COMMUNAUTE: Record<TypeCommunaute, string> = {
  meetup: 'Rencontres',
  communaute: 'Communauté',
  agenda: 'Agenda d’événements',
};

export const COMMUNAUTES: Communaute[] = [
  {
    id: 'dev-japan',
    nom: 'Dev Japan',
    pays: 'JP',
    ville: 'Tokyo',
    type: 'meetup',
    url: 'https://www.meetup.com/devjapan/',
    citation: 'This is a group for developers, engineers and related backgrounds in Tokyo.',
    langue: null,
    gratuit: null,
  },
  {
    id: 'dev-korea',
    nom: 'Dev Korea',
    pays: 'KR',
    ville: 'Séoul',
    type: 'meetup',
    url: 'https://www.meetup.com/dev-korea/',
    citation:
      'We are a community dedicated to building a fair, transparent tech ecosystem in Korea.',
    langue: 'anglais',
    gratuit: null,
    note: 'La page dit relier des développeurs anglophones et annonce ses prochains événements sur Luma.',
  },
  {
    id: 'seoul-startups',
    nom: 'Seoul Startups',
    pays: 'KR',
    ville: 'Séoul',
    type: 'communaute',
    url: 'https://seoulstartups.com/',
    citation:
      'Seoul Startups is an English-speaking startup community for expats and Koreans in Seoul.',
    langue: 'anglais',
    gratuit: null,
  },
  {
    id: 'startup-oasis-bogota',
    nom: 'Startup Oasis (Bogotá Startup Founders and Tech Professionals)',
    pays: 'CO',
    ville: 'Bogotá',
    type: 'meetup',
    url: 'https://www.meetup.com/bogota-startup-founders-and-tech-professionals/',
    citation:
      'This group is for Colombia-based startup founders, developers, and tech professionals',
    langue: null,
    gratuit: true,
    note: 'La page indique « Our events are free to attend. » ; la plupart des rencontres sont en ligne.',
  },
  {
    id: 'ai-tinkerers-bogota',
    nom: 'AI Tinkerers Bogotá',
    pays: 'CO',
    ville: 'Bogotá',
    type: 'meetup',
    url: 'https://bogota.aitinkerers.org/',
    citation: 'AI Events in Bogotá | AI Tinkerers Meetups 2026',
    langue: null,
    gratuit: null,
    note: 'Seul le titre de la page est cité : elle ne décrit pas la communauté en une phrase.',
  },
  {
    id: 'dev-events-bogota',
    nom: 'dev.events : meetups à Bogotá',
    pays: 'CO',
    ville: 'Bogotá',
    type: 'agenda',
    url: 'https://dev.events/meetups/SA/CO/Bogota',
    citation: 'Developer meetups in Bogota 2026 / 2027',
    langue: null,
    gratuit: null,
    note: 'Un agenda, pas une communauté : les rencontres affichées étaient surtout en ligne.',
  },
];

/** Ce que dit la loi sur les stages non payés, avec la page officielle. */
export const SOURCE_GRATIFICATION = {
  libelle: 'Service-Public.gouv.fr : gratification minimale d’un étudiant en entreprise',
  url: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F32131',
  verifiee: VERIFICATION_COMMUNAUTES,
};

export type StatutReseau = 'a_contacter' | 'contacte' | 'a_repondu';

export const LIBELLES_STATUT_RESEAU: Record<StatutReseau, string> = {
  a_contacter: 'À contacter',
  contacte: 'Contacté',
  a_repondu: 'A répondu',
};

/** Une personne rencontrée dans une communauté (table `network_contacts`). */
export interface ContactReseau {
  id: string;
  nom: string;
  startup: string | null;
  role: string | null;
  /** Adresse e-mail ou lien (LinkedIn, site). */
  lien: string | null;
  /** Où je l'ai trouvé : nom d'une communauté ou texte libre. */
  origine: string | null;
  statut: StatutReseau;
  notes: string | null;
  created_at: string;
}

export type ChampsContactReseau = Omit<ContactReseau, 'id' | 'created_at'>;

const CLE = ['network_contacts'] as const;

export function useContactsReseau() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('network_contacts')
        .select('*')
        .order('created_at', { ascending: false })
        .overrideTypes<ContactReseau[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });
}

export function useEnregistrerContactReseau() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, champs }: { id?: string; champs: Partial<ChampsContactReseau> }) => {
      const requete = id
        ? supabase!.from('network_contacts').update(champs).eq('id', id)
        : supabase!.from('network_contacts').insert(champs);
      const { error } = await requete;
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export function useSupprimerContactReseau() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('network_contacts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}
