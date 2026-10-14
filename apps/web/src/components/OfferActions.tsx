import { Bookmark, BookmarkCheck, Eye, X } from 'lucide-react';
import { Link } from 'react-router';
import { useMasquerOffre } from '../lib/fil';
import type { FeedOffer } from '../lib/offres';
import { useSuivreOffre, type Candidature } from '../lib/suivi';
import { BOUTON_ACCENT, BOUTON_DOUX } from '../lib/ui';

const BASE = 'flex flex-1 items-center justify-center gap-2';
/** Offre déjà sauvée : même bouton, en fond teinté. */
const SUIVIE =
  'rounded-2xl bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700 transition hover:bg-primary-100 dark:bg-primary-400/15 dark:text-primary-400 dark:hover:bg-primary-400/25';

/** Les deux actions rapides d'une offre : la masquer du fil, ou la garder dans le suivi. */
export function OfferActions({
  offre,
  candidature,
  onMasquee,
  className = '',
}: {
  offre: FeedOffer;
  /** Renseignée si l'offre est déjà dans le suivi. */
  candidature: Candidature | undefined;
  /** Appelée une fois l'offre masquée (pas quand elle est réaffichée). */
  onMasquee?: (offre: FeedOffer) => void;
  className?: string;
}) {
  const masquer = useMasquerOffre();
  const suivre = useSuivreOffre();

  return (
    <div className={className}>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={masquer.isPending}
          onClick={() =>
            masquer.mutate(
              { id: offre.id, masquee: !offre.masquee },
              { onSuccess: () => !offre.masquee && onMasquee?.(offre) },
            )
          }
          className={`${BASE} ${BOUTON_DOUX}`}
        >
          {offre.masquee ? (
            <>
              <Eye aria-hidden="true" className="size-4" /> Réafficher
            </>
          ) : (
            <>
              <X aria-hidden="true" className="size-4" /> Masquer
            </>
          )}
        </button>
        {candidature ? (
          <Link to={`/suivi?candidature=${candidature.id}`} className={`${BASE} ${SUIVIE}`}>
            <BookmarkCheck aria-hidden="true" className="size-4" /> Dans le suivi
          </Link>
        ) : (
          <button
            type="button"
            disabled={suivre.isPending}
            onClick={() => suivre.mutate(offre.id)}
            className={`${BASE} ${BOUTON_ACCENT}`}
          >
            <Bookmark aria-hidden="true" className="size-4" /> Sauver
          </button>
        )}
      </div>
      {(masquer.isError || suivre.isError) && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
          L'action n'a pas pu être enregistrée. Vérifie ta connexion.
        </p>
      )}
    </div>
  );
}
