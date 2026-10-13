import {
  changerStatut,
  joursEntre,
  LIBELLES_STATUT,
  type EtatSuivi,
  type StatutSuivi,
  type StoredOffer,
} from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface Evenement {
  id: string;
  type: 'statut' | 'relance' | 'entretien' | 'echeance' | 'note';
  titre: string;
  date: string;
  details: { lien?: string };
  fait: boolean;
}

export type OffreSuivie = Pick<
  StoredOffer,
  'id' | 'titre' | 'entreprise' | 'pays' | 'ville' | 'url' | 'type' | 'actif'
>;

/** Entreprise d'une candidature spontanée (table `companies`). */
export interface SocieteSuivie {
  id: string;
  nom: string;
  pays: string | null;
  ville: string | null;
}

/** Ce qu'une carte affiche, que la candidature réponde à une offre ou soit spontanée. */
export interface ResumeCandidature {
  titre: string;
  entreprise: string | null;
  pays: string | null;
  ville: string | null;
}

/** Une carte du suivi : la candidature, son offre et ses événements (entretiens, historique). */
export interface Candidature extends EtatSuivi {
  id: string;
  offer_id: string | null;
  company_id: string | null;
  societe: SocieteSuivie | null;
  resume: ResumeCandidature;
  position: number;
  notes: string | null;
  cv_document_id: string | null;
  lettre_document_id: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  notes_entretien: string | null;
  created_at: string;
  offre: OffreSuivie | null;
  evenements: Evenement[];
}

// Les liens sont nommés par leur clé étrangère : `events` pointe à la fois vers
// `applications` et vers `offers`, et PostgREST doit savoir lequel suivre.
const SELECTION =
  'id,offer_id,company_id,statut,position,date_candidature,prochaine_relance,notes,created_at,' +
  'cv_document_id,lettre_document_id,contact_nom,contact_email,notes_entretien,' +
  'offre:offers!applications_offer_id_fkey(id,titre,entreprise,pays,ville,url,type,actif),' +
  'societe:companies!applications_company_id_fkey(id,nom,pays,ville),' +
  'evenements:events!events_application_id_fkey(id,type,titre,date,details,fait)';

const CLE = ['candidatures'] as const;

export function useCandidatures() {
  return useQuery({
    queryKey: CLE,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('applications')
        .select(SELECTION)
        .order('position')
        .overrideTypes<Omit<Candidature, 'resume'>[], { merge: false }>();
      if (error) throw error;
      return data.map((candidature): Candidature => ({
        ...candidature,
        resume: resumer(candidature),
      }));
    },
  });
}

export const CANDIDATURE_SPONTANEE = 'Candidature spontanée';

function resumer({ offre, societe }: Omit<Candidature, 'resume'>): ResumeCandidature {
  if (offre) {
    return {
      titre: offre.titre,
      entreprise: offre.entreprise,
      pays: offre.pays,
      ville: offre.ville,
    };
  }
  return {
    titre: CANDIDATURE_SPONTANEE,
    entreprise: societe?.nom ?? null,
    pays: societe?.pays ?? null,
    ville: societe?.ville ?? null,
  };
}

/** Entretien à venir (ou le dernier saisi) d'une candidature. */
export function entretienDe(candidature: Candidature): Evenement | undefined {
  return candidature.evenements
    .filter((evenement) => evenement.type === 'entretien' && !evenement.fait)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Ajoute une offre au suivi, dans la première colonne. */
export function useSuivreOffre() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (offerId: string) => {
      const { error } = await supabase!
        .from('applications')
        // La date sert de rang : une nouvelle carte se place en bas de sa colonne.
        .insert({ offer_id: offerId, statut: 'a_etudier', position: Date.now() });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/** Range une offre dans « Postulé » : la candidature vient d'être envoyée sur le site d'origine. */
export function usePostulerOffre() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ offerId, aujourdhui }: { offerId: string; aujourdhui: string }) => {
      const etat = changerStatut(
        { statut: 'a_postuler', date_candidature: null, prochaine_relance: null },
        'postule',
        aujourdhui,
      );
      const { error } = await supabase!
        .from('applications')
        .insert({ offer_id: offerId, ...etat, position: Date.now() });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/** Ajoute une candidature spontanée auprès d'une entreprise cible. */
export function useSuivreEntreprise() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ companyId, etat }: { companyId: string; etat: EtatSuivi }) => {
      const { error } = await supabase!
        .from('applications')
        .insert({ company_id: companyId, ...etat, position: Date.now() });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

export interface ValeursCandidature extends EtatSuivi {
  notes: string | null;
  cv_document_id: string | null;
  lettre_document_id: string | null;
  contact_nom: string | null;
  contact_email: string | null;
  notes_entretien: string | null;
  /** Date et heure de l'entretien (ISO), ou `null` s'il n'y en a pas. */
  entretien: string | null;
  lien_entretien: string | null;
}

/** Valeurs actuelles d'une candidature, au format du formulaire. */
export function valeursDe(candidature: Candidature): ValeursCandidature {
  const entretien = entretienDe(candidature);
  return {
    statut: candidature.statut,
    date_candidature: candidature.date_candidature,
    prochaine_relance: candidature.prochaine_relance,
    notes: candidature.notes,
    cv_document_id: candidature.cv_document_id,
    lettre_document_id: candidature.lettre_document_id,
    contact_nom: candidature.contact_nom,
    contact_email: candidature.contact_email,
    notes_entretien: candidature.notes_entretien,
    entretien: entretien?.date ?? null,
    lien_entretien: entretien?.details.lien ?? null,
  };
}

async function enregistrer(candidature: Candidature, valeurs: ValeursCandidature): Promise<void> {
  const base = supabase!;
  const deplacee = valeurs.statut !== candidature.statut;
  const { error } = await base
    .from('applications')
    .update({
      statut: valeurs.statut,
      date_candidature: valeurs.date_candidature,
      prochaine_relance: valeurs.prochaine_relance,
      notes: valeurs.notes,
      cv_document_id: valeurs.cv_document_id,
      lettre_document_id: valeurs.lettre_document_id,
      contact_nom: valeurs.contact_nom,
      contact_email: valeurs.contact_email,
      notes_entretien: valeurs.notes_entretien,
      ...(deplacee ? { position: Date.now() } : {}),
    })
    .eq('id', candidature.id);
  if (error) throw error;

  const commun = {
    application_id: candidature.id,
    offer_id: candidature.offer_id,
    pays: candidature.resume.pays,
  };
  if (deplacee) {
    // Historique des changements de colonne : servira aux statistiques (taux de réponse).
    const { error: erreur } = await base.from('events').insert({
      ...commun,
      type: 'statut',
      titre: LIBELLES_STATUT[valeurs.statut],
      details: { de: candidature.statut, vers: valeurs.statut },
      fait: true,
    });
    if (erreur) throw erreur;
  }

  const existant = entretienDe(candidature);
  const details = valeurs.lien_entretien ? { lien: valeurs.lien_entretien } : {};
  if (valeurs.entretien && existant) {
    const memeHeure = new Date(valeurs.entretien).getTime() === new Date(existant.date).getTime();
    if (!memeHeure || valeurs.lien_entretien !== (existant.details.lien ?? null)) {
      const { error: erreur } = await base
        .from('events')
        .update({ date: valeurs.entretien, details })
        .eq('id', existant.id);
      if (erreur) throw erreur;
    }
  } else if (valeurs.entretien) {
    const { error: erreur } = await base.from('events').insert({
      ...commun,
      type: 'entretien',
      titre: `Entretien : ${candidature.resume.entreprise ?? candidature.resume.titre}`,
      date: valeurs.entretien,
      details,
    });
    if (erreur) throw erreur;
  } else if (existant) {
    const { error: erreur } = await base.from('events').delete().eq('id', existant.id);
    if (erreur) throw erreur;
  }
}

export function useEnregistrerCandidature() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      candidature,
      valeurs,
    }: {
      candidature: Candidature;
      valeurs: ValeursCandidature;
    }) => enregistrer(candidature, valeurs),
    // Même en cas d'échec : une partie des changements a pu être enregistrée.
    onSettled: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

/** Retire une candidature du suivi (ses événements partent avec elle). */
export function useRetirerCandidature() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase!.from('applications').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: CLE }),
  });
}

const CLE_OBJECTIF = ['settings', 'objectif_hebdo'] as const;

/** Nombre de candidatures visé par semaine. */
export function useObjectifHebdo() {
  return useQuery({
    queryKey: CLE_OBJECTIF,
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('settings')
        .select('objectif_hebdo')
        .maybeSingle()
        .overrideTypes<{ objectif_hebdo: number }, { merge: false }>();
      if (error) throw error;
      return data?.objectif_hebdo ?? 5;
    },
  });
}

export function useChangerObjectifHebdo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (objectif: number) => {
      const { error } = await supabase!
        .from('settings')
        .update({ objectif_hebdo: objectif })
        .eq('id', true);
      if (error) throw error;
    },
    onSuccess: (_, objectif) => client.setQueryData(CLE_OBJECTIF, objectif),
  });
}

const JOUR_COURT: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };

function jourCourt(jour: string): string {
  return new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', JOUR_COURT);
}

/** « Relancer aujourd'hui », « Relance en retard de 3 j », « Relance le 20 oct. ». */
export function libelleRelance(prochaine: string, aujourdhui: string): string {
  const jours = joursEntre(aujourdhui, prochaine);
  if (jours === 0) return "Relancer aujourd'hui";
  if (jours < 0) return `Relance en retard de ${-jours} j`;
  return `Relance le ${jourCourt(prochaine)}`;
}

/** « aujourd'hui à 14:00 », « demain à 09:30 », « mar. 20 oct. à 14:00 ». */
export function libelleEntretien(dateIso: string, maintenant: Date): string {
  const date = new Date(dateIso);
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const minuit = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const jours = Math.round((minuit(date) - minuit(maintenant)) / 86_400_000);
  if (jours === 0) return `aujourd'hui à ${heure}`;
  if (jours === 1) return `demain à ${heure}`;
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'short', ...JOUR_COURT });
  return `${jour} à ${heure}`;
}

export const STATUTS_AVANT_ENTRETIEN: readonly StatutSuivi[] = [
  'a_etudier',
  'a_postuler',
  'postule',
  'relance',
];
