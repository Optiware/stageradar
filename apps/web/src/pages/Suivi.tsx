import {
  changerStatut,
  jourIso,
  LIBELLES_STATUT,
  relanceDue,
  STATUTS_SUIVI,
  type StatutSuivi,
} from '@stageradar/shared';
import { Kanban, List, Video } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { CandidatureDialog } from '../components/CandidatureDialog';
import { Flag } from '../components/Flag';
import { lieu } from '../lib/offres';
import {
  entretienDe,
  libelleEntretien,
  libelleRelance,
  useCandidatures,
  useEnregistrerCandidature,
  valeursDe,
  type Candidature,
} from '../lib/suivi';
import { BADGE, CARTE, CARTE_SURVOL, pilule, SECONDAIRE } from '../lib/ui';

interface Teinte {
  colonne: string;
  /** Pastille de couleur devant le titre de la colonne. */
  pastille: string;
  compteur: string;
  /** Bordure des cartes de la colonne (les entretiens ressortent). */
  carte: string;
}

const NEUTRE: Teinte = {
  colonne: 'bg-colonne-neutre dark:bg-gray-950',
  pastille: 'bg-gray-400 dark:bg-gray-500',
  compteur: 'bg-white text-gray-700 dark:bg-gray-850 dark:text-gray-400',
  carte: 'border border-gray-200 dark:border-gray-800',
};
const CYAN: Teinte = {
  colonne: 'bg-colonne-cyan dark:bg-primary-400/[0.07]',
  pastille: 'bg-primary-600 dark:bg-primary-400',
  compteur: 'bg-white text-primary-700 dark:bg-primary-400/15 dark:text-primary-400',
  carte: 'border border-gray-200 dark:border-gray-800',
};
const AMBRE: Teinte = {
  colonne: 'bg-amber-50 dark:bg-amber-500/[0.07]',
  pastille: 'bg-amber-500 dark:bg-amber-400',
  compteur: 'bg-white text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  carte: 'border border-gray-200 dark:border-gray-800',
};
const VIOLET: Teinte = {
  colonne: 'bg-colonne-violet dark:bg-indigo-500/[0.09]',
  pastille: 'bg-indigo-600 dark:bg-indigo-400',
  compteur: 'bg-white text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
  carte: 'border-2 border-indigo-600 dark:border-indigo-400',
};

const TEINTES: Record<StatutSuivi, Teinte> = {
  a_etudier: NEUTRE,
  a_postuler: NEUTRE,
  postule: CYAN,
  relance: AMBRE,
  entretien: VIOLET,
  offre: CYAN,
  refus: NEUTRE,
};

function Carte({
  candidature,
  maintenant,
  onOuvrir,
  onDeplacer,
}: {
  candidature: Candidature;
  maintenant: Date;
  onOuvrir: () => void;
  onDeplacer: (vers: StatutSuivi) => void;
}) {
  const offre = candidature.offre;
  const { entreprise, titre: intitule } = candidature.resume;
  // Deux candidatures spontanées doivent garder des noms distincts.
  const titre = offre || !entreprise ? intitule : `${intitule} : ${entreprise}`;
  const aujourdhui = jourIso(maintenant);
  const entretien = entretienDe(candidature);
  const entretienAVenir =
    entretien && jourIso(new Date(entretien.date)) >= aujourdhui ? entretien : undefined;
  const relance =
    candidature.prochaine_relance !== null &&
    (candidature.statut === 'postule' || candidature.statut === 'relance')
      ? candidature.prochaine_relance
      : null;

  return (
    <li
      draggable
      onDragStart={(evenement) => {
        evenement.dataTransfer.setData('text/plain', candidature.id);
        evenement.dataTransfer.effectAllowed = 'move';
      }}
      className={`cursor-grab rounded-[1.25rem] bg-white p-4 shadow-sm active:cursor-grabbing dark:bg-gray-900 ${TEINTES[candidature.statut].carte}`}
    >
      <article aria-label={titre}>
        <button type="button" onClick={onOuvrir} className="block w-full text-left">
          {entreprise && (
            <span className={`block text-xs font-bold ${SECONDAIRE}`}>{entreprise}</span>
          )}
          <span className="mt-0.5 block leading-tight font-extrabold break-words">{intitule}</span>
          {lieu(candidature.resume) && (
            <span className={`mt-1 flex items-center gap-1.5 text-xs ${SECONDAIRE}`}>
              <Flag code={candidature.resume.pays} />
              {lieu(candidature.resume)}
            </span>
          )}
        </button>

        {(entretienAVenir || relance || offre?.actif === false) && (
          <ul className="mt-3 flex flex-wrap gap-2">
            {entretienAVenir && (
              <li className={`flex items-center gap-1.5 ${BADGE.violet}`}>
                <Video aria-hidden="true" className="size-3.5" />
                Entretien {libelleEntretien(entretienAVenir.date, maintenant)}
              </li>
            )}
            {relance && (
              <li className={relanceDue(candidature, aujourdhui) ? BADGE.rouge : BADGE.ambre}>
                {libelleRelance(relance, aujourdhui)}
              </li>
            )}
            {offre?.actif === false && <li className={BADGE.neutre}>Annonce retirée</li>}
          </ul>
        )}

        {/* `relative` : le libellé masqué (position absolue) reste dans la carte. Sans cela, il
            échappe au défilement des colonnes et élargit toute la page. */}
        <label className="relative mt-3 block">
          <span className="sr-only">Colonne de « {titre} »</span>
          <select
            value={candidature.statut}
            onChange={(evenement) => onDeplacer(evenement.target.value as StatutSuivi)}
            className="block w-full rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
          >
            {STATUTS_SUIVI.map((statut) => (
              <option key={statut} value={statut}>
                {LIBELLES_STATUT[statut]}
              </option>
            ))}
          </select>
        </label>
      </article>
    </li>
  );
}

const BADGES_STATUT: Record<StatutSuivi, string> = {
  a_etudier: BADGE.neutre,
  a_postuler: BADGE.neutre,
  postule: BADGE.accent,
  relance: BADGE.ambre,
  entretien: BADGE.violet,
  offre: BADGE.accent,
  refus: BADGE.rouge,
};

/** « Mes candidatures » : la même chose que le tableau, en liste filtrable par étape. */
function Liste({
  toutes,
  maintenant,
  onOuvrir,
}: {
  toutes: Candidature[];
  maintenant: Date;
  onOuvrir: (id: string) => void;
}) {
  const [etape, setEtape] = useState<StatutSuivi | null>(null);
  const aujourdhui = jourIso(maintenant);
  const affichees = toutes
    .filter((candidature) => etape === null || candidature.statut === etape)
    .sort(
      (a, b) =>
        STATUTS_SUIVI.indexOf(a.statut) - STATUTS_SUIVI.indexOf(b.statut) ||
        a.position - b.position,
    );

  return (
    <>
      <div role="group" aria-label="Étape" className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={etape === null}
          onClick={() => setEtape(null)}
          className={pilule(etape === null)}
        >
          Toutes <span className={`font-medium ${SECONDAIRE}`}>{toutes.length}</span>
        </button>
        {STATUTS_SUIVI.map((statut) => (
          <button
            key={statut}
            type="button"
            aria-pressed={etape === statut}
            onClick={() => setEtape(statut)}
            className={pilule(etape === statut)}
          >
            {LIBELLES_STATUT[statut]}{' '}
            <span className={`font-medium ${SECONDAIRE}`}>
              {toutes.filter((candidature) => candidature.statut === statut).length}
            </span>
          </button>
        ))}
      </div>

      {affichees.length === 0 && (
        <p className="mt-6 text-gray-600 dark:text-gray-400">Aucune candidature à cette étape.</p>
      )}
      <ul aria-label="Mes candidatures" className="mt-4 max-w-3xl space-y-3">
        {affichees.map((candidature) => {
          const { titre, entreprise } = candidature.resume;
          const entretien = entretienDe(candidature);
          const aVenir = entretien && jourIso(new Date(entretien.date)) >= aujourdhui;
          const relance =
            candidature.prochaine_relance !== null &&
            (candidature.statut === 'postule' || candidature.statut === 'relance')
              ? candidature.prochaine_relance
              : null;
          return (
            <li key={candidature.id}>
              <button
                type="button"
                onClick={() => onOuvrir(candidature.id)}
                className={`block w-full text-left ${CARTE} ${CARTE_SURVOL}`}
              >
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    {entreprise && (
                      <span className={`block text-xs font-bold ${SECONDAIRE}`}>{entreprise}</span>
                    )}
                    <span className="block font-bold break-words">{titre}</span>
                  </span>
                  <span className={BADGES_STATUT[candidature.statut]}>
                    {LIBELLES_STATUT[candidature.statut]}
                  </span>
                </span>
                <span
                  className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${SECONDAIRE}`}
                >
                  {lieu(candidature.resume) && (
                    <span className="flex items-center gap-1.5">
                      <Flag code={candidature.resume.pays} />
                      {lieu(candidature.resume)}
                    </span>
                  )}
                  {candidature.date_candidature && (
                    <span>
                      Envoyée le{' '}
                      {new Date(`${candidature.date_candidature}T12:00:00`).toLocaleDateString(
                        'fr-FR',
                        { day: 'numeric', month: 'short' },
                      )}
                    </span>
                  )}
                  {aVenir && (
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      Entretien {libelleEntretien(entretien.date, maintenant)}
                    </span>
                  )}
                  {relance && (
                    <span
                      className={
                        relanceDue(candidature, aujourdhui)
                          ? 'font-bold text-red-700 dark:text-red-400'
                          : 'font-bold text-amber-700 dark:text-amber-400'
                      }
                    >
                      {libelleRelance(relance, aujourdhui)}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/** Tableau de suivi : une colonne par étape, de « À étudier » à « Refus / Abandon ». */
export function Suivi() {
  const candidatures = useCandidatures();
  const enregistrer = useEnregistrerCandidature();
  const [params, setParams] = useSearchParams();
  const [survolee, setSurvolee] = useState<StatutSuivi | null>(null);
  const [vue, setVue] = useState<'tableau' | 'liste'>('tableau');

  const toutes = candidatures.data ?? [];
  // Heure du dernier chargement : les libellés (« demain », « en retard ») ne dépendent pas
  // de l'instant du rendu.
  const maintenant = new Date(candidatures.dataUpdatedAt);
  const ouverte = toutes.find((candidature) => candidature.id === params.get('candidature'));

  function deplacer(candidature: Candidature, vers: StatutSuivi) {
    if (vers === candidature.statut) return;
    enregistrer.mutate({
      candidature,
      valeurs: {
        ...valeursDe(candidature),
        ...changerStatut(candidature, vers, jourIso(new Date())),
      },
    });
  }

  return (
    <>
      <h1 className="text-[1.75rem] font-extrabold tracking-[-0.03em]">Suivi</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        {vue === 'tableau'
          ? 'Fais glisser une carte vers une autre colonne, ou change sa colonne depuis la carte.'
          : 'Toutes tes candidatures, avec leur prochaine action.'}
      </p>
      <div role="group" aria-label="Affichage" className="mt-3 flex gap-2">
        {(['tableau', 'liste'] as const).map((choix) => (
          <button
            key={choix}
            type="button"
            aria-pressed={vue === choix}
            onClick={() => setVue(choix)}
            className={`flex items-center gap-2 ${pilule(vue === choix)}`}
          >
            {choix === 'tableau' ? (
              <Kanban aria-hidden="true" className="size-4" />
            ) : (
              <List aria-hidden="true" className="size-4" />
            )}
            {choix === 'tableau' ? 'Tableau' : 'Liste'}
          </button>
        ))}
      </div>

      {candidatures.isPending && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement du suivi…</p>
      )}
      {candidatures.isError && (
        <p role="alert" className="mt-8 font-bold text-red-700 dark:text-red-400">
          Le suivi n'a pas pu être chargé. Vérifie ta connexion.
        </p>
      )}
      {enregistrer.isError && (
        <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
          Le déplacement n'a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      {candidatures.isSuccess && toutes.length === 0 && (
        <div className={`mt-6 max-w-3xl ${CARTE}`}>
          <p className="font-bold">Aucune offre dans le suivi pour le moment.</p>
          <p className={`mt-1 text-sm ${SECONDAIRE}`}>
            Dans le fil, le bouton « Sauver » d'une offre l'ajoute ici, dans la colonne « À étudier
            ».
          </p>
          <Link
            to="/"
            className="mt-3 inline-block text-sm font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
          >
            Aller au fil
          </Link>
        </div>
      )}

      {/* Les sept colonnes ne tiennent pas à l'écran : ces raccourcis amènent chacune en vue. */}
      {candidatures.isSuccess && vue === 'tableau' && toutes.length > 0 && (
        <div
          role="group"
          aria-label="Aller à une colonne"
          className="-mx-4 mt-4 hide-scroll flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0"
        >
          {STATUTS_SUIVI.map((statut) => (
            <button
              key={statut}
              type="button"
              onClick={() =>
                document
                  .getElementById(`colonne-${statut}`)
                  ?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })
              }
              className={`shrink-0 ${pilule(false)}`}
            >
              {LIBELLES_STATUT[statut]}{' '}
              <span className={`font-medium ${SECONDAIRE}`}>
                {toutes.filter((candidature) => candidature.statut === statut).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {candidatures.isSuccess && vue === 'liste' && toutes.length > 0 && (
        <Liste
          toutes={toutes}
          maintenant={maintenant}
          onOuvrir={(id) => setParams({ candidature: id })}
        />
      )}

      {candidatures.isSuccess && vue === 'tableau' && (
        <div className="relative -mx-4 mt-4 flex snap-x scroll-px-4 items-start gap-4 overflow-x-auto px-4 pb-4 max-md:hide-scroll md:-mx-8 md:scroll-px-8 md:px-8">
          {STATUTS_SUIVI.map((statut) => {
            const cartes = toutes.filter((candidature) => candidature.statut === statut);
            const teinte = TEINTES[statut];
            return (
              <section
                key={statut}
                id={`colonne-${statut}`}
                aria-label={LIBELLES_STATUT[statut]}
                onDragOver={(evenement) => {
                  evenement.preventDefault();
                  setSurvolee(statut);
                }}
                onDragLeave={() => setSurvolee(null)}
                onDrop={(evenement) => {
                  evenement.preventDefault();
                  setSurvolee(null);
                  const id = evenement.dataTransfer.getData('text/plain');
                  const candidature = toutes.find((autre) => autre.id === id);
                  if (candidature) deplacer(candidature, statut);
                }}
                className={`w-80 shrink-0 snap-start rounded-3xl p-3.5 outline-offset-2 transition ${teinte.colonne} ${
                  survolee === statut
                    ? 'outline-2 outline-primary-600 outline-dashed dark:outline-primary-400'
                    : ''
                }`}
              >
                <header className="flex items-center justify-between px-2 py-1">
                  <h2 className="flex items-center gap-2 font-bold">
                    <span
                      aria-hidden="true"
                      className={`size-2.5 rounded-full ${teinte.pastille}`}
                    />
                    {LIBELLES_STATUT[statut]}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${teinte.compteur}`}
                  >
                    {cartes.length}
                  </span>
                </header>
                <ul className="mt-2 min-h-12 space-y-3">
                  {cartes.map((candidature) => (
                    <Carte
                      key={candidature.id}
                      candidature={candidature}
                      maintenant={maintenant}
                      onOuvrir={() => setParams({ candidature: candidature.id })}
                      onDeplacer={(vers) => deplacer(candidature, vers)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {ouverte && (
        <CandidatureDialog
          key={ouverte.id}
          candidature={ouverte}
          aujourdhui={jourIso(maintenant)}
          onFermer={() => setParams({}, { replace: true })}
        />
      )}
    </>
  );
}
