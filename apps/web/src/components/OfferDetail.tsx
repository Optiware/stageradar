import { LIBELLES_STATUT, PAYS_STAGE } from '@stageradar/shared';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
import type { Candidature } from '../lib/suivi';
import { supabase } from '../lib/supabase';
import { BADGE, BOUTON_PRINCIPAL } from '../lib/ui';
import { Flag } from './Flag';
import { OfferActions } from './OfferActions';
import { CompanyAvatar } from './OfferCard';
import { cleTexteOffre, OfferDescription, type TexteOffre } from './OfferDescription';
import { NotesOffre, QuestionPostule } from './OfferExtras';

function Section({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <section className="mt-6 border-t border-gray-200 pt-5 dark:border-gray-800">
      <h3 className="text-base font-bold">{titre}</h3>
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
          <h2 className="text-xl leading-tight font-extrabold break-words">{offre.titre}</h2>
          <p className="mt-1 text-sm font-bold text-gray-500 dark:text-gray-400">
            {[offre.entreprise, lieu(offre)].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>

      {offre.exclue_raison && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-700 dark:bg-red-900/30 dark:text-red-400">
          Hors cible : {offre.exclue_raison}
        </p>
      )}

      {lien ? (
        <a
          href={lien}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setPartiPostuler(true)}
          className={`mt-5 flex w-full items-center justify-center gap-2 sm:w-auto sm:min-w-56 ${BOUTON_PRINCIPAL}`}
        >
          Postuler
          <ExternalLink aria-hidden="true" className="size-4" />
        </a>
      ) : (
        <p className="mt-5 text-sm text-gray-500 dark:text-gray-400">
          Le lien de cette offre n'est pas une adresse web valide.
        </p>
      )}
      {lien && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Ouvre l'annonce d'origine dans un nouvel onglet.
        </p>
      )}
      {partiPostuler && (
        <QuestionPostule
          offre={offre}
          candidature={candidature}
          onRepondu={() => setPartiPostuler(false)}
        />
      )}

      <OfferActions
        offre={offre}
        candidature={candidature}
        onMasquee={onMasquee}
        className="mt-4 sm:max-w-md"
      />
      {candidature && (
        <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Statut dans ton suivi :{' '}
          <span className={BADGE.vert}>{LIBELLES_STATUT[candidature.statut]}</span>
        </p>
      )}

      <Section titre="En bref">
        <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {enBref
            .filter(([, valeur]) => valeur)
            .map(([nom, valeur]) => (
              <div key={nom} className="contents">
                <dt className="text-gray-500 dark:text-gray-400">{nom}</dt>
                <dd className="font-bold break-words">{valeur}</dd>
              </div>
            ))}
        </dl>
      </Section>

      <Section titre="Pertinence">
        <div className="mt-3 flex items-center gap-3">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${couleurScore(offre.score ?? 0)}`}
          >
            {offre.score ?? 0}
          </span>
          <p className="text-sm text-gray-500 dark:text-gray-400">
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
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
        )}
        {description.isError && (
          <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-400">
            La description n'a pas pu être chargée.
          </p>
        )}
        {description.isSuccess && <OfferDescription offre={offre} texte={description.data} />}
      </Section>

      <Section titre="Mes notes">
        {description.isSuccess ? (
          <NotesOffre offre={offre} notes={description.data.notes} />
        ) : (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Chargement…</p>
        )}
      </Section>

      {offre.entreprise && (
        <Section titre="Entreprise">
          <p className="mt-3 text-sm">{offre.entreprise}</p>
          {memeEntreprise.length > 0 && (
            <>
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                Autres offres de cette entreprise :
              </p>
              <ul className="mt-1.5 space-y-1 text-sm">
                {memeEntreprise.map((autre) => (
                  <li key={autre.id}>
                    <Link
                      to={{ search: `?offre=${autre.id}` }}
                      className="font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
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
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            {nomPays(offre.pays)} : la fiche du pays rassemble les liens officiels sur le visa et
            des pistes pour y trouver un stage. Tant qu'elle est marquée « à vérifier », contrôle
            les règles sur le site officiel avant de postuler.
          </p>
          <Link
            to={`/pays?pays=${offre.pays}`}
            className="mt-2 inline-block text-sm font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
          >
            Voir la fiche du pays
          </Link>
        </Section>
      )}
    </article>
  );
}
