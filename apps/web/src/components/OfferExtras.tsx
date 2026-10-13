import { changerStatut, jourIso } from '@stageradar/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FeedOffer } from '../lib/offres';
import {
  STATUTS_AVANT_ENTRETIEN,
  useEnregistrerCandidature,
  usePostulerOffre,
  valeursDe,
  type Candidature,
} from '../lib/suivi';
import { supabase } from '../lib/supabase';
import { BOUTON_DOUX, BOUTON_SECONDAIRE, CHAMP, SECONDAIRE } from '../lib/ui';
import { cleTexteOffre, type TexteOffre } from './OfferDescription';

/**
 * Posée après un clic sur « Postuler » : l'annonce s'est ouverte ailleurs, et l'application ne
 * peut pas savoir si la candidature est partie. Un « oui » la range dans « Postulé » avec la date
 * du jour et une relance à J+7.
 */
export function QuestionPostule({
  offre,
  candidature,
  onRepondu,
}: {
  offre: FeedOffer;
  candidature: Candidature | undefined;
  onRepondu: () => void;
}) {
  const postuler = usePostulerOffre();
  const enregistrer = useEnregistrerCandidature();

  function oui() {
    const aujourdhui = jourIso(new Date());
    if (!candidature) {
      postuler.mutate({ offerId: offre.id, aujourdhui }, { onSuccess: onRepondu });
      return;
    }
    enregistrer.mutate(
      {
        candidature,
        valeurs: {
          ...valeursDe(candidature),
          ...changerStatut(candidature, 'postule', aujourdhui),
        },
      },
      { onSuccess: onRepondu },
    );
  }

  // Déjà en « Entretien », « Offre » ou « Refus » : la question n'a plus de sens.
  if (candidature && !STATUTS_AVANT_ENTRETIEN.includes(candidature.statut)) return null;
  if (candidature?.statut === 'postule' || candidature?.statut === 'relance') return null;

  return (
    <div
      role="group"
      aria-label="As-tu postulé ?"
      className="mt-3 rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20"
    >
      <p className="text-sm font-bold">As-tu postulé à cette offre ?</p>
      <p className={`mt-1 text-sm ${SECONDAIRE}`}>
        Si oui, elle passe dans « Postulé » avec la date du jour, et une relance est prévue dans
        sept jours.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={postuler.isPending || enregistrer.isPending}
          onClick={oui}
          className={`${BOUTON_SECONDAIRE} bg-white dark:bg-gray-900`}
        >
          Oui, c'est envoyé
        </button>
        <button type="button" onClick={onRepondu} className={BOUTON_DOUX}>
          Pas encore
        </button>
      </div>
      {(postuler.isError || enregistrer.isError) && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
          La candidature n'a pas pu être notée. Vérifie ta connexion.
        </p>
      )}
    </div>
  );
}

/** Notes personnelles sur une offre, visibles sur tous les appareils. */
export function NotesOffre({ offre, notes }: { offre: FeedOffer; notes: string | null }) {
  const client = useQueryClient();
  const [texte, setTexte] = useState(notes ?? '');
  const enregistrer = useMutation({
    mutationFn: async () => {
      const valeur = texte.trim() || null;
      const { error } = await supabase!.from('offers').update({ notes: valeur }).eq('id', offre.id);
      if (error) throw error;
      client.setQueryData<TexteOffre>(
        cleTexteOffre(offre.id),
        (actuel) => actuel && { ...actuel, notes: valeur },
      );
    },
  });
  const inchange = texte.trim() === (notes ?? '');

  return (
    <>
      <label className="sr-only" htmlFor={`notes-${offre.id}`}>
        Mes notes sur cette offre
      </label>
      <textarea
        id={`notes-${offre.id}`}
        rows={3}
        value={texte}
        placeholder="Ce qui te plaît, une question à poser, le nom d'un contact…"
        onChange={(evenement) => setTexte(evenement.target.value)}
        className={CHAMP}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={inchange || enregistrer.isPending}
          onClick={() => enregistrer.mutate()}
          className={BOUTON_SECONDAIRE}
        >
          Enregistrer la note
        </button>
        {enregistrer.isSuccess && inchange && (
          <span role="status" className="text-sm font-bold text-primary-700 dark:text-primary-400">
            Note enregistrée.
          </span>
        )}
        {enregistrer.isError && (
          <span role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            La note n'a pas pu être enregistrée.
          </span>
        )}
      </div>
    </>
  );
}
