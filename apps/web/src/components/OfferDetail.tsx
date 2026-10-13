import { PAYS_STAGE } from '@stageradar/shared';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import {
  anciennete,
  couleurScore,
  dateLongue,
  LIBELLES_DOMAINE,
  LIBELLES_LANGUE,
  LIBELLES_TELETRAVAIL,
  LIBELLES_TYPE,
  lienSur,
  lieu,
  nomPays,
  nomSource,
  type FeedOffer,
} from '../lib/offres';
import { supabase } from '../lib/supabase';
import { Flag } from './Flag';
import { CompanyAvatar } from './OfferCard';

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
      <h3 className="text-base font-semibold">{titre}</h3>
      {children}
    </section>
  );
}

function periode(offre: FeedOffer): string | null {
  const debut = dateLongue(offre.date_debut);
  const duree = offre.duree_semaines ? `${offre.duree_semaines} semaines` : null;
  if (debut && duree) return `À partir du ${debut}, ${duree}`;
  if (debut) return `À partir du ${debut}`;
  return duree;
}

/** Fiche d'une offre : l'essentiel en haut, le bouton pour postuler, puis le détail. */
export function OfferDetail({
  offre,
  maintenant,
  memeEntreprise,
}: {
  offre: FeedOffer;
  maintenant: number;
  /** Autres offres de la même entreprise présentes dans le fil. */
  memeEntreprise: FeedOffer[];
}) {
  // La description est longue : elle n'est lue qu'à l'ouverture de l'offre.
  const description = useQuery({
    queryKey: ['offers', 'description', offre.id],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('offers')
        .select('description')
        .eq('id', offre.id)
        .maybeSingle()
        .overrideTypes<{ description: string | null }, { merge: false }>();
      if (error) throw error;
      return data?.description ?? null;
    },
    staleTime: 5 * 60_000,
  });

  const lien = lienSur(offre.url);
  const publiee = anciennete(offre.date_publication, maintenant);
  const langues = offre.langues_requises.map((code) => LIBELLES_LANGUE[code]).filter(Boolean);
  const enBref: [string, ReactNode][] = [
    ['Contrat', LIBELLES_TYPE[offre.type]],
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
    ['Période', periode(offre)],
    ['Rémunération', offre.remuneration_texte],
    ['Domaine', offre.domaines.map((domaine) => LIBELLES_DOMAINE[domaine]).join(', ')],
    ['Langue exigée', langues.join(', ')],
    ['Publiée', publiee],
    ['Source', nomSource(offre.source)],
  ];

  return (
    <article aria-label={`Détail : ${offre.titre}`}>
      <div className="flex items-start gap-4">
        <CompanyAvatar nom={offre.entreprise} className="size-14 text-2xl" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl leading-snug font-semibold break-words">{offre.titre}</h2>
          <p className="mt-1 text-gray-700 dark:text-gray-200">
            {[offre.entreprise, lieu(offre)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {offre.exclue_raison && (
        <p className="mt-4 rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-900 dark:bg-red-900/30 dark:text-red-100">
          Hors cible : {offre.exclue_raison}
        </p>
      )}

      {lien ? (
        <a
          href={lien}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-500 px-6 py-3 font-bold text-gray-950 hover:bg-primary-400 sm:w-auto sm:min-w-56"
        >
          Postuler
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 5h5v5M19 5l-8 8M11 7H6v11h11v-5" />
          </svg>
        </a>
      ) : (
        <p className="mt-5 text-sm text-gray-600 dark:text-gray-300">
          Le lien de cette offre n'est pas une adresse web valide.
        </p>
      )}
      {lien && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ouvre l'annonce d'origine dans un nouvel onglet.
        </p>
      )}

      <Section titre="En bref">
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {enBref
            .filter(([, valeur]) => valeur)
            .map(([nom, valeur]) => (
              <div key={nom} className="contents">
                <dt className="text-gray-500 dark:text-gray-400">{nom}</dt>
                <dd className="break-words">{valeur}</dd>
              </div>
            ))}
        </dl>
      </Section>

      <Section titre="Pertinence">
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${couleurScore(offre.score ?? 0)}`}
          >
            {offre.score ?? 0}
          </span>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Score sur 100, calculé d'après ton profil.
          </p>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm">
          {offre.score_details.map((detail) => (
            <li key={detail.critere} className="flex gap-3">
              <span className="w-14 shrink-0 text-right font-mono tabular-nums">
                {detail.points > 0 ? '+' : ''}
                {detail.points}/{detail.max}
              </span>
              <span>{detail.libelle}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section titre="Description">
        {description.isPending && (
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">Chargement…</p>
        )}
        {description.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            La description n'a pas pu être chargée.
          </p>
        )}
        {description.isSuccess &&
          (description.data ? (
            <p className="mt-3 text-sm leading-relaxed break-words whitespace-pre-line">
              {description.data}
            </p>
          ) : (
            <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
              La source ne fournit pas de description : voir l'annonce d'origine.
            </p>
          ))}
      </Section>

      {offre.entreprise && (
        <Section titre="Entreprise">
          <p className="mt-3 text-sm">{offre.entreprise}</p>
          {memeEntreprise.length > 0 && (
            <>
              <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
                Autres offres de cette entreprise :
              </p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {memeEntreprise.map((autre) => (
                  <li key={autre.id}>
                    <Link
                      to={{ search: `?offre=${autre.id}` }}
                      className="text-primary-700 underline underline-offset-2 dark:text-primary-400"
                    >
                      {autre.titre}
                    </Link>
                    {lieu(autre) && (
                      <span className="text-gray-500 dark:text-gray-400"> · {lieu(autre)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Section>
      )}

      {(PAYS_STAGE as readonly string[]).includes(offre.pays ?? '') && (
        <Section titre="Visa et pays">
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            {nomPays(offre.pays)} : les règles de visa pour un stage ne sont pas encore vérifiées
            dans l'application. Renseigne-toi sur le site officiel du pays avant de postuler.
          </p>
          <Link
            to="/pays"
            className="mt-2 inline-block text-sm text-primary-700 underline underline-offset-2 dark:text-primary-400"
          >
            Voir les fiches pays
          </Link>
        </Section>
      )}
    </article>
  );
}
