import {
  aTraduire,
  detecterLangue,
  lienGoogleTraductionPage,
  lienGoogleTraductionTexte,
  type TraductionOffre,
} from '@stageradar/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Languages } from 'lucide-react';
import { useState } from 'react';
import { dateLongue, LIBELLES_LANGUE, lienSur, type FeedOffer } from '../lib/offres';
import { supabase } from '../lib/supabase';
import { traductionSurAppareil, traduireOffre, type Avancement } from '../lib/traduction';
import { BOUTON_SECONDAIRE, SECONDAIRE } from '../lib/ui';

export interface TexteOffre {
  description: string | null;
  traduction: TraductionOffre | null;
}

export function cleTexteOffre(id: string) {
  return ['offers', 'description', id] as const;
}

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const TEXTE = 'mt-3 text-sm leading-relaxed break-words whitespace-pre-line';

/** La traduction a réussi mais n'a pas pu être enregistrée : elle reste affichée sur cet appareil. */
class NonEnregistree extends Error {}

function libelleAvancement({ etape, part }: Avancement): string {
  const pourcent = `${Math.round(part * 100)} %`;
  return etape === 'telechargement'
    ? `Téléchargement du modèle de langue… ${pourcent}`
    : `Traduction… ${pourcent}`;
}

/**
 * Description d'une offre. Si l'annonce n'est ni en français ni en anglais, propose sa traduction :
 * sur l'appareil quand le navigateur le permet (elle est alors enregistrée pour les autres
 * appareils), et dans tous les cas par un lien vers Google Traduction.
 */
export function OfferDescription({ offre, texte }: { offre: FeedOffer; texte: TexteOffre }) {
  const client = useQueryClient();
  const [original, setOriginal] = useState(false);
  const [avancement, setAvancement] = useState<Avancement | null>(null);

  const { description, traduction } = texte;
  const brut = `${offre.titre}\n${description ?? ''}`;
  const detectee = traduction?.langue ?? detecterLangue(brut);
  const langue = aTraduire(detectee) ? detectee : null;

  const surAppareil = useQuery({
    queryKey: ['traduction', 'sur-appareil', langue],
    queryFn: () => traductionSurAppareil(langue!),
    enabled: langue !== null && !traduction,
    staleTime: Infinity,
  });

  const traduire = useMutation({
    mutationFn: async () => {
      const resultat = await traduireOffre(langue!, offre.titre, description, setAvancement);
      client.setQueryData<TexteOffre>(cleTexteOffre(offre.id), {
        description,
        traduction: resultat,
      });
      const { error } = await supabase!
        .from('offers')
        .update({ traduction: resultat })
        .eq('id', offre.id);
      if (error) throw new NonEnregistree();
    },
    onSettled: () => setAvancement(null),
  });

  const page = lienSur(offre.url);
  const liens = (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {page && (
        <li>
          <a
            href={lienGoogleTraductionPage(page)}
            target="_blank"
            rel="noopener noreferrer"
            className={LIEN}
          >
            Annonce d'origine dans Google Traduction
          </a>
        </li>
      )}
      {description && (
        <li>
          <a
            href={lienGoogleTraductionTexte(brut).url}
            target="_blank"
            rel="noopener noreferrer"
            className={LIEN}
          >
            {lienGoogleTraductionTexte(brut).complet
              ? 'Ce texte dans Google Traduction'
              : 'Début de ce texte dans Google Traduction'}
          </a>
        </li>
      )}
    </ul>
  );

  if (!description && !langue) {
    return (
      <p className={`mt-3 text-sm ${SECONDAIRE}`}>
        La source ne fournit pas de description : voir l'annonce d'origine.
      </p>
    );
  }

  // Langue non reconnue sur un texte long (ni français, ni anglais avec certitude) : un simple
  // lien, sans rien affirmer sur la langue.
  if (!langue) {
    return (
      <>
        <p className={TEXTE}>{description}</p>
        {detectee === null && description!.length >= 200 && liens}
      </>
    );
  }

  const nomLangue = LIBELLES_LANGUE[langue]?.toLowerCase();
  const traduite = traduction && !original;
  return (
    <>
      <div
        role="group"
        aria-label="Traduction"
        className="mt-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-800/50"
      >
        <p className="flex items-center gap-2 text-sm font-bold">
          <Languages aria-hidden="true" className="size-4 shrink-0 text-primary-600" />
          {nomLangue ? `Annonce rédigée en ${nomLangue}` : 'Annonce dans une autre langue'}
        </p>

        {traduction ? (
          <>
            <p className={`mt-1 text-sm ${SECONDAIRE}`}>
              Traduite automatiquement en français le {dateLongue(traduction.date)}. Une traduction
              automatique peut se tromper : vérifie les points importants sur l'annonce d'origine.
            </p>
            <button
              type="button"
              aria-pressed={original}
              onClick={() => setOriginal(!original)}
              className={`mt-3 ${BOUTON_SECONDAIRE}`}
            >
              {original ? 'Voir la traduction' : "Voir l'original"}
            </button>
          </>
        ) : surAppareil.data ? (
          <>
            <p className={`mt-1 text-sm ${SECONDAIRE}`}>
              La traduction se fait sur cet appareil, puis elle est enregistrée : tu la retrouveras
              sur ton téléphone.
            </p>
            <button
              type="button"
              disabled={traduire.isPending}
              onClick={() => traduire.mutate()}
              className={`mt-3 ${BOUTON_SECONDAIRE}`}
            >
              Traduire en français
            </button>
            {traduire.isPending && (
              <p role="status" className={`mt-2 text-sm ${SECONDAIRE}`}>
                {avancement ? libelleAvancement(avancement) : 'Préparation…'}
              </p>
            )}
          </>
        ) : (
          surAppareil.isSuccess && (
            <p className={`mt-1 text-sm ${SECONDAIRE}`}>
              Ce navigateur ne traduit pas sur place. Ouvre cette offre dans Chrome sur ton
              ordinateur pour la traduire une fois pour toutes, ou passe par Google Traduction.
            </p>
          )
        )}

        {traduire.isError && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            {traduire.error instanceof NonEnregistree
              ? "La traduction n'a pas pu être enregistrée : elle ne sera pas visible sur tes autres appareils."
              : 'La traduction a échoué. Essaie avec Google Traduction.'}
          </p>
        )}
        {liens}
      </div>

      {traduite && (
        <p className="mt-4 text-sm font-bold break-words">
          <span className={SECONDAIRE}>Intitulé : </span>
          {traduction.titre}
        </p>
      )}
      {(traduite ? traduction.description : description) && (
        <p lang={traduite ? 'fr' : langue} className={TEXTE}>
          {traduite ? traduction.description : description}
        </p>
      )}
    </>
  );
}
