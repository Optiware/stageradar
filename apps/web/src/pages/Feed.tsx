import { normalizeText, PAYS_STAGE } from '@stageradar/shared';
import { ChevronLeft, Search } from 'lucide-react';
import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Flag } from '../components/Flag';
import { OfferCard } from '../components/OfferCard';
import { OfferDetail } from '../components/OfferDetail';
import { SITES_ALTERNANCE } from '../lib/liens-recherche';
import { useMasquerOffre, useOffresDuFil } from '../lib/fil';
import { nomPays, type FeedOffer } from '../lib/offres';
import { useCandidatures } from '../lib/suivi';
import { CARTE, pilule, SECONDAIRE } from '../lib/ui';

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

/** Texte posé directement sur le fond gris de la page : un ton plus foncé que dans une carte. */
const SUR_LA_PAGE = 'text-gray-600 dark:text-gray-400';

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
  const [avecHorsCible, setAvecHorsCible] = useState(false);
  const [avecMasquees, setAvecMasquees] = useState(false);
  const [derniereMasquee, setDerniereMasquee] = useState<FeedOffer | null>(null);
  const naviguer = useNavigate();
  const masquer = useMasquerOffre();
  const positionListe = useRef(0);
  const deuxColonnes = useSyncExternalStore(
    ecouterLargeur,
    () => window.matchMedia(DEUX_COLONNES).matches,
  );

  const offres = useOffresDuFil();
  const candidatures = useCandidatures();
  const suivies = new Map(
    (candidatures.data ?? []).map((candidature) => [candidature.offer_id, candidature]),
  );

  // Sur téléphone, la liste et le détail occupent l'écran à tour de rôle : le détail s'ouvre
  // en haut de page, et le retour retrouve la liste là où elle avait été laissée.
  useLayoutEffect(() => {
    if (window.matchMedia(DEUX_COLONNES).matches) return;
    window.scrollTo(0, idOuvert ? 0 : positionListe.current);
  }, [idOuvert]);

  const maintenant = offres.dataUpdatedAt;
  const toutes = offres.data ?? [];
  const nbHorsCible = toutes.filter((offre) => offre.exclue_raison !== null).length;
  const nbMasquees = toutes.filter((offre) => offre.masquee).length;
  const mots = normalizeText(recherche).split(' ').filter(Boolean);
  const visibles = toutes.filter(
    (offre) =>
      (avecHorsCible || offre.exclue_raison === null) &&
      (avecMasquees || !offre.masquee) &&
      correspond(offre, mots),
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

  // Une offre masquée quitte l'écran : le détail se referme et un message permet d'annuler.
  function apresMasquage(offre: FeedOffer) {
    setDerniereMasquee(offre);
    if (idOuvert === offre.id) void naviguer('/', { replace: true });
  }

  function basculerPays(code: string) {
    setPaysChoisis((choisis) =>
      choisis.includes(code) ? choisis.filter((autre) => autre !== code) : [...choisis, code],
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className={idOuvert ? 'hidden lg:block' : ''}>
        <h1 className="text-2xl font-extrabold tracking-tight">Fil</h1>

        <div className="relative mt-4">
          <label htmlFor="recherche" className="sr-only">
            Rechercher une offre
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-3.5 my-auto size-5 text-gray-400"
          />
          <input
            id="recherche"
            type="search"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            placeholder="Intitulé, entreprise, ville"
            className="block w-full rounded-full border border-gray-200 bg-white py-2.5 pr-4 pl-11 text-base shadow-sm placeholder:text-gray-400 dark:border-gray-800 dark:bg-gray-900"
          />
        </div>

        <div
          role="tablist"
          aria-label="Type d'offre"
          className="mt-3 flex rounded-full bg-gray-200/70 p-1 text-sm font-bold dark:bg-gray-900"
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
                className={`flex-1 rounded-full px-3 py-1.5 transition ${
                  actif
                    ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                }`}
              >
                {libelle}{' '}
                <span className={`font-medium ${SECONDAIRE}`}>
                  {visibles.filter((offre) => dansOnglet(offre, id)).length}
                </span>
              </button>
            );
          })}
        </div>

        <div
          role="group"
          aria-label="Pays"
          className="hide-scroll -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:px-0"
        >
          {paysProposes.map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={paysChoisis.includes(code)}
              onClick={() => basculerPays(code)}
              className={`flex shrink-0 items-center gap-1.5 ${pilule(paysChoisis.includes(code))}`}
            >
              <Flag code={code} />
              {nomPays(code)}
              <span className={`font-medium ${SECONDAIRE}`}>{parPays.get(code) ?? 0}</span>
            </button>
          ))}
        </div>

        {nbHorsCible > 0 && (
          <label className={`mt-3 flex items-center gap-2 text-sm ${SUR_LA_PAGE}`}>
            <input
              type="checkbox"
              checked={avecHorsCible}
              onChange={(event) => setAvecHorsCible(event.target.checked)}
              className="size-4 accent-primary-600"
            />
            Afficher aussi les {nbHorsCible} offres hors cible
          </label>
        )}
        {nbMasquees > 0 && (
          <label className={`mt-2 flex items-center gap-2 text-sm ${SUR_LA_PAGE}`}>
            <input
              type="checkbox"
              checked={avecMasquees}
              onChange={(event) => setAvecMasquees(event.target.checked)}
              className="size-4 accent-primary-600"
            />
            Afficher aussi les {nbMasquees} offres que j'ai masquées
          </label>
        )}
        {derniereMasquee &&
          toutes.some((offre) => offre.id === derniereMasquee.id && offre.masquee) && (
            <p
              role="status"
              className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <span className="min-w-0 truncate">« {derniereMasquee.titre} » est masquée.</span>
              <button
                type="button"
                onClick={() => masquer.mutate({ id: derniereMasquee.id, masquee: false })}
                className="shrink-0 font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
              >
                Annuler
              </button>
            </p>
          )}

        {onglet === 'alternance' &&
          SITES_ALTERNANCE.map(({ site, raison, recherches }) => (
            <section key={site} aria-label={`Recherches sur ${site}`} className={`mt-4 ${CARTE}`}>
              <h2 className="font-bold">Chercher aussi sur {site}</h2>
              <p className={`mt-1 text-sm ${SECONDAIRE}`}>{raison}</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recherches.map(({ libelle, url }) => (
                  <li key={libelle}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block rounded-full bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700 transition hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                    >
                      {libelle}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))}

        {offres.isPending && <p className={`mt-8 ${SUR_LA_PAGE}`}>Chargement des offres…</p>}
        {offres.isError && (
          <p role="alert" className="mt-8 font-bold text-red-700 dark:text-red-400">
            Les offres n'ont pas pu être chargées. Vérifie ta connexion.
          </p>
        )}
        {offres.isSuccess && affichees.length === 0 && (
          <p className={`mt-8 ${SUR_LA_PAGE}`}>
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
                candidature={suivies.get(offre.id)}
                selectionnee={offre.id === ouverte?.id}
                maintenant={maintenant}
                onOuvrir={() => {
                  positionListe.current = window.scrollY;
                }}
                onMasquee={apresMasquage}
              />
            </li>
          ))}
        </ul>
      </div>

      <div className={`lg:sticky lg:top-4 ${idOuvert ? '' : 'hidden lg:block'}`}>
        {idOuvert && (
          <Link
            to="/"
            className="mb-4 inline-flex items-center gap-1 text-sm font-bold text-primary-700 lg:hidden dark:text-primary-400"
          >
            <ChevronLeft aria-hidden="true" className="size-4" />
            Retour aux offres
          </Link>
        )}
        <div className={`${CARTE} lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto lg:p-6`}>
          {ouverte ? (
            <OfferDetail
              key={ouverte.id}
              offre={ouverte}
              candidature={suivies.get(ouverte.id)}
              maintenant={maintenant}
              onMasquee={apresMasquage}
              memeEntreprise={toutes.filter(
                (autre) =>
                  autre.id !== ouverte.id &&
                  autre.entreprise === ouverte.entreprise &&
                  autre.exclue_raison === null,
              )}
            />
          ) : (
            <p className={SECONDAIRE}>
              {!offres.isSuccess
                ? 'Chargement…'
                : idOuvert
                  ? "Cette offre n'est plus disponible."
                  : 'Sélectionne une offre pour afficher son détail.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
