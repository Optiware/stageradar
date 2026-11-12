import { normalizeText, PAYS_STAGE } from '@stageradar/shared';
import { ChevronLeft, Clock, MapPin, Search } from 'lucide-react';
import { useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AsideFil } from '../components/AsideFil';
import {
  AUCUN_FILTRE,
  BoutonFiltres,
  FeedFilters,
  nombreDeFiltres,
  passeLesFiltres,
  type Filtres,
} from '../components/FeedFilters';
import { Flag } from '../components/Flag';
import { OfferCard } from '../components/OfferCard';
import { OfferDetail } from '../components/OfferDetail';
import { useMasquerOffre, useOffresDuFil } from '../lib/fil';
import { estNouvelle, LIBELLES_TYPE, nomPays, type FeedOffer } from '../lib/offres';
import { useCandidatures } from '../lib/suivi';
import { pilule, segment, SEGMENTS } from '../lib/ui';

const ONGLETS = [
  { id: 'stage', libelle: 'Stage été' },
  { id: 'alternance', libelle: 'Alternance' },
  { id: 'tout', libelle: 'Tout' },
] as const;
type Onglet = (typeof ONGLETS)[number]['id'];

const TRIS = [
  { id: 'score', libelle: 'Score' },
  { id: 'recentes', libelle: 'Plus récentes' },
  { id: 'debut', libelle: 'Date de début' },
] as const;
type Tri = (typeof TRIS)[number]['id'];

/** Pays toujours proposés dans le filtre, même sans offre : ceux du projet. */
const PAYS_FILTRE: readonly string[] = [...PAYS_STAGE, 'FR'];

/** Texte posé directement sur le fond gris de la page. */
const SUR_LA_PAGE = 'text-gray-600 dark:text-gray-400';

function dansOnglet(offre: FeedOffer, onglet: Onglet): boolean {
  if (onglet === 'tout') return true;
  if (onglet === 'alternance') return offre.type === 'alternance';
  return offre.type === 'stage' && offre.periode_compatible !== false;
}

function correspond(texte: string, mots: string[]): boolean {
  if (mots.length === 0) return true;
  const normalise = normalizeText(texte);
  return mots.every((mot) => normalise.includes(mot));
}

function mots(recherche: string): string[] {
  return normalizeText(recherche).split(' ').filter(Boolean);
}

function comparer(tri: Tri): (a: FeedOffer, b: FeedOffer) => number {
  if (tri === 'recentes') {
    return (a, b) =>
      (b.date_publication ?? b.created_at).localeCompare(a.date_publication ?? a.created_at);
  }
  if (tri === 'debut') {
    return (a, b) => (a.date_debut ?? '9999').localeCompare(b.date_debut ?? '9999');
  }
  return (a, b) => (b.score ?? 0) - (a.score ?? 0);
}

/** « Bonjour » jusqu'à 18 h, « Bonsoir » ensuite. */
function salutation(heure: number): string {
  return heure >= 18 || heure < 5 ? 'Bonsoir' : 'Bonjour';
}

export function Feed() {
  const [params] = useSearchParams();
  const idOuvert = params.get('offre');
  const [onglet, setOnglet] = useState<Onglet>('tout');
  const [paysChoisis, setPaysChoisis] = useState<string[]>([]);
  const [quoi, setQuoi] = useState('');
  const [ou, setOu] = useState('');
  const [tri, setTri] = useState<Tri>('score');
  const [filtres, setFiltres] = useState<Filtres>(AUCUN_FILTRE);
  const [filtresOuverts, setFiltresOuverts] = useState(false);
  const [avecHorsCible, setAvecHorsCible] = useState(false);
  const [avecMasquees, setAvecMasquees] = useState(false);
  const [derniereMasquee, setDerniereMasquee] = useState<FeedOffer | null>(null);
  const naviguer = useNavigate();
  const masquer = useMasquerOffre();
  const positionListe = useRef(0);

  const offres = useOffresDuFil();
  const candidatures = useCandidatures();
  const suivies = new Map(
    (candidatures.data ?? []).map((candidature) => [candidature.offer_id, candidature]),
  );

  // La fiche d'une offre remplace la liste : elle s'ouvre en haut de page, et le retour retrouve
  // la liste là où elle avait été laissée.
  useLayoutEffect(() => {
    window.scrollTo(0, idOuvert ? 0 : positionListe.current);
  }, [idOuvert]);

  const maintenant = offres.dataUpdatedAt;
  const toutes = offres.data ?? [];
  const nbHorsCible = toutes.filter((offre) => offre.exclue_raison !== null).length;
  const nbMasquees = toutes.filter((offre) => offre.masquee).length;
  const motsQuoi = mots(quoi);
  const motsOu = mots(ou);
  const visibles = toutes.filter(
    (offre) =>
      (avecHorsCible || offre.exclue_raison === null) &&
      (avecMasquees || !offre.masquee) &&
      passeLesFiltres(offre, filtres, maintenant) &&
      correspond(`${offre.titre} ${offre.entreprise ?? ''} ${offre.ville ?? ''}`, motsQuoi) &&
      correspond(`${offre.ville ?? ''} ${nomPays(offre.pays) ?? ''}`, motsOu),
  );
  const dansLOnglet = visibles.filter((offre) => dansOnglet(offre, onglet));
  const affichees = dansLOnglet
    .filter((offre) => paysChoisis.length === 0 || paysChoisis.includes(offre.pays ?? ''))
    .sort(comparer(tri));
  const nouvelles = affichees.filter((offre) => estNouvelle(offre, maintenant)).length;

  const parPays = new Map<string, number>();
  for (const offre of dansLOnglet) {
    if (offre.pays) parPays.set(offre.pays, (parPays.get(offre.pays) ?? 0) + 1);
  }
  const paysProposes = [
    ...PAYS_FILTRE,
    ...[...parPays.keys()].filter((code) => !PAYS_FILTRE.includes(code)).sort(),
  ];

  // Une offre masquée quitte l'écran : la fiche se referme et un message permet d'annuler.
  function apresMasquage(offre: FeedOffer) {
    setDerniereMasquee(offre);
    if (idOuvert === offre.id) void naviguer('/', { replace: true });
  }

  function basculerPays(code: string) {
    setPaysChoisis((choisis) =>
      choisis.includes(code) ? choisis.filter((autre) => autre !== code) : [...choisis, code],
    );
  }

  function rechercher(evenement: FormEvent) {
    // Le filtrage se fait à la frappe : le bouton sert surtout à fermer le clavier du téléphone.
    evenement.preventDefault();
    (document.activeElement as HTMLElement | null)?.blur();
  }

  if (idOuvert) {
    const ouverte = toutes.find((offre) => offre.id === idOuvert);
    return (
      <div className="flex flex-col gap-6">
        <nav
          aria-label="Fil d’Ariane"
          className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
        >
          <Link
            to="/"
            aria-label="Retour aux offres"
            className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary-600 dark:text-primary-300"
          >
            <ChevronLeft aria-hidden="true" className="size-4" strokeWidth={1.8} />
            Offres
          </Link>
          {ouverte && (
            <>
              <span aria-hidden="true">/</span>
              <span>{LIBELLES_TYPE[ouverte.type]}</span>
              {ouverte.entreprise && (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="text-gray-950 dark:text-gray-50">{ouverte.entreprise}</span>
                </>
              )}
            </>
          )}
        </nav>
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
          <p className={SUR_LA_PAGE}>
            {offres.isSuccess ? "Cette offre n'est plus disponible." : 'Chargement…'}
          </p>
        )}
      </div>
    );
  }

  const date = maintenant ? new Date(maintenant) : new Date();
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const heure = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <>
      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <p className={`text-sm font-medium first-letter:uppercase ${SUR_LA_PAGE}`}>
              {jour}
              {offres.isSuccess && ` · mis à jour à ${heure}`}
            </p>
            <h1 className="text-[1.75rem] leading-[1.1] font-extrabold tracking-[-0.02em] md:text-[2.5rem]">
              {salutation(date.getHours())} !{' '}
              {offres.isSuccess &&
                (nouvelles > 0
                  ? `${nouvelles} nouvelle${nouvelles > 1 ? 's' : ''} offre${nouvelles > 1 ? 's' : ''} pour toi`
                  : `${affichees.length} offre${affichees.length > 1 ? 's' : ''} pour toi`)}
            </h1>
          </div>
          <p className="flex max-w-[26.25rem] items-start gap-2.5 rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
            <Clock
              aria-hidden="true"
              className="mt-0.5 size-[1.125rem] shrink-0"
              strokeWidth={1.8}
            />
            Les stages de l’été 2027 se recrutent dès maintenant : priorité au stage à l’étranger.
          </p>
        </div>

        <form
          role="search"
          aria-label="Rechercher des offres"
          onSubmit={rechercher}
          className="flex flex-wrap items-stretch gap-2 rounded-[1.125rem] border border-gray-200 bg-white p-2 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          <label className="flex min-h-14 flex-[2_1_17.5rem] cursor-text items-center gap-3 rounded-xl px-4">
            <Search
              aria-hidden="true"
              className="size-5 shrink-0 text-gray-600"
              strokeWidth={1.8}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Quoi</span>
              <input
                type="search"
                value={quoi}
                onChange={(evenement) => setQuoi(evenement.target.value)}
                placeholder="Intitulé, entreprise, ville"
                className="border-0 bg-transparent p-0 text-base outline-none placeholder:text-gray-400"
              />
            </span>
          </label>
          <span
            aria-hidden="true"
            className="my-2.5 hidden w-px bg-gray-200 sm:block dark:bg-gray-800"
          />
          <label className="flex min-h-14 flex-[1_1_13.75rem] cursor-text items-center gap-3 rounded-xl px-4">
            <MapPin
              aria-hidden="true"
              className="size-5 shrink-0 text-gray-600"
              strokeWidth={1.8}
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">Où</span>
              <input
                type="text"
                value={ou}
                onChange={(evenement) => setOu(evenement.target.value)}
                placeholder="Ville, pays"
                className="border-0 bg-transparent p-0 text-base outline-none placeholder:text-gray-400"
              />
            </span>
          </label>
          <button
            type="submit"
            className="min-h-14 flex-[1_0_auto] rounded-xl bg-primary-600 px-7 text-base font-semibold text-white transition hover:bg-primary-700 sm:flex-none dark:bg-primary-400 dark:text-primary-ink dark:hover:bg-primary-300"
          >
            Rechercher
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Type d'offre"
            className={`${SEGMENTS} hide-scroll max-w-full overflow-x-auto`}
          >
            {ONGLETS.map(({ id, libelle }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={id === onglet}
                onClick={() => setOnglet(id)}
                className={segment(id === onglet)}
              >
                {libelle} · {visibles.filter((offre) => dansOnglet(offre, id)).length}
              </button>
            ))}
          </div>
          <BoutonFiltres
            filtres={filtres}
            ouvert={filtresOuverts}
            onBasculer={() => setFiltresOuverts(!filtresOuverts)}
          />
        </div>

        <div
          role="group"
          aria-label="Pays"
          className="hide-scroll -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
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
              <span className="opacity-70">{parPays.get(code) ?? 0}</span>
            </button>
          ))}
        </div>

        {filtresOuverts && <FeedFilters filtres={filtres} onChange={setFiltres} />}
      </section>

      <div className="mt-6 flex flex-wrap items-start gap-x-7 gap-y-8">
        <div className="flex min-w-0 flex-[999_1_37.5rem] flex-col gap-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-sans text-[0.9375rem] font-medium text-gray-700 dark:text-gray-300">
              <strong className="font-bold text-gray-950 dark:text-gray-50">
                {affichees.length} offre{affichees.length > 1 ? 's' : ''}
              </strong>{' '}
              {affichees.length > 1 ? 'correspondent' : 'correspond'} · triées par{' '}
              {TRIS.find(({ id }) => id === tri)!.libelle.toLowerCase()}
            </h2>
            <label className={`flex items-center gap-2 text-sm ${SUR_LA_PAGE}`}>
              Trier par
              <select
                value={tri}
                onChange={(evenement) => setTri(evenement.target.value as Tri)}
                className="h-10 rounded-[0.625rem] border border-gray-300 bg-white px-3 text-sm text-gray-950 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-50"
              >
                {TRIS.map(({ id, libelle }) => (
                  <option key={id} value={id}>
                    {libelle}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(nbHorsCible > 0 || nbMasquees > 0) && (
            <div className={`flex flex-wrap gap-x-5 gap-y-1 text-sm ${SUR_LA_PAGE}`}>
              {nbHorsCible > 0 && (
                <label className="flex items-center gap-2">
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
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={avecMasquees}
                    onChange={(event) => setAvecMasquees(event.target.checked)}
                    className="size-4 accent-primary-600"
                  />
                  Afficher aussi les {nbMasquees} offres que j'ai masquées
                </label>
              )}
            </div>
          )}

          {derniereMasquee &&
            toutes.some((offre) => offre.id === derniereMasquee.id && offre.masquee) && (
              <p
                role="status"
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <span className="min-w-0 truncate">« {derniereMasquee.titre} » est masquée.</span>
                <button
                  type="button"
                  onClick={() => masquer.mutate({ id: derniereMasquee.id, masquee: false })}
                  className="shrink-0 font-semibold text-primary-600 underline underline-offset-2 dark:text-primary-300"
                >
                  Annuler
                </button>
              </p>
            )}

          {offres.isPending && <p className={`mt-4 ${SUR_LA_PAGE}`}>Chargement des offres…</p>}
          {offres.isError && (
            <p role="alert" className="mt-4 font-semibold text-red-700 dark:text-red-400">
              Les offres n'ont pas pu être chargées. Vérifie ta connexion.
            </p>
          )}
          {offres.isSuccess && affichees.length === 0 && (
            <p className={`mt-4 ${SUR_LA_PAGE}`}>
              {toutes.length === 0
                ? 'Aucune offre pour le moment. La collecte tourne toutes les 6 heures.'
                : onglet === 'alternance' &&
                    dansLOnglet.length === 0 &&
                    motsQuoi.length + motsOu.length === 0 &&
                    nombreDeFiltres(filtres) === 0
                  ? "Aucune offre d'alternance collectée pour le moment."
                  : 'Aucune offre ne correspond à ces filtres.'}
            </p>
          )}

          <ul className="flex flex-col gap-3.5">
            {affichees.map((offre) => (
              <li key={offre.id}>
                <OfferCard
                  offre={offre}
                  candidature={suivies.get(offre.id)}
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

        <AsideFil alternance={onglet === 'alternance'} pays={paysChoisis} />
      </div>
    </>
  );
}
