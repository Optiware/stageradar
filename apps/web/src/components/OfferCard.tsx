import { Link } from 'react-router';
import {
  anciennete,
  couleurTexteScore,
  estNouvelle,
  LIBELLES_DOMAINE,
  LIBELLES_LANGUE,
  LIBELLES_TELETRAVAIL,
  LIBELLES_TYPE,
  lieu,
  type FeedOffer,
} from '../lib/offres';
import type { Candidature } from '../lib/suivi';
import { BADGE, CARTE_SURVOL, SECONDAIRE } from '../lib/ui';
import { Flag } from './Flag';
import { OfferActions } from './OfferActions';

/** Logo de l'entreprise : son initiale sur un carré teinté. */
export function CompanyAvatar({ nom, className = '' }: { nom: string | null; className?: string }) {
  const texte = nom?.trim() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-primary-50 font-extrabold text-primary-700 dark:bg-primary-400/15 dark:text-primary-400 ${className}`}
    >
      {[...texte][0]!.toUpperCase()}
    </span>
  );
}

export function OfferCard({
  offre,
  candidature,
  selectionnee,
  maintenant,
  onOuvrir,
  onMasquee,
}: {
  offre: FeedOffer;
  candidature: Candidature | undefined;
  selectionnee: boolean;
  /** Heure du dernier chargement : sert à dater l'offre sans dépendre de l'heure du rendu. */
  maintenant: number;
  onOuvrir: () => void;
  onMasquee: (offre: FeedOffer) => void;
}) {
  const publiee = anciennete(offre.date_publication, maintenant);
  return (
    <article
      aria-label={offre.titre}
      className={`relative mt-3.5 rounded-3xl border-2 bg-white shadow-sm dark:bg-gray-900 ${CARTE_SURVOL} ${
        selectionnee
          ? 'border-primary-600 dark:border-primary-400'
          : 'border-gray-200 hover:opacity-100 dark:border-gray-800'
      } ${selectionnee ? '' : offre.exclue_raison || offre.masquee ? 'opacity-60' : 'opacity-80'}`}
    >
      <span
        aria-label={`Score ${offre.score ?? 0} sur 100`}
        className={`absolute -top-3.5 right-3.5 flex size-12 items-center justify-center rounded-full border-2 text-base font-extrabold shadow-sm ${
          selectionnee
            ? 'border-primary-600 bg-primary-600 text-white dark:border-primary-400 dark:bg-primary-400 dark:text-primary-ink'
            : `border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${couleurTexteScore(offre.score ?? 0)}`
        }`}
      >
        {offre.score ?? 0}
      </span>
      <Link
        to={{ search: `?offre=${offre.id}` }}
        onClick={onOuvrir}
        aria-current={selectionnee ? 'true' : undefined}
        className="block rounded-3xl p-5 pb-4"
      >
        <div className="flex items-start gap-4 pr-12">
          <CompanyAvatar nom={offre.entreprise} className="size-12 text-xl" />
          <div className="min-w-0 flex-1">
            <p className={`flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] ${SECONDAIRE}`}>
              {offre.entreprise && <span className="font-bold">{offre.entreprise}</span>}
              {offre.entreprise && lieu(offre) && <span aria-hidden="true">•</span>}
              {lieu(offre) && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 break-words">{lieu(offre)}</span>
                  <Flag code={offre.pays} />
                </span>
              )}
            </p>
            <h2 className="mt-1 leading-[1.3] font-extrabold break-words">{offre.titre}</h2>
          </div>
        </div>

        <ul className="mt-4 flex flex-wrap gap-2">
          <li className={offre.type === 'stage' ? BADGE.violet : BADGE.accent}>
            {LIBELLES_TYPE[offre.type]}
          </li>
          {offre.teletravail && offre.teletravail !== 'sur_site' && (
            <li className={BADGE.neutre}>{LIBELLES_TELETRAVAIL[offre.teletravail]}</li>
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
          {estNouvelle(offre, maintenant) && <li className={BADGE.ambre}>Nouveau</li>}
          {offre.exclue_raison && <li className={BADGE.rouge}>{offre.exclue_raison}</li>}
          {offre.masquee && <li className={BADGE.neutre}>Masquée</li>}
        </ul>

        {(publiee || offre.remuneration_texte) && (
          <p className={`mt-3 flex justify-between gap-3 text-xs ${SECONDAIRE}`}>
            <span className="min-w-0 truncate">{offre.remuneration_texte}</span>
            {publiee && <span className="shrink-0">Publiée {publiee}</span>}
          </p>
        )}
      </Link>
      <OfferActions
        offre={offre}
        candidature={candidature}
        onMasquee={onMasquee}
        className="px-5 pb-5"
      />
    </article>
  );
}
