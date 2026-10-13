import { normalizeText, PAYS_STAGE } from '@stageradar/shared';
import { useQuery } from '@tanstack/react-query';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Flag } from '../components/Flag';
import { OfferCard } from '../components/OfferCard';
import { OfferDetail } from '../components/OfferDetail';
import { SITES_ALTERNANCE } from '../lib/liens-recherche';
import { COLONNES_FIL, nomPays, type FeedOffer } from '../lib/offres';
import { supabase } from '../lib/supabase';

const ONGLETS = [
  { id: 'alternance', libelle: 'Alternance' },
  { id: 'stage', libelle: 'Stage été' },
  { id: 'tout', libelle: 'Tout' },
] as const;
type Onglet = (typeof ONGLETS)[number]['id'];

/** Pays toujours proposés dans le filtre, même sans offre : ceux du projet. */
const PAYS_FILTRE: readonly string[] = [...PAYS_STAGE, 'FR'];

/** À partir de cette largeur, la liste et le détail sont côte à côte (classe `lg` de Tailwind). */
const DEUX_COLONNES = '(min-width: 64rem)';

function ecouterLargeur(prevenir: () => void) {
  const media = window.matchMedia(DEUX_COLONNES);
  media.addEventListener('change', prevenir);
  return () => media.removeEventListener('change', prevenir);
}

function dansOnglet(offre: FeedOffer, onglet: Onglet): boolean {
  if (onglet === 'tout') return true;
  if (onglet === 'alternance') return offre.type === 'alternance';
  return offre.type === 'stage' && offre.periode_compatible !== false;
}

function correspond(offre: FeedOffer, mots: string[]): boolean {
  if (mots.length === 0) return true;
  const texte = normalizeText([offre.titre, offre.entreprise, offre.ville].join(' '));
  return mots.every((mot) => texte.includes(mot));
}

export function Feed() {
  const [params] = useSearchParams();
  const idOuvert = params.get('offre');
  const [onglet, setOnglet] = useState<Onglet>('tout');
  const [paysChoisis, setPaysChoisis] = useState<string[]>([]);
  const [recherche, setRecherche] = useState('');
  const [avecMasquees, setAvecMasquees] = useState(false);
  const positionListe = useRef(0);
  const deuxColonnes = useSyncExternalStore(
    ecouterLargeur,
    () => window.matchMedia(DEUX_COLONNES).matches,
  );

  // Mono-utilisateur, quelques centaines d'offres au plus : tout est chargé d'un coup,
  // et les filtres s'appliquent sur place, sans nouvel appel.
  const offres = useQuery({
    queryKey: ['offers', 'feed'],
    queryFn: async () => {
      const { data, error } = await supabase!
        .from('offers')
        .select(COLONNES_FIL)
        .eq('actif', true)
        .eq('masquee', false)
        .order('score', { ascending: false })
        .order('date_publication', { ascending: false, nullsFirst: false })
        .limit(500)
        .overrideTypes<FeedOffer[], { merge: false }>();
      if (error) throw error;
      return data;
    },
  });

  // Sur téléphone, la liste et le détail occupent l'écran à tour de rôle : le détail s'ouvre
  // en haut de page, et le retour retrouve la liste là où elle avait été laissée.
  useLayoutEffect(() => {
    if (window.matchMedia(DEUX_COLONNES).matches) return;
    window.scrollTo(0, idOuvert ? 0 : positionListe.current);
  }, [idOuvert]);

  const maintenant = offres.dataUpdatedAt;
  const toutes = offres.data ?? [];
  const nbMasquees = toutes.filter((offre) => offre.exclue_raison !== null).length;
  const mots = normalizeText(recherche).split(' ').filter(Boolean);
  const visibles = toutes.filter(
    (offre) => (avecMasquees || offre.exclue_raison === null) && correspond(offre, mots),
  );
  const dansLOnglet = visibles.filter((offre) => dansOnglet(offre, onglet));
  const affichees = dansLOnglet.filter(
    (offre) => paysChoisis.length === 0 || paysChoisis.includes(offre.pays ?? ''),
  );

  const parPays = new Map<string, number>();
  for (const offre of dansLOnglet) {
    if (offre.pays) parPays.set(offre.pays, (parPays.get(offre.pays) ?? 0) + 1);
  }
  const paysProposes = [
    ...PAYS_FILTRE,
    ...[...parPays.keys()].filter((code) => !PAYS_FILTRE.includes(code)).sort(),
  ];

  // Sur grand écran, la première offre est ouverte d'office : le panneau de droite n'est jamais vide.
  const ouverte = idOuvert
    ? toutes.find((offre) => offre.id === idOuvert)
    : deuxColonnes
      ? affichees[0]
      : undefined;

  function basculerPays(code: string) {
    setPaysChoisis((choisis) =>
      choisis.includes(code) ? choisis.filter((autre) => autre !== code) : [...choisis, code],
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className={idOuvert ? 'hidden lg:block' : ''}>
        <h1 className="text-2xl font-extrabold tracking-tight">Fil</h1>

        <label className="relative mt-4 block">
          <span className="sr-only">Rechercher une offre</span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Intitulé, entreprise, ville"
            className="block w-full rounded-full border border-gray-300 bg-white py-2.5 pr-4 pl-10 text-base placeholder:text-gray-400 dark:border-gray-700 dark:bg-gray-900"
          />
        </label>

        <div
          role="tablist"
          aria-label="Type d'offre"
          className="mt-3 flex rounded-full bg-gray-100 p-1 text-sm font-medium dark:bg-gray-800"
        >
          {ONGLETS.map(({ id, libelle }) => {
            const actif = id === onglet;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={actif}
                onClick={() => setOnglet(id)}
                className={`flex-1 rounded-full px-3 py-1.5 ${
                  actif
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-950 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                }`}
              >
                {libelle}{' '}
                <span className="text-gray-500 dark:text-gray-400">
                  {visibles.filter((offre) => dansOnglet(offre, id)).length}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Pays"
          className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 text-sm lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {paysProposes.map((code) => {
            const choisi = paysChoisis.includes(code);
            return (
              <button
                key={code}
                type="button"
                aria-pressed={choisi}
                onClick={() => basculerPays(code)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                  choisi
                    ? 'border-primary-600 bg-primary-50 font-medium text-primary-900 dark:bg-primary-500/15 dark:text-primary-100'
                    : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                }`}
              >
                <Flag code={code} />
                {nomPays(code)}
                <span className="text-gray-500 dark:text-gray-400">{parPays.get(code) ?? 0}</span>
              </button>
            );
          })}
        </div>

        {nbMasquees > 0 && (
          <label className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={avecMasquees}
              onChange={(event) => setAvecMasquees(event.target.checked)}
              className="size-4 accent-primary-600"
            />
            Afficher aussi les {nbMasquees} offres hors cible
          </label>
        )}

        {onglet === 'alternance' &&
          SITES_ALTERNANCE.map(({ site, raison, recherches }) => (
            <section
              key={site}
              aria-label={`Recherches sur ${site}`}
              className="mt-4 rounded-3xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <h2 className="font-semibold">Chercher aussi sur {site}</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{raison}</p>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {recherches.map(({ libelle, url }) => (
                  <li key={libelle}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full border border-primary-600 px-3 py-1.5 font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-400 dark:text-primary-400 dark:hover:bg-primary-500/15"
                    >
                      {libelle}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {offres.isPending && (
          <p className="mt-8 text-gray-600 dark:text-gray-300">Chargement des offres…</p>
        )}
        {offres.isError && (
          <p role="alert" className="mt-8 text-red-700 dark:text-red-400">
            Les offres n'ont pas pu être chargées. Vérifie ta connexion.
          </p>
        )}
        {offres.isSuccess && affichees.length === 0 && (
          <p className="mt-8 text-gray-600 dark:text-gray-300">
            {toutes.length === 0
              ? 'Aucune offre pour le moment. La collecte tourne toutes les 6 heures.'
              : onglet === 'alternance' && dansLOnglet.length === 0 && mots.length === 0
                ? "Aucune offre d'alternance collectée pour le moment."
                : 'Aucune offre ne correspond à ces filtres.'}
          </p>
        )}

        <ul className="mt-4 space-y-3">
          {affichees.map((offre) => (
            <li key={offre.id}>
              <OfferCard
                offre={offre}
                selectionnee={offre.id === ouverte?.id}
                maintenant={maintenant}
                onOuvrir={() => {
                  positionListe.current = window.scrollY;
                }}
              />
            </li>
          ))}
        </ul>
      </div>

      <div
        className={`lg:sticky lg:top-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:rounded-3xl lg:border lg:border-gray-200 lg:p-6 lg:dark:border-gray-800 ${
          idOuvert ? '' : 'hidden lg:block'
        }`}
      >
        {idOuvert && (
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-primary-700 lg:hidden dark:text-primary-400"
          >
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
              <path d="m14 6-6 6 6 6" />
            </svg>
            Retour aux offres
          </Link>
        )}
        {ouverte ? (
          <OfferDetail
            key={ouverte.id}
            offre={ouverte}
            maintenant={maintenant}
            memeEntreprise={toutes.filter(
              (autre) =>
                autre.id !== ouverte.id &&
                autre.entreprise === ouverte.entreprise &&
                autre.exclue_raison === null,
            )}
          />
        ) : (
          offres.isSuccess && (
            <p className="text-gray-600 dark:text-gray-300">
              {idOuvert
                ? "Cette offre n'est plus disponible."
                : 'Sélectionne une offre pour afficher son détail.'}
            </p>
          )
        )}
      </div>
    </div>
  );
}
