import {
  jourIso,
  LIBELLES_STATUT,
  parSemaine,
  parStatut,
  taux,
  tauxPar,
  type CandidatureComptee,
  type Taux,
} from '@stageradar/shared';
import type { ReactNode } from 'react';
import { Flag } from '../components/Flag';
import { nomPays } from '../lib/offres';
import { useCandidatures } from '../lib/suivi';
import { CARTE, SECONDAIRE } from '../lib/ui';

const SEMAINES = 8;

function pourcent(part: number | null): string {
  return part === null ? '—' : `${Math.round(part * 100)} %`;
}

function Chiffre({ nom, valeur }: { nom: string; valeur: string | number }) {
  return (
    <div className={CARTE}>
      <dt className={`text-sm font-bold ${SECONDAIRE}`}>{nom}</dt>
      <dd className="mt-1 text-3xl font-extrabold">{valeur}</dd>
    </div>
  );
}

function Barre({ part }: { part: number }) {
  return (
    <span className="block h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <span
        className="block h-full rounded-full bg-primary-500"
        style={{ width: `${Math.round(part * 100)}%` }}
      />
    </span>
  );
}

function LigneTaux({ nom, valeurs }: { nom: ReactNode; valeurs: Taux }) {
  return (
    <tr className="border-t border-gray-200 dark:border-gray-800">
      <th scope="row" className="py-2 pr-3 text-left font-bold">
        {nom}
      </th>
      <td className="py-2 pr-3 text-right tabular-nums">{valeurs.envoyees}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{valeurs.reponses}</td>
      <td className="py-2 pr-3 text-right tabular-nums">{valeurs.entretiens}</td>
      <td className="py-2 text-right font-bold tabular-nums">{pourcent(valeurs.taux_reponse)}</td>
    </tr>
  );
}

/** Ce que donnent les candidatures : envois, réponses, et ce qui marche le mieux. */
export function Statistiques() {
  const candidatures = useCandidatures();
  const comptees: CandidatureComptee[] = (candidatures.data ?? []).map((candidature) => ({
    statut: candidature.statut,
    date_candidature: candidature.date_candidature,
    pays: candidature.resume.pays,
    spontanee: candidature.offre === null,
  }));
  const global = taux(comptees);
  const etapes = parStatut(comptees);
  const maxEtape = Math.max(1, ...etapes.map((etape) => etape.nombre));
  const semaines = parSemaine(comptees, jourIso(new Date(candidatures.dataUpdatedAt)), SEMAINES);
  const maxSemaine = Math.max(1, ...semaines.map((semaine) => semaine.envoyees));
  const pays = tauxPar(comptees, (candidature) => candidature.pays ?? '');
  const types = tauxPar(comptees, (candidature) =>
    candidature.spontanee ? 'Candidatures spontanées' : 'Réponses à une offre',
  );

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Statistiques</h1>

      {candidatures.isPending && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>
      )}
      {candidatures.isError && (
        <p role="alert" className="mt-8 font-bold text-red-700 dark:text-red-400">
          Les candidatures n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {candidatures.isSuccess && comptees.length === 0 && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">
          Rien à compter pour le moment : les chiffres apparaîtront avec tes premières candidatures.
        </p>
      )}

      {candidatures.isSuccess && comptees.length > 0 && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Chiffre nom="Envoyées" valeur={global.envoyees} />
            <Chiffre nom="Réponses" valeur={global.reponses} />
            <Chiffre nom="Taux de réponse" valeur={pourcent(global.taux_reponse)} />
            <Chiffre nom="Entretiens" valeur={global.entretiens} />
          </dl>

          <section aria-label="Par étape" className={`mt-4 ${CARTE}`}>
            <h2 className="font-bold">Par étape</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {etapes.map(({ statut, nombre }) => (
                <li key={statut} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 font-bold">{LIBELLES_STATUT[statut]}</span>
                  <Barre part={nombre / maxEtape} />
                  <span className="w-6 text-right font-bold tabular-nums">{nombre}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-label="Par semaine" className={`mt-4 ${CARTE}`}>
            <h2 className="font-bold">Candidatures envoyées par semaine</h2>
            <ol className="mt-4 flex h-32 items-end gap-2">
              {semaines.map(({ lundi, envoyees }) => (
                <li key={lundi} className="flex h-full flex-1 flex-col items-center justify-end">
                  <span className="text-xs font-bold tabular-nums">{envoyees}</span>
                  <span
                    className="mt-1 w-full rounded-t-lg bg-primary-500"
                    style={{ height: `${Math.round((envoyees / maxSemaine) * 80)}%` }}
                  />
                  <span className={`mt-1 text-[0.6875rem] ${SECONDAIRE}`}>
                    {new Date(`${lundi}T12:00:00`).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'numeric',
                    })}
                  </span>
                </li>
              ))}
            </ol>
            <p className={`mt-2 text-xs ${SECONDAIRE}`}>Chaque barre commence un lundi.</p>
          </section>

          {(pays.length > 0 || types.length > 0) && (
            <section aria-label="Ce qui fonctionne" className={`mt-4 ${CARTE}`}>
              <h2 className="font-bold">Ce qui fonctionne</h2>
              <p className={`mt-1 text-sm ${SECONDAIRE}`}>
                Avec peu de candidatures, ces taux varient beaucoup : à lire comme une tendance.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`text-xs ${SECONDAIRE}`}>
                      <td />
                      <th scope="col" className="pr-3 pb-1 text-right font-bold">
                        Envoyées
                      </th>
                      <th scope="col" className="pr-3 pb-1 text-right font-bold">
                        Réponses
                      </th>
                      <th scope="col" className="pr-3 pb-1 text-right font-bold">
                        Entretiens
                      </th>
                      <th scope="col" className="pb-1 text-right font-bold">
                        Taux
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pays.map((ligne) => (
                      <LigneTaux
                        key={`pays-${ligne.groupe}`}
                        nom={
                          <span className="flex items-center gap-1.5">
                            <Flag code={ligne.groupe || null} />
                            {nomPays(ligne.groupe || null) ?? 'Pays inconnu'}
                          </span>
                        }
                        valeurs={ligne.taux}
                      />
                    ))}
                    {types.map((ligne) => (
                      <LigneTaux key={ligne.groupe} nom={ligne.groupe} valeurs={ligne.taux} />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
