import { LIBELLES_STATUT } from '@stageradar/shared';
import { Bookmark, BookmarkCheck, Check, Eye, EyeOff, Info, MapPin } from 'lucide-react';
import { Link } from 'react-router';
import { useMasquerOffre } from '../lib/fil';
import {
  anciennete,
  estNouvelle,
  etiquettesOffre,
  libelleCourtScore,
  lieu,
  nomSource,
  type FeedOffer,
} from '../lib/offres';
import { useSuivreOffre, type Candidature } from '../lib/suivi';
import { BADGE, BOUTON_PRINCIPAL, teinteScore } from '../lib/ui';
import { Flag } from './Flag';

/** Teintes des logos : fond pastel et texte foncé, choisies d'après le nom de l'entreprise. */
const TEINTES_LOGO = [
  'bg-orange-100 text-orange-700',
  'bg-primary-100 text-primary-700',
  'bg-vert-50 text-vert-700',
  'bg-amber-50 text-amber-700',
  'bg-[#efe5ff] text-[#5b2eb0]',
] as const;

function initiales(nom: string): string {
  const mots = nom.split(/[\s\-_.]+/).filter(Boolean);
  const lettres = mots.length > 1 ? [mots[0]!, mots[1]!] : [nom];
  return lettres
    .map((mot) => [...mot][0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function teinteLogo(nom: string): string {
  let somme = 0;
  for (const lettre of nom) somme = (somme + lettre.charCodeAt(0)) % 997;
  return TEINTES_LOGO[somme % TEINTES_LOGO.length]!;
}

/** Logo de l'entreprise : ses initiales sur un carré teinté. */
export function CompanyAvatar({ nom, className = '' }: { nom: string | null; className?: string }) {
  const texte = nom?.trim() || '?';
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center font-display font-extrabold dark:brightness-90 ${teinteLogo(texte)} ${className}`}
    >
      {initiales(texte)}
    </span>
  );
}

/** Pavé du score : le nombre sur 100 et son niveau, sur fond vert, ambre ou gris. */
export function PaveScore({ score }: { score: number }) {
  const teinte = teinteScore(score);
  return (
    <span
      aria-label={`Score ${score} sur 100`}
      className={`flex h-16 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-[0.875rem] ${teinte.fond} ${teinte.texte}`}
    >
      <span aria-hidden="true" className="font-display text-[1.625rem] leading-none font-extrabold">
        {score}
      </span>
      <span aria-hidden="true" className="text-[0.6875rem] font-semibold">
        {libelleCourtScore(score)}
      </span>
    </span>
  );
}

const BOUTON_ICONE =
  'flex size-11 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-950 transition hover:border-primary-600 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50 dark:hover:border-primary-400';

export function OfferCard({
  offre,
  candidature,
  maintenant,
  onOuvrir,
  onMasquee,
}: {
  offre: FeedOffer;
  candidature: Candidature | undefined;
  /** Heure du dernier chargement : sert à dater l'offre sans dépendre de l'heure du rendu. */
  maintenant: number;
  onOuvrir: () => void;
  onMasquee: (offre: FeedOffer) => void;
}) {
  const masquer = useMasquerOffre();
  const suivre = useSuivreOffre();
  const score = offre.score ?? 0;
  const publiee = anciennete(offre.date_publication ?? offre.created_at, maintenant);
  const lien = { search: `?offre=${offre.id}` };
  const avertissements = [
    offre.exclue_raison && `Hors cible : ${offre.exclue_raison}`,
    offre.periode_compatible === false && 'Période hors de ta cible',
  ].filter(Boolean) as string[];

  return (
    <article
      aria-label={offre.titre}
      className={`relative flex flex-wrap gap-x-5 gap-y-4 rounded-2xl border border-gray-200 bg-white px-5 py-5 shadow-[0_1px_2px_rgb(20_22_43/0.04)] transition hover:border-primary-200 md:px-6 md:py-[1.375rem] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary-400/40 ${
        offre.exclue_raison || offre.masquee ? 'opacity-60 hover:opacity-100' : ''
      }`}
    >
      <CompanyAvatar
        nom={offre.entreprise}
        className="size-[3.25rem] rounded-[0.875rem] text-[1.0625rem]"
      />

      <div className="flex min-w-0 flex-[1_1_12rem] flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[1.1875rem] leading-[1.3] font-bold break-words">
            <Link
              to={lien}
              onClick={onOuvrir}
              className="after:absolute after:inset-0 after:rounded-2xl after:content-[''] hover:text-primary-700 dark:hover:text-primary-300"
            >
              {offre.titre}
            </Link>
          </h3>
          {estNouvelle(offre, maintenant) && <span className={BADGE.orange}>Nouveau</span>}
          {offre.masquee && <span className={BADGE.neutre}>Masquée</span>}
        </div>
        <p className="flex flex-wrap gap-x-3.5 gap-y-1 text-gray-700 dark:text-gray-300">
          {offre.entreprise && (
            <span className="font-semibold text-gray-950 dark:text-gray-50">
              {offre.entreprise}
            </span>
          )}
          {lieu(offre) && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin aria-hidden="true" className="size-[0.9375rem] shrink-0" strokeWidth={1.8} />
              <span className="min-w-0 break-words">{lieu(offre)}</span>
              <Flag code={offre.pays} />
            </span>
          )}
        </p>
        <ul className="mt-1.5 flex flex-wrap gap-1.5">
          {etiquettesOffre(offre).map((etiquette) => (
            <li key={etiquette} className={BADGE.neutre}>
              {etiquette}
            </li>
          ))}
        </ul>
        {avertissements.map((texte) => (
          <p
            key={texte}
            className="mt-1.5 flex items-center gap-2 self-start rounded-[0.625rem] bg-amber-50 px-3 py-1.5 text-sm text-amber-700 dark:bg-amber-500/20 dark:text-amber-200"
          >
            <Info aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.8} />
            {texte}
          </p>
        ))}
        {candidature && (
          <Link
            to={`/suivi?candidature=${candidature.id}`}
            className="relative z-10 mt-1.5 flex items-center gap-2 self-start rounded-[0.625rem] bg-primary-50 px-3 py-1.5 text-sm font-medium text-primary-700 transition hover:bg-primary-100 dark:bg-primary-400/15 dark:text-primary-300"
          >
            <Check aria-hidden="true" className="size-4 shrink-0" strokeWidth={2} />
            Dans ton suivi · {LIBELLES_STATUT[candidature.statut]}
          </Link>
        )}
        <p className="mt-1 text-[0.8125rem] text-gray-600 dark:text-gray-400">
          {[nomSource(offre.source), publiee, offre.remuneration_texte].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex flex-[1_0_100%] items-end justify-between gap-3.5 sm:flex-none sm:flex-col">
        <PaveScore score={score} />
        <span className="relative z-10 flex gap-2">
          <button
            type="button"
            aria-label={offre.masquee ? 'Réafficher dans le fil' : 'Masquer du fil'}
            title={offre.masquee ? 'Réafficher' : 'Masquer'}
            disabled={masquer.isPending}
            onClick={() =>
              masquer.mutate(
                { id: offre.id, masquee: !offre.masquee },
                { onSuccess: () => !offre.masquee && onMasquee(offre) },
              )
            }
            className={BOUTON_ICONE}
          >
            {offre.masquee ? (
              <Eye aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            ) : (
              <EyeOff aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            )}
          </button>
          {candidature ? (
            <Link
              to={`/suivi?candidature=${candidature.id}`}
              aria-label="Dans le suivi"
              title="Dans le suivi"
              className={`${BOUTON_ICONE} border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-400/40 dark:bg-primary-400/15 dark:text-primary-300`}
            >
              <BookmarkCheck aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Sauver dans le suivi"
              title="Sauver dans le suivi"
              disabled={suivre.isPending}
              onClick={() => suivre.mutate(offre.id)}
              className={BOUTON_ICONE}
            >
              <Bookmark aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
            </button>
          )}
          <Link to={lien} onClick={onOuvrir} className={`${BOUTON_PRINCIPAL} px-[1.125rem]`}>
            Voir l’offre
          </Link>
        </span>
      </div>
      {(masquer.isError || suivre.isError) && (
        <p role="alert" className="basis-full text-sm font-semibold text-red-700 dark:text-red-400">
          L'action n'a pas pu être enregistrée. Vérifie ta connexion.
        </p>
      )}
    </article>
  );
}
