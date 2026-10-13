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
import { Flag } from './Flag';

const TEINTES = [
  'bg-teal-100 text-teal-900',
  'bg-sky-100 text-sky-900',
  'bg-violet-100 text-violet-900',
  'bg-amber-100 text-amber-900',
  'bg-rose-100 text-rose-900',
  'bg-lime-100 text-lime-900',
];

/** Pastille à l'initiale de l'entreprise : la même entreprise garde toujours la même teinte. */
export function CompanyAvatar({ nom, className = '' }: { nom: string | null; className?: string }) {
  const texte = nom?.trim() || '?';
  let somme = 0;
  for (const caractere of texte) somme += caractere.codePointAt(0) ?? 0;
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-lg font-semibold ${TEINTES[somme % TEINTES.length]} ${className}`}
    >
      {[...texte][0]!.toUpperCase()}
    </span>
  );
}

const PUCE = 'rounded-full px-2 py-0.5';

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
        className={`block rounded-xl border p-4 transition-shadow hover:shadow-md ${
          selectionnee
            ? 'border-accent-600 bg-accent-50/60 ring-1 ring-accent-600 dark:bg-accent-900/20'
            : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        } ${offre.exclue_raison ? 'opacity-75' : ''}`}
      >
        <div className="flex items-start gap-3">
          <CompanyAvatar nom={offre.entreprise} className="size-11 text-lg" />
          <div className="min-w-0 flex-1">
            <h2 className="leading-snug font-semibold break-words">{offre.titre}</h2>
            {offre.entreprise && (
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-200">
                {offre.entreprise}
              </p>
            )}
            {lieu(offre) && (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                <Flag code={offre.pays} />
                <span className="min-w-0 break-words">{lieu(offre)}</span>
              </p>
            )}
          </div>
          <span
            aria-label={`Score ${offre.score ?? 0} sur 100`}
            className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${couleurScore(offre.score ?? 0)}`}
          >
            {offre.score ?? 0}
          </span>
        </div>

        <ul className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {estNouvelle(offre, maintenant) && (
            <li className={`${PUCE} bg-accent-700 font-medium text-white dark:bg-accent-600`}>
              Nouveau
            </li>
          )}
          <li className={`${PUCE} border border-slate-300 font-medium dark:border-slate-600`}>
            {LIBELLES_TYPE[offre.type]}
          </li>
          {offre.teletravail && offre.teletravail !== 'sur_site' && (
            <li className={`${PUCE} bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100`}>
              {LIBELLES_TELETRAVAIL[offre.teletravail]}
            </li>
          )}
          {offre.domaines.map((domaine) => (
            <li key={domaine} className={`${PUCE} bg-slate-100 dark:bg-slate-800`}>
              {LIBELLES_DOMAINE[domaine]}
            </li>
          ))}
          {offre.langues_requises
            .filter((langue) => LIBELLES_LANGUE[langue])
            .map((langue) => (
              <li
                key={langue}
                className={`${PUCE} bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100`}
              >
                {LIBELLES_LANGUE[langue]} exigé
              </li>
            ))}
          {offre.exclue_raison && (
            <li className={`${PUCE} bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100`}>
              {offre.exclue_raison}
            </li>
          )}
        </ul>

        {(publiee || offre.remuneration_texte) && (
          <p className="mt-3 flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="min-w-0 truncate">{offre.remuneration_texte}</span>
            {publiee && <span className="shrink-0">Publiée {publiee}</span>}
          </p>
        )}
      </Link>
    </article>
  );
}
