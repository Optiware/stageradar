import {
  echeancesVisa,
  jourDe,
  jourIso,
  trierEcheances,
  versIcs,
  type Echeance,
  type TypeEcheance,
} from '@stageradar/shared';
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
import { dateLongue, lienSur } from '../lib/offres';
import { useFichesPays } from '../lib/pays';
import { useReglages } from '../lib/reglages';
import { useCandidatures } from '../lib/suivi';
import { telecharger } from '../lib/telechargement';
import { BADGE, BOUTON_SECONDAIRE, CARTE, SECONDAIRE } from '../lib/ui';

const LIBELLES: Record<TypeEcheance, string> = {
  entretien: 'Entretien',
  relance: 'Relance',
  echeance: 'Échéance',
  stage: 'Mon projet',
  visa: 'Visa',
};
const BADGES: Record<TypeEcheance, string> = {
  entretien: BADGE.vert,
  relance: BADGE.bleu,
  echeance: BADGE.ambre,
  stage: BADGE.neutre,
  visa: BADGE.violet,
};
/** Pastilles de la grille du mois : mêmes teintes, plus compactes. */
const PUCES: Record<TypeEcheance, string> = {
  entretien: 'bg-vert-50 text-vert-700 dark:bg-vert-500/20 dark:text-vert-50',
  relance: 'bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300',
  echeance: 'bg-amber-50 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  stage: 'bg-[#f0f2f7] text-gray-700 dark:bg-gray-850 dark:text-gray-300',
  visa: 'bg-[#efe5ff] text-[#5b2eb0] dark:bg-violet-500/20 dark:text-violet-300',
};

/** Une échéance, son nom court dans la grille et l'écran de l'application où la traiter. */
type Ligne = Echeance & { vers?: string; court: string };

const JOURS_SEMAINE = ['Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.', 'Dim.'];

function nomMois(cle: string): string {
  const texte = new Date(`${cle}-15T12:00:00`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function decalerMois(cle: string, nombre: number): string {
  const [annee, mois] = cle.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(annee, mois - 1 + nombre, 15));
  return date.toISOString().slice(0, 7);
}

/** Les 6 semaines affichées pour un mois, du lundi au dimanche. */
function joursDeLaGrille(cle: string): string[] {
  const premier = new Date(`${cle}-01T12:00:00Z`);
  const decalage = (premier.getUTCDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, rang) => {
    const jour = new Date(premier);
    jour.setUTCDate(1 - decalage + rang);
    return jour.toISOString().slice(0, 10);
  });
}

function quand(echeance: Echeance): string {
  const jour = new Date(`${jourDe(echeance)}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
  });
  if (!echeance.heure) return jour;
  return `${jour}, ${heure(echeance)}`;
}

function heure(echeance: Echeance): string {
  return new Date(echeance.date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calendrier (maquette du 18 novembre 2026) : la grille du mois avec ses filtres, ce qui presse,
 * les échéances visa calculées depuis les fiches pays, puis toutes les dates à venir.
 */
export function Calendrier() {
  const candidatures = useCandidatures();
  const fiches = useFichesPays();
  const reglages = useReglages();
  // Jour du dernier chargement, pour ne pas dépendre de l'instant du rendu.
  const aujourdhui = jourIso(new Date(candidatures.dataUpdatedAt));
  // `null` : le mois en cours (connu une fois les données chargées).
  const [moisChoisi, setMois] = useState<string | null>(null);
  const mois = moisChoisi ?? aujourdhui.slice(0, 7);
  const [filtres, setFiltres] = useState({ entretien: true, relance: true, visa: true });
  const [avecPassees, setAvecPassees] = useState(false);

  const debutStage = reglages.data?.profil.stage.debut ?? null;
  const visas = echeancesVisa(fiches.data ?? [], debutStage);

  const lignes: Ligne[] = [];
  for (const candidature of candidatures.data ?? []) {
    const { entreprise, titre } = candidature.resume;
    const nom = entreprise ?? titre;
    const vers = `/suivi?candidature=${candidature.id}`;
    for (const evenement of candidature.evenements) {
      if (evenement.type !== 'entretien') continue;
      lignes.push({
        id: `entretien-${evenement.id}`,
        type: 'entretien',
        titre: `Entretien : ${nom}`,
        court: `Entretien · ${nom}`,
        date: evenement.date,
        heure: true,
        details: titre,
        lien: evenement.details.lien,
        pays: candidature.resume.pays,
        vers: `/entretien?candidature=${candidature.id}`,
      });
    }
    const aRelancer = candidature.statut === 'postule' || candidature.statut === 'relance';
    if (aRelancer && candidature.prochaine_relance) {
      lignes.push({
        id: `relance-${candidature.id}`,
        type: 'relance',
        titre: `Relancer ${nom}`,
        court: `${candidature.statut === 'relance' ? 'Relance J+14' : 'Relance J+7'} · ${nom}`,
        date: candidature.prochaine_relance,
        heure: false,
        details: titre,
        pays: candidature.resume.pays,
        vers,
      });
    }
  }
  for (const fiche of fiches.data ?? []) {
    for (const echeance of fiche.echeances) {
      lignes.push({
        id: `echeance-${fiche.pays}-${echeance.date}-${echeance.libelle}`,
        type: 'echeance',
        titre: `${fiche.nom} : ${echeance.libelle}`,
        court: `${fiche.nom} · ${echeance.libelle}`,
        date: echeance.date,
        heure: false,
        pays: fiche.pays,
        vers: `/pays?pays=${fiche.pays}`,
      });
    }
  }
  for (const visa of visas) {
    if (!visa.date) continue;
    lignes.push({
      id: `visa-${visa.pays}-${visa.etape}`,
      type: 'visa',
      titre: `Visa · ${visa.nom} : ${visa.etape}`,
      court: `Visa · ${visa.nom}`,
      date: visa.date,
      heure: false,
      details: visa.source,
      pays: visa.pays,
      vers: `/pays?pays=${visa.pays}`,
    });
  }
  if (reglages.data) {
    const { stage, alternance } = reglages.data.profil;
    lignes.push(
      {
        id: 'stage-debut',
        type: 'stage',
        titre: 'Début du stage visé',
        court: 'Début du stage',
        date: stage.debut,
        heure: false,
        vers: '/reglages',
      },
      {
        id: 'stage-fin',
        type: 'stage',
        titre: 'Fin du stage visé',
        court: 'Fin du stage',
        date: stage.fin,
        heure: false,
        vers: '/reglages',
      },
      {
        id: 'alternance-rentree',
        type: 'stage',
        titre: "Rentrée de l'alternance",
        court: 'Rentrée alternance',
        date: alternance.rentree,
        heure: false,
        vers: '/reglages',
      },
    );
  }

  const visibles = lignes.filter(
    (ligne) =>
      (ligne.type !== 'entretien' || filtres.entretien) &&
      (ligne.type !== 'relance' || filtres.relance) &&
      (ligne.type !== 'visa' || filtres.visa),
  );
  const toutes = trierEcheances(visibles);
  const aVenir = toutes.filter((ligne) => jourDe(ligne) >= aujourdhui);
  const listees = avecPassees ? toutes : aVenir;
  const parJour = new Map<string, Ligne[]>();
  for (const ligne of toutes) {
    const jour = jourDe(ligne);
    parJour.set(jour, [...(parJour.get(jour) ?? []), ligne]);
  }
  const parMois = new Map<string, Ligne[]>();
  for (const ligne of listees) {
    const cle = jourDe(ligne).slice(0, 7);
    parMois.set(cle, [...(parMois.get(cle) ?? []), ligne]);
  }

  // Ce qui presse : étapes de visa dépassées, entretiens d'aujourd'hui et de demain.
  const demain = new Date(`${aujourdhui}T12:00:00Z`);
  demain.setUTCDate(demain.getUTCDate() + 1);
  const dansDeuxJours = demain.toISOString().slice(0, 10);
  const depassees = visas.filter((visa) => visa.date && visa.date < aujourdhui);
  const proches = lignes.filter(
    (ligne) =>
      ligne.type === 'entretien' && jourDe(ligne) >= aujourdhui && jourDe(ligne) <= dansDeuxJours,
  );

  const pret = candidatures.isSuccess && fiches.isSuccess && reglages.isSuccess;
  const FILTRES: [keyof typeof filtres, string][] = [
    ['entretien', 'Entretiens'],
    ['relance', 'Relances'],
    ['visa', 'Afficher les échéances visa'],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h1 className="text-[1.75rem] font-extrabold tracking-[-0.02em] md:text-[2rem]">
          {nomMois(mois)}
        </h1>
        <div className="flex gap-1">
          <button
            type="button"
            aria-label="Mois précédent"
            onClick={() => setMois(decalerMois(mois, -1))}
            className="flex size-10 items-center justify-center rounded-[0.625rem] border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Mois suivant"
            onClick={() => setMois(decalerMois(mois, 1))}
            className="flex size-10 items-center justify-center rounded-[0.625rem] border border-gray-300 bg-white dark:border-gray-800 dark:bg-gray-900"
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
        {mois !== aujourdhui.slice(0, 7) && (
          <button
            type="button"
            onClick={() => setMois(aujourdhui.slice(0, 7))}
            className="text-sm font-semibold text-primary-600 dark:text-primary-300"
          >
            Aujourd’hui
          </button>
        )}
        <span className="flex-1" />
        {FILTRES.map(([cle, libelle]) => (
          <label key={cle} className="flex min-h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres[cle]}
              onChange={(evenement) => setFiltres({ ...filtres, [cle]: evenement.target.checked })}
              className="size-4 accent-primary-600"
            />
            {libelle}
          </label>
        ))}
        <button
          type="button"
          disabled={aVenir.length === 0}
          onClick={() =>
            telecharger('stageradar.ics', versIcs(aVenir, new Date()), 'text/calendar')
          }
          className={`flex items-center gap-2 ${BOUTON_SECONDAIRE}`}
        >
          <CalendarPlus aria-hidden="true" className="size-4" />
          Exporter vers mon agenda (.ics)
        </button>
      </div>

      {(candidatures.isError || fiches.isError || reglages.isError) && (
        <p role="alert" className="font-bold text-red-700 dark:text-red-400">
          Certaines dates n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {!pret && !candidatures.isError && <p className={SECONDAIRE}>Chargement…</p>}

      {pret && (
        <div className="flex flex-wrap items-start gap-5">
          <section
            aria-label="Grille du mois"
            className="hidden min-w-0 flex-[999_1_45rem] overflow-hidden rounded-2xl border border-gray-200 bg-white md:block dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800">
              {JOURS_SEMAINE.map((jour) => (
                <span
                  key={jour}
                  className={`px-2.5 py-2 text-[0.8125rem] font-semibold ${SECONDAIRE}`}
                >
                  {jour}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {joursDeLaGrille(mois).map((jour) => {
                const horsMois = jour.slice(0, 7) !== mois;
                const estAujourdhui = jour === aujourdhui;
                return (
                  <div
                    key={jour}
                    className={`flex min-h-[6.5rem] flex-col gap-1 border-r border-b border-gray-100 p-1.5 dark:border-gray-800 ${
                      horsMois ? 'bg-gray-50/70 dark:bg-gray-950/40' : ''
                    }`}
                  >
                    <span
                      className={`flex size-7 items-center justify-center rounded-full text-[0.8125rem] ${
                        estAujourdhui
                          ? 'bg-primary-600 font-bold text-white dark:bg-primary-400 dark:text-primary-ink'
                          : horsMois
                            ? 'text-gray-400'
                            : 'font-medium'
                      }`}
                    >
                      {Number(jour.slice(8))}
                    </span>
                    {(parJour.get(jour) ?? []).map((ligne) => (
                      <Link
                        key={ligne.id}
                        to={ligne.vers ?? '#'}
                        title={ligne.titre}
                        className={`truncate rounded-md px-1.5 py-0.5 text-xs font-semibold ${PUCES[ligne.type]}`}
                      >
                        {ligne.heure ? `${heure(ligne)} ` : ''}
                        {ligne.court}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="flex min-w-0 flex-[1_1_20rem] flex-col gap-5 md:max-w-[22.5rem]">
            <section
              aria-labelledby="titre-important-cal"
              className={`flex flex-col gap-2.5 ${CARTE}`}
            >
              <h2 id="titre-important-cal" className="text-lg font-bold">
                Important
              </h2>
              {depassees.length === 0 && proches.length === 0 && (
                <p className={`text-sm ${SECONDAIRE}`}>Rien d’urgent.</p>
              )}
              {depassees.map((visa) => (
                <Link
                  key={`${visa.pays}-${visa.etape}`}
                  to={`/pays?pays=${visa.pays}`}
                  className="flex flex-col rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:bg-red-500/15 dark:text-red-200"
                >
                  <strong>
                    Visa · {visa.nom} : {visa.etape} · dépassée
                  </strong>
                  <span>Échéance du {dateLongue(visa.date)} · voir la fiche pays</span>
                </Link>
              ))}
              {proches.map((ligne) => (
                <Link
                  key={ligne.id}
                  to={ligne.vers ?? '#'}
                  className="flex flex-col rounded-xl bg-vert-50 px-3 py-2.5 text-sm text-vert-700 dark:bg-vert-500/20 dark:text-vert-50"
                >
                  <strong>
                    {ligne.court}, {quand(ligne)}
                  </strong>
                  <span className="font-semibold underline underline-offset-2">
                    Ouvrir la préparation
                  </span>
                </Link>
              ))}
            </section>

            <section aria-labelledby="titre-visas" className={`flex flex-col gap-2.5 ${CARTE}`}>
              <h2 id="titre-visas" className="flex items-center gap-2 text-lg font-bold">
                <span aria-hidden="true" className="size-2.5 rounded-full bg-[#7c4ddb]" />
                Échéances visa
              </h2>
              <p className={`text-sm ${SECONDAIRE}`}>
                Calculées depuis la date de début du stage et les délais de chaque fiche pays.
              </p>
              {visas.length === 0 && (
                <p className="text-sm">
                  Aucun délai noté dans les fiches.{' '}
                  <Link to="/pays" className="font-semibold text-primary-600 dark:text-primary-300">
                    Ouvrir les fiches pays
                  </Link>
                </p>
              )}
              {visas.map((visa) => (
                <div
                  key={`${visa.pays}-${visa.etape}`}
                  className="flex flex-col gap-1 rounded-xl border border-gray-200 p-3 dark:border-gray-800"
                >
                  <span className="flex items-center gap-2">
                    <Flag code={visa.pays} />
                    <strong className="text-sm">
                      Visa · {visa.nom} : {visa.etape}
                    </strong>
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      visa.date ? '' : 'text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {visa.date
                      ? `Le ${dateLongue(visa.date)}`
                      : debutStage
                        ? 'Délai non indiqué dans la fiche : à vérifier'
                        : 'Date de début du stage à renseigner dans les réglages'}
                  </span>
                  <span className={`text-xs ${SECONDAIRE}`}>
                    {visa.date &&
                      `Calcul : début du stage (${dateLongue(debutStage)}) moins ${visa.jours_avant} jours · `}
                    Source :{' '}
                    {lienSur(visa.url) ? (
                      <a
                        href={visa.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary-600 underline underline-offset-2 dark:text-primary-300"
                      >
                        {visa.source || visa.url}
                      </a>
                    ) : (
                      visa.source || 'non indiquée'
                    )}
                    {visa.verifiee && `, vérifiée le ${dateLongue(visa.verifiee)}`}
                  </span>
                </div>
              ))}
            </section>
          </aside>
        </div>
      )}

      {pret && (
        <section aria-labelledby="titre-a-venir" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="titre-a-venir" className="text-xl font-bold">
              Toutes les dates à venir
            </h2>
            <label className={`flex items-center gap-2 text-sm ${SECONDAIRE}`}>
              <input
                type="checkbox"
                checked={avecPassees}
                onChange={(evenement) => setAvecPassees(evenement.target.checked)}
                className="size-4 accent-primary-600"
              />
              Voir aussi les dates passées
            </label>
          </div>
          {listees.length === 0 && <p className={SECONDAIRE}>Aucune date à venir.</p>}
          {[...parMois.entries()].map(([cle, duMois]) => (
            <section key={cle} aria-label={nomMois(cle)} className={CARTE}>
              <h3 className="font-bold">{nomMois(cle)}</h3>
              <ul className="mt-3 divide-y divide-gray-200 dark:divide-gray-800">
                {duMois.map((ligne) => {
                  const passee = jourDe(ligne) < aujourdhui;
                  const contenu = (
                    <>
                      <span className="w-20 shrink-0 text-sm font-bold sm:w-28">
                        {quand(ligne)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-bold break-words">
                          <Flag code={ligne.pays ?? null} />
                          {ligne.titre}
                        </span>
                        {ligne.details && (
                          <span className={`block truncate text-xs ${SECONDAIRE}`}>
                            {ligne.details}
                          </span>
                        )}
                      </span>
                      <span className={`shrink-0 ${BADGES[ligne.type]}`}>
                        {LIBELLES[ligne.type]}
                      </span>
                    </>
                  );
                  return (
                    <li key={ligne.id} className={passee ? 'opacity-60' : ''}>
                      {ligne.vers ? (
                        <Link to={ligne.vers} className="flex items-center gap-3 py-2.5">
                          {contenu}
                        </Link>
                      ) : (
                        <div className="flex items-center gap-3 py-2.5">{contenu}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </section>
      )}
    </div>
  );
}
