import {
  jourDe,
  jourIso,
  trierEcheances,
  versIcs,
  type Echeance,
  type TypeEcheance,
} from '@stageradar/shared';
import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { Flag } from '../components/Flag';
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
};
const BADGES: Record<TypeEcheance, string> = {
  entretien: BADGE.violet,
  relance: BADGE.ambre,
  echeance: BADGE.bleu,
  stage: BADGE.accent,
};

/** Une échéance et l'écran de l'application où la traiter. */
type Ligne = Echeance & { vers?: string };

function mois(jour: string): string {
  const texte = new Date(`${jour}T12:00:00`).toLocaleDateString('fr-FR', {
    month: 'long',
    year: 'numeric',
  });
  return texte.charAt(0).toUpperCase() + texte.slice(1);
}

function quand(echeance: Echeance): string {
  const jour = new Date(`${jourDe(echeance)}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
  });
  if (!echeance.heure) return jour;
  const heure = new Date(echeance.date).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${jour}, ${heure}`;
}

/** Toutes les dates à ne pas manquer, et leur export vers l'agenda du téléphone ou du PC. */
export function Calendrier() {
  const candidatures = useCandidatures();
  const fiches = useFichesPays();
  const reglages = useReglages();
  const [avecPassees, setAvecPassees] = useState(false);

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
        date: evenement.date,
        heure: true,
        details: titre,
        lien: evenement.details.lien,
        pays: candidature.resume.pays,
        vers,
      });
    }
    const aRelancer = candidature.statut === 'postule' || candidature.statut === 'relance';
    if (aRelancer && candidature.prochaine_relance) {
      lignes.push({
        id: `relance-${candidature.id}`,
        type: 'relance',
        titre: `Relancer ${nom}`,
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
        date: echeance.date,
        heure: false,
        pays: fiche.pays,
        vers: `/pays?pays=${fiche.pays}`,
      });
    }
  }
  if (reglages.data) {
    const { stage, alternance } = reglages.data.profil;
    lignes.push(
      {
        id: 'stage-debut',
        type: 'stage',
        titre: 'Début du stage visé',
        date: stage.debut,
        heure: false,
        vers: '/reglages',
      },
      {
        id: 'stage-fin',
        type: 'stage',
        titre: 'Fin du stage visé',
        date: stage.fin,
        heure: false,
        vers: '/reglages',
      },
      {
        id: 'alternance-rentree',
        type: 'stage',
        titre: "Rentrée de l'alternance",
        date: alternance.rentree,
        heure: false,
        vers: '/reglages',
      },
    );
  }

  // Jour du dernier chargement, pour ne pas dépendre de l'instant du rendu.
  const aujourdhui = jourIso(new Date(candidatures.dataUpdatedAt));
  const toutes = trierEcheances(lignes);
  const aVenir = toutes.filter((ligne) => jourDe(ligne) >= aujourdhui);
  const affichees = avecPassees ? toutes : aVenir;
  const parMois = new Map<string, Ligne[]>();
  for (const ligne of affichees) {
    const cle = mois(jourDe(ligne));
    parMois.set(cle, [...(parMois.get(cle) ?? []), ligne]);
  }

  const pret = candidatures.isSuccess && fiches.isSuccess && reglages.isSuccess;
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Calendrier</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Entretiens, relances, échéances notées dans les fiches pays et dates de ton projet.
      </p>

      {(candidatures.isError || fiches.isError || reglages.isError) && (
        <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
          Certaines dates n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {!pret && !candidatures.isError && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>
      )}

      {pret && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              disabled={aVenir.length === 0}
              onClick={() =>
                telecharger('stageradar.ics', versIcs(aVenir, new Date()), 'text/calendar')
              }
              className={`flex items-center gap-2 ${BOUTON_SECONDAIRE} bg-white dark:bg-gray-900`}
            >
              <CalendarPlus aria-hidden="true" className="size-4" />
              Exporter vers mon agenda (.ics)
            </button>
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={avecPassees}
                onChange={(evenement) => setAvecPassees(evenement.target.checked)}
                className="size-4 accent-primary-600"
              />
              Voir aussi les dates passées
            </label>
          </div>

          {affichees.length === 0 && (
            <p className="mt-8 text-gray-600 dark:text-gray-400">Aucune date à venir.</p>
          )}
          {[...parMois.entries()].map(([nom, duMois]) => (
            <section key={nom} aria-label={nom} className={`mt-4 ${CARTE}`}>
              <h2 className="font-bold">{nom}</h2>
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
        </>
      )}
    </div>
  );
}
