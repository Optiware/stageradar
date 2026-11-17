import {
  LIBELLES_STATUT,
  PAYS_STAGE,
  STATUTS_SUIVI,
  type ScoreDetail,
  type StatutSuivi,
} from '@stageradar/shared';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Bookmark,
  BookmarkCheck,
  Check,
  IdCard,
  MessageSquare,
  PenLine,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  anciennete,
  dateLongue,
  estNouvelle,
  LIBELLES_DOMAINE,
  LIBELLES_LANGUE,
  LIBELLES_TELETRAVAIL,
  LIBELLES_TYPE,
  libelleScore,
  lienSur,
  lieu,
  nomPays,
  nomSource,
  type FeedOffer,
} from '../lib/offres';
import { usePreparerCandidature, useSuivreOffre, type Candidature } from '../lib/suivi';
import { supabase } from '../lib/supabase';
import {
  BADGE,
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  teinteScore,
} from '../lib/ui';
import { Flag } from './Flag';
import { OfferActions } from './OfferActions';
import { CompanyAvatar } from './OfferCard';
import { OfferMatch } from './OfferMatch';
import { cleTexteOffre, OfferDescription, type TexteOffre } from './OfferDescription';
import { NotesOffre, QuestionPostule } from './OfferExtras';

const NOMS_CRITERE: Record<ScoreDetail['critere'], string> = {
  domaine: 'Domaine',
  periode: 'Période',
  pays: 'Pays',
  niveau: 'Niveau',
  langue: 'Langue',
  fraicheur: 'Fraîcheur',
};

/** Étapes du suivi montrées dans « Où tu en es » ; « Refus / Abandon » est signalé à part. */
const ETAPES: readonly StatutSuivi[] = STATUTS_SUIVI.filter((statut) => statut !== 'refus');

/** Libellés de la maquette, plus parlants dans une frise que ceux du tableau de suivi. */
const LIBELLES_ETAPE: Partial<Record<StatutSuivi, string>> = {
  relance: 'Relance (J+7, J+14)',
  offre: 'Offre ou refus',
};

function Bloc({
  titre,
  id,
  action,
  children,
  className = '',
}: {
  titre: string;
  id: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id} className={`flex flex-col gap-4 ${CARTE} ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id={id} className="text-xl font-bold">
          {titre}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function periode(offre: FeedOffer): string | null {
  return dateLongue(offre.date_debut) && `Dès le ${dateLongue(offre.date_debut)}`;
}

/** Anneau du score, comme sur la maquette : la part remplie suit le score sur 100. */
function AnneauScore({ score }: { score: number }) {
  const teinte = teinteScore(score);
  const tour = 2 * Math.PI * 42;
  return (
    <span className="flex shrink-0 items-center gap-3.5">
      <span className="relative flex size-24 items-center justify-center">
        <svg viewBox="0 0 96 96" aria-hidden="true" className="absolute inset-0 size-24">
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            strokeWidth="9"
            className="stroke-gray-100 dark:stroke-gray-850"
          />
          <circle
            cx="48"
            cy="48"
            r="42"
            fill="none"
            stroke={teinte.trait}
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${(tour * Math.max(0, Math.min(score, 100))) / 100} ${tour}`}
            transform="rotate(-90 48 48)"
          />
        </svg>
        <span className={`relative font-display text-3xl font-extrabold ${teinte.texte}`}>
          {score}
        </span>
      </span>
      <span className="flex flex-col">
        <strong className={`text-base ${teinte.texte}`}>{libelleScore(score)}</strong>
        <span className="text-sm text-gray-600 dark:text-gray-400">sur 100</span>
      </span>
    </span>
  );
}

function Etapes({ statut }: { statut: StatutSuivi | undefined }) {
  const actuelle = statut ? ETAPES.indexOf(statut) : -1;
  return (
    <ol className="flex flex-col gap-0.5">
      {ETAPES.map((etape, rang) => {
        const faite = rang < actuelle;
        const enCours = rang === actuelle;
        return (
          <li
            key={etape}
            aria-current={enCours ? 'step' : undefined}
            className={`flex min-h-10 items-center gap-3 ${
              enCours
                ? '-mx-2.5 min-h-11 rounded-[0.625rem] bg-primary-50 px-2.5 font-semibold text-primary-700 dark:bg-primary-400/15 dark:text-primary-300'
                : faite
                  ? 'text-gray-700 dark:text-gray-300'
                  : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {faite ? (
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-vert-500">
                <Check aria-hidden="true" className="size-3.5 text-white" strokeWidth={3} />
              </span>
            ) : enCours ? (
              <span className="size-6 shrink-0 rounded-full bg-primary-600 shadow-[0_0_0_4px_var(--color-primary-200)] dark:bg-primary-400" />
            ) : (
              <span className="size-[1.375rem] shrink-0 rounded-full border-2 border-gray-300 dark:border-gray-700" />
            )}
            {LIBELLES_ETAPE[etape] ?? LIBELLES_STATUT[etape]}
            {enCours && <span className="ml-auto text-xs font-semibold">Maintenant</span>}
          </li>
        );
      })}
    </ol>
  );
}

function PieceJointe({ pret, libelle, vers }: { pret: boolean; libelle: string; vers: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[0.625rem] ${
          pret
            ? 'bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50'
            : 'bg-amber-50 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
        }`}
      >
        {pret ? (
          <Check aria-hidden="true" className="size-4" strokeWidth={2.2} />
        ) : (
          <PenLine aria-hidden="true" className="size-4" strokeWidth={2} />
        )}
      </span>
      <span className="flex-1">{libelle}</span>
      {pret ? (
        <span className="text-[0.8125rem] font-semibold text-vert-700 dark:text-vert-50">Prêt</span>
      ) : (
        <Link
          to={vers}
          className="text-[0.8125rem] font-semibold text-primary-600 dark:text-primary-300"
        >
          À choisir
        </Link>
      )}
    </div>
  );
}

/** Fiche d'une offre, en page entière : en-tête et score, détail à gauche, candidature à droite. */
export function OfferDetail({
  offre,
  candidature,
  maintenant,
  memeEntreprise,
  onMasquee,
}: {
  offre: FeedOffer;
  /** Renseignée si l'offre est déjà dans le suivi. */
  candidature: Candidature | undefined;
  maintenant: number;
  /** Autres offres de la même entreprise présentes dans le fil. */
  memeEntreprise: FeedOffer[];
  onMasquee: (offre: FeedOffer) => void;
}) {
  // La description est longue : elle n'est lue, avec sa traduction, qu'à l'ouverture de l'offre.
  const description = useQuery({
    queryKey: cleTexteOffre(offre.id),
    queryFn: async (): Promise<TexteOffre> => {
      const { data, error } = await supabase!
        .from('offers')
        .select('description,traduction,notes')
        .eq('id', offre.id)
        .maybeSingle()
        .overrideTypes<TexteOffre, { merge: false }>();
      if (error) throw error;
      return {
        description: data?.description ?? null,
        traduction: data?.traduction ?? null,
        notes: data?.notes ?? null,
      };
    },
    staleTime: 5 * 60_000,
  });

  // Vrai entre le clic sur « Postuler » et la réponse à « As-tu postulé ? ».
  const [partiPostuler, setPartiPostuler] = useState(false);
  const naviguer = useNavigate();
  const preparer = usePreparerCandidature();
  const suivre = useSuivreOffre();
  const contact = candidature?.contact_nom?.trim().split(/\s+/)[0];

  // « Écrire » passe par le suivi : la conversation est liée à la candidature de cette offre.
  function ecrire() {
    const ouvrir = () => void naviguer(`/messages?offre=${offre.id}`);
    if (candidature) ouvrir();
    else suivre.mutate(offre.id, { onSuccess: ouvrir });
  }
  const score = offre.score ?? 0;
  const lien = lienSur(offre.url);
  const publiee = anciennete(offre.date_publication ?? offre.created_at, maintenant);
  const langues = offre.langues_requises.map((code) => LIBELLES_LANGUE[code]).filter(Boolean);
  const vaEnPays = (PAYS_STAGE as readonly string[]).includes(offre.pays ?? '');
  const essentiel: [string, ReactNode][] = [
    ['Période', periode(offre)],
    ['Durée', offre.duree_semaines && `${offre.duree_semaines} semaines`],
    [
      'Lieu',
      lieu(offre) && (
        <span className="inline-flex items-center gap-1.5">
          <Flag code={offre.pays} />
          {lieu(offre)}
        </span>
      ),
    ],
    ['Organisation', offre.teletravail && LIBELLES_TELETRAVAIL[offre.teletravail]],
    ['Contrat', LIBELLES_TYPE[offre.type]],
    ['Domaine', offre.domaines.map((domaine) => LIBELLES_DOMAINE[domaine]).join(', ')],
    ['Langue exigée', langues.join(', ')],
    ['Rémunération', offre.remuneration_texte],
  ];

  return (
    <article aria-label={`Détail : ${offre.titre}`} className="flex flex-col gap-6">
      <section className="flex flex-wrap items-center gap-x-7 gap-y-6 rounded-[1.25rem] border border-gray-200 bg-white p-6 shadow-sm md:p-7 dark:border-gray-800 dark:bg-gray-900">
        <CompanyAvatar
          nom={offre.entreprise}
          className="size-16 rounded-[1.125rem] text-[1.375rem] md:size-[4.75rem] md:rounded-[1.25rem] md:text-[1.625rem]"
        />
        <div className="flex min-w-0 flex-[1_1_28.75rem] flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <span className={BADGE.accent}>{LIBELLES_TYPE[offre.type]}</span>
            {estNouvelle(offre, maintenant) ? (
              <span className={BADGE.orange}>Nouveau{publiee && ` · ${publiee}`}</span>
            ) : (
              publiee && <span className={BADGE.neutre}>Publiée {publiee}</span>
            )}
          </div>
          <h1 className="text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.02em] break-words md:text-4xl">
            {offre.titre}
          </h1>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-base text-gray-700 dark:text-gray-300">
            {offre.entreprise && (
              <span className="font-semibold text-gray-950 dark:text-gray-50">
                {offre.entreprise}
              </span>
            )}
            {lieu(offre) && (
              <span>
                {lieu(offre)}
                {offre.teletravail && ` · ${LIBELLES_TELETRAVAIL[offre.teletravail].toLowerCase()}`}
              </span>
            )}
            <span>Trouvée sur {nomSource(offre.source)}</span>
          </p>
        </div>
        <AnneauScore score={score} />
      </section>

      {offre.exclue_raison && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-900/30 dark:text-red-300">
          Hors cible : {offre.exclue_raison}
        </p>
      )}

      <div className="flex flex-wrap items-start gap-6">
        <div className="flex min-w-0 flex-[999_1_35rem] flex-col gap-6">
          <Bloc titre="L’essentiel" id="titre-essentiel">
            <dl className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,8.5rem),1fr))] gap-3">
              {essentiel
                .filter(([, valeur]) => valeur)
                .map(([nom, valeur]) => (
                  <div key={nom} className="rounded-xl bg-gray-100 px-4 py-3.5 dark:bg-gray-850">
                    <dt className="text-[0.8125rem] text-gray-600 dark:text-gray-400">{nom}</dt>
                    <dd className="mt-0.5 text-base font-semibold break-words">{valeur}</dd>
                  </div>
                ))}
            </dl>
          </Bloc>

          <Bloc
            titre={`Pourquoi ${score} sur 100`}
            id="titre-score"
            action={
              <Link
                to="/reglages"
                className="text-sm font-medium text-primary-600 dark:text-primary-300"
              >
                Changer les poids
              </Link>
            }
          >
            <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,16rem),1fr))] gap-x-8 gap-y-5">
              {offre.score_details.map((detail) => {
                const part = detail.max > 0 ? Math.max(0, detail.points) / detail.max : 0;
                const couleur =
                  part >= 0.9 ? 'bg-vert-500' : part >= 0.6 ? 'bg-primary-600' : 'bg-[#e0a100]';
                return (
                  <div key={detail.critere} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-semibold">{NOMS_CRITERE[detail.critere]}</span>
                      <span className="font-semibold tabular-nums">
                        {detail.points}
                        <span className="font-normal text-gray-600 dark:text-gray-400">
                          {' '}
                          / {detail.max}
                        </span>
                      </span>
                    </div>
                    <div
                      aria-hidden="true"
                      className="h-2 rounded-full bg-[#eef0f5] dark:bg-gray-850"
                    >
                      <div
                        className={`h-2 rounded-full ${couleur}`}
                        style={{ width: `${Math.round(Math.min(part, 1) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {detail.libelle}
                    </span>
                  </div>
                );
              })}
            </div>
          </Bloc>

          <Bloc titre="L’annonce" id="titre-annonce">
            {description.isPending && (
              <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>
            )}
            {description.isError && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                La description n'a pas pu être chargée.
              </p>
            )}
            {description.isSuccess && (
              <div className="-mt-3 max-w-[43.75rem] text-gray-800 dark:text-gray-200">
                <OfferDescription offre={offre} texte={description.data} />
              </div>
            )}
          </Bloc>

          {vaEnPays && (
            <section
              aria-labelledby="titre-pays"
              className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-2xl bg-primary-50 p-6 dark:bg-primary-400/10"
            >
              <span className="flex size-[3.25rem] shrink-0 items-center justify-center rounded-full bg-white text-primary-700 dark:bg-gray-900 dark:text-primary-300">
                <IdCard aria-hidden="true" className="size-6" strokeWidth={1.8} />
              </span>
              <div className="flex flex-[1_1_20rem] flex-col gap-1">
                <h2 id="titre-pays" className="text-lg font-bold">
                  {nomPays(offre.pays)} : visa et stage
                </h2>
                <p className="text-gray-800 dark:text-gray-200">
                  Les règles dépendent de ta situation. La fiche du pays rassemble les liens
                  officiels ; tant qu'elle est marquée « à vérifier », contrôle les règles sur le
                  site officiel avant de postuler.
                </p>
              </div>
              <Link
                to={`/pays?pays=${offre.pays}`}
                className="inline-flex min-h-11 items-center rounded-xl bg-white px-[1.125rem] font-semibold text-primary-700 transition hover:bg-primary-100 dark:bg-gray-900 dark:text-primary-300"
              >
                Ouvrir la fiche
              </Link>
            </section>
          )}

          <Bloc titre="Mes notes" id="titre-notes">
            {description.isSuccess ? (
              <div className="-mt-3">
                <NotesOffre offre={offre} notes={description.data.notes} />
              </div>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>
            )}
          </Bloc>

          {offre.entreprise && memeEntreprise.length > 0 && (
            <Bloc titre={`Autres offres chez ${offre.entreprise}`} id="titre-entreprise">
              <ul className="flex flex-col gap-1.5">
                {memeEntreprise.map((autre) => (
                  <li key={autre.id}>
                    <Link
                      to={{ search: `?offre=${autre.id}` }}
                      className="font-semibold text-primary-600 underline-offset-2 hover:underline dark:text-primary-300"
                    >
                      {autre.titre}
                    </Link>
                    {lieu(autre) && (
                      <span className="text-gray-600 dark:text-gray-400"> · {lieu(autre)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Bloc>
          )}
        </div>

        <aside
          aria-label="Candidature"
          className="flex min-w-0 flex-[1_1_21.25rem] flex-col gap-5 max-lg:order-first"
        >
          <section className={`flex flex-col gap-2.5 ${CARTE} shadow-sm`}>
            {candidature ? (
              <Link
                to={`/suivi?candidature=${candidature.id}`}
                className={`${BOUTON_PRINCIPAL} min-h-[3.25rem] text-base`}
              >
                Préparer ma candidature
              </Link>
            ) : (
              <button
                type="button"
                disabled={preparer.isPending}
                onClick={() =>
                  preparer.mutate(offre.id, {
                    onSuccess: (id) => void naviguer(`/suivi?candidature=${id}`),
                  })
                }
                className={`${BOUTON_PRINCIPAL} min-h-[3.25rem] text-base`}
              >
                Préparer ma candidature
              </button>
            )}
            <p className="mb-1 text-center text-sm text-gray-600 dark:text-gray-400">
              StageRadar prépare, c’est toi qui envoies.
            </p>
            <button
              type="button"
              disabled={suivre.isPending}
              onClick={ecrire}
              className={`${BOUTON_DOUX} flex min-h-12 items-center justify-center gap-2 text-[0.9375rem]`}
            >
              <MessageSquare aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
              {contact ? `Écrire à ${contact}` : 'Écrire au recruteur'}
            </button>
            <div className="flex gap-2">
              {lien ? (
                <a
                  href={lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setPartiPostuler(true)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-950 transition hover:border-primary-600 dark:border-gray-800 dark:text-gray-50"
                >
                  Annonce d’origine
                  <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
                </a>
              ) : (
                <p className="flex-1 text-sm text-gray-600 dark:text-gray-400">
                  Le lien de cette offre n'est pas une adresse web valide.
                </p>
              )}
              {candidature ? (
                <Link
                  to={`/suivi?candidature=${candidature.id}`}
                  aria-label="Dans le suivi"
                  title="Dans le suivi"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-400/40 dark:bg-primary-400/15 dark:text-primary-300"
                >
                  <BookmarkCheck aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                </Link>
              ) : (
                <button
                  type="button"
                  aria-label="Garder pour plus tard"
                  title="Garder pour plus tard"
                  disabled={suivre.isPending}
                  onClick={() => suivre.mutate(offre.id)}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white text-gray-950 transition hover:border-primary-600 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50"
                >
                  <Bookmark aria-hidden="true" className="size-[1.125rem]" strokeWidth={1.8} />
                </button>
              )}
            </div>
            {(preparer.isError || suivre.isError) && (
              <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
                L'action n'a pas pu être enregistrée. Vérifie ta connexion.
              </p>
            )}

            {/* Actions d'avant la maquette, gardées à la suite. */}
            {lien && (
              <a
                href={lien}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setPartiPostuler(true)}
                className={`${BOUTON_SECONDAIRE} mt-2 flex min-h-11 items-center justify-center gap-2`}
              >
                Postuler sur le site
                <ArrowUpRight aria-hidden="true" className="size-4" strokeWidth={2} />
              </a>
            )}
            {partiPostuler && (
              <QuestionPostule
                offre={offre}
                candidature={candidature}
                onRepondu={() => setPartiPostuler(false)}
              />
            )}
            <OfferActions offre={offre} candidature={candidature} onMasquee={onMasquee} />
          </section>

          <OfferMatch
            offre={offre}
            description={description.isSuccess ? description.data.description : undefined}
          />

          <section aria-labelledby="titre-statut" className={`flex flex-col gap-3 ${CARTE}`}>
            <h2 id="titre-statut" className="text-lg font-bold">
              Où tu en es
            </h2>
            <Etapes statut={candidature?.statut} />
            {candidature ? (
              <>
                {candidature.statut === 'refus' && (
                  <p className={BADGE.neutre + ' self-start'}>{LIBELLES_STATUT.refus}</p>
                )}
                <Link
                  to={`/suivi?candidature=${candidature.id}`}
                  className="text-sm font-medium text-primary-600 dark:text-primary-300"
                >
                  Ouvrir dans le suivi
                </Link>
              </>
            ) : (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cette offre n'est pas encore dans ton suivi : « Sauver » l'y range dans « À étudier
                », « Préparer ma candidature » dans « À postuler ».
              </p>
            )}
          </section>

          {candidature && (
            <section aria-labelledby="titre-joindre" className={`flex flex-col gap-2.5 ${CARTE}`}>
              <h2 id="titre-joindre" className="mb-1 text-lg font-bold">
                À joindre
              </h2>
              <PieceJointe
                pret={candidature.cv_document_id !== null}
                libelle="CV"
                vers={`/suivi?candidature=${candidature.id}`}
              />
              <PieceJointe
                pret={candidature.lettre_document_id !== null}
                libelle="Lettre ou message de motivation"
                vers={`/suivi?candidature=${candidature.id}`}
              />
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}
