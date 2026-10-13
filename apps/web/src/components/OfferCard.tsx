import { Link } from 'react-router';
import {
  anciennete,
  couleurScore,
  estNouvelle,
  LIBELLES_DOMAINE,
  LIBELLES_LANGUE,
  LIBELLES_TELETRAVAIL,
  LIBELLES_TYPE,
  lieu,
  type FeedOffer,
} from '../lib/offres';
import { BADGE, CARTE_SURVOL, SECONDAIRE } from '../lib/ui';
import { Flag } from './Flag';

/** Pastille à l'initiale de l'entreprise. */
export function CompanyAvatar({ nom, className = '' }: { nom: string | null; className?: string }) {
  const texte = nom?.trim() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 font-extrabold text-primary-600 dark:border-primary-900/50 dark:bg-primary-900/30 dark:text-primary-400 ${className}`}
    >
      {[...texte][0]!.toUpperCase()}
    </span>
  );
}

export function OfferCard({
  offre,
  selectionnee,
  maintenant,
  onOuvrir,
}: {
  offre: FeedOffer;
  selectionnee: boolean;
  /** Heure du dernier chargement : sert à dater l'offre sans dépendre de l'heure du rendu. */
  maintenant: number;
  onOuvrir: () => void;
}) {
  const publiee = anciennete(offre.date_publication, maintenant);
  return (
    <article aria-label={offre.titre}>
      <Link
        to={{ search: `?offre=${offre.id}` }}
        onClick={onOuvrir}
        aria-current={selectionnee ? 'true' : undefined}
        className={`block rounded-3xl border p-5 shadow-sm ${CARTE_SURVOL} ${
          selectionnee
            ? 'border-primary-500 bg-primary-50/60 ring-1 ring-primary-500 dark:bg-primary-900/20'
            : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
        } ${offre.exclue_raison ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start gap-4">
          <CompanyAvatar nom={offre.entreprise} className="size-12 text-xl" />
          <div className="min-w-0 flex-1">
            <h2 className="leading-tight font-bold break-words">{offre.titre}</h2>
            {offre.entreprise && (
              <p className={`mt-1 text-sm font-bold ${SECONDAIRE}`}>{offre.entreprise}</p>
            )}
            {lieu(offre) && (
              <p className={`mt-1 flex items-center gap-1.5 text-sm ${SECONDAIRE}`}>
                <Flag code={offre.pays} />
                <span className="min-w-0 break-words">{lieu(offre)}</span>
              </p>
            )}
          </div>
          <span
            aria-label={`Score ${offre.score ?? 0} sur 100`}
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${couleurScore(offre.score ?? 0)}`}
          >
            {offre.score ?? 0}
          </span>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          {estNouvelle(offre, maintenant) && <li className={BADGE.vert}>Nouveau</li>}
          <li className={BADGE.neutre}>{LIBELLES_TYPE[offre.type]}</li>
          {offre.teletravail && offre.teletravail !== 'sur_site' && (
            <li className={BADGE.bleu}>{LIBELLES_TELETRAVAIL[offre.teletravail]}</li>
          )}
          {offre.domaines.map((domaine) => (
            <li key={domaine} className={BADGE.neutre}>
              {LIBELLES_DOMAINE[domaine]}
            </li>
          ))}
          {offre.langues_requises
            .filter((langue) => LIBELLES_LANGUE[langue])
            .map((langue) => (
              <li key={langue} className={BADGE.ambre}>
                {LIBELLES_LANGUE[langue]} exigé
              </li>
            ))}
          {offre.exclue_raison && <li className={BADGE.rouge}>{offre.exclue_raison}</li>}
        </ul>

        {(publiee || offre.remuneration_texte) && (
          <p className={`mt-3 flex justify-between gap-3 text-xs ${SECONDAIRE}`}>
            <span className="min-w-0 truncate">{offre.remuneration_texte}</span>
            {publiee && <span className="shrink-0">Publiée {publiee}</span>}
          </p>
        )}
      </Link>
    </article>
  );
}
