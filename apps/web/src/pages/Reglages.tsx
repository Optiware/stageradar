import { LIBELLES_PAYS, PAYS_STAGE, type Poids, type PaysStage } from '@stageradar/shared';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Flag } from '../components/Flag';
import { NotificationsAppareil } from '../components/NotificationsAppareil';
import { useEnregistrerReglages, useReglages, type Reglages as Valeurs } from '../lib/reglages';
import { BOUTON_PRINCIPAL, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

const LIBELLE = 'block text-sm font-bold';
const CRITERES: [keyof Poids, string][] = [
  ['domaine', 'Domaine (dev, cyber, DevOps)'],
  ['periode', 'Période'],
  ['pays', 'Pays'],
  ['niveau', "Niveau d'études"],
  ['langue', 'Langue'],
  ['fraicheur', "Fraîcheur de l'annonce"],
];
const LANGUES: [string, string][] = [
  ['ja', 'Japonais'],
  ['ko', 'Coréen'],
  ['es', 'Espagnol'],
];
const FLECHE =
  'rounded-full p-1.5 text-gray-500 transition hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-800';

function Formulaire({ initiales }: { initiales: Valeurs }) {
  const [valeurs, setValeurs] = useState(initiales);
  const enregistrer = useEnregistrerReglages();
  const { profil, poids, notifications } = valeurs;
  const total = Object.values(poids).reduce((somme, points) => somme + points, 0);
  const autresPays = PAYS_STAGE.filter((pays) => !profil.stage.pays.includes(pays));

  function changerStage(stage: Partial<Valeurs['profil']['stage']>) {
    setValeurs({ ...valeurs, profil: { ...profil, stage: { ...profil.stage, ...stage } } });
  }

  function deplacerPays(rang: number, sens: -1 | 1) {
    const pays = [...profil.stage.pays];
    const cible = rang + sens;
    [pays[rang], pays[cible]] = [pays[cible]!, pays[rang]!];
    changerStage({ pays });
  }

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    if (total !== 100 || profil.stage.pays.length === 0) return;
    enregistrer.mutate(valeurs);
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-4">
      <section aria-label="Stage d'été" className={CARTE}>
        <h2 className="font-bold">Stage d'été</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={LIBELLE}>
            Début
            <input
              type="date"
              required
              value={profil.stage.debut}
              onChange={(evenement) => changerStage({ debut: evenement.target.value })}
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Fin
            <input
              type="date"
              required
              value={profil.stage.fin}
              onChange={(evenement) => changerStage({ fin: evenement.target.value })}
              className={CHAMP}
            />
          </label>
        </div>

        <h3 className="mt-5 text-sm font-bold">Pays, par ordre de préférence</h3>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Le premier rapporte le plus de points. Un pays retiré n'est plus collecté.
        </p>
        <ol className="mt-2 space-y-1.5">
          {profil.stage.pays.map((pays, rang) => (
            <li
              key={pays}
              className="flex items-center gap-2 rounded-2xl border border-gray-200 px-3 py-1.5 text-sm font-bold dark:border-gray-800"
            >
              <span className={`w-5 ${SECONDAIRE}`}>{rang + 1}</span>
              <Flag code={pays} />
              <span className="flex-1">{LIBELLES_PAYS[pays as PaysStage] ?? pays}</span>
              <button
                type="button"
                aria-label={`Monter ${LIBELLES_PAYS[pays as PaysStage] ?? pays}`}
                disabled={rang === 0}
                onClick={() => deplacerPays(rang, -1)}
                className={FLECHE}
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Descendre ${LIBELLES_PAYS[pays as PaysStage] ?? pays}`}
                disabled={rang === profil.stage.pays.length - 1}
                onClick={() => deplacerPays(rang, 1)}
                className={FLECHE}
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() =>
                  changerStage({ pays: profil.stage.pays.filter((autre) => autre !== pays) })
                }
                className="text-xs font-bold text-red-700 underline underline-offset-2 dark:text-red-400"
              >
                Retirer
              </button>
            </li>
          ))}
        </ol>
        {autresPays.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {autresPays.map((pays) => (
              <li key={pays}>
                <button
                  type="button"
                  onClick={() => changerStage({ pays: [...profil.stage.pays, pays] })}
                  className="flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1 text-sm font-bold hover:border-primary-400 dark:border-gray-800"
                >
                  <Flag code={pays} /> Ajouter {LIBELLES_PAYS[pays]}
                </button>
              </li>
            ))}
          </ul>
        )}
        {profil.stage.pays.length === 0 && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            Garde au moins un pays.
          </p>
        )}
      </section>

      <section aria-label="Alternance" className={CARTE}>
        <h2 className="font-bold">Alternance</h2>
        <label className={`mt-3 ${LIBELLE} sm:max-w-xs`}>
          Rentrée visée
          <input
            type="date"
            required
            value={profil.alternance.rentree}
            onChange={(evenement) =>
              setValeurs({
                ...valeurs,
                profil: {
                  ...profil,
                  alternance: { ...profil.alternance, rentree: evenement.target.value },
                },
              })
            }
            className={CHAMP}
          />
        </label>
      </section>

      <section aria-label="Langues" className={CARTE}>
        <h2 className="font-bold">Langues parlées</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          En plus du français et de l'anglais. Une offre qui exige une langue non cochée perd des
          points.
        </p>
        <div className="mt-3 flex flex-wrap gap-4 text-sm">
          {LANGUES.map(([code, nom]) => (
            <label key={code} className="flex items-center gap-2 font-bold">
              <input
                type="checkbox"
                checked={profil.langues.includes(code)}
                onChange={(evenement) =>
                  setValeurs({
                    ...valeurs,
                    profil: {
                      ...profil,
                      langues: evenement.target.checked
                        ? [...profil.langues, code]
                        : profil.langues.filter((autre) => autre !== code),
                    },
                  })
                }
                className="size-4 accent-primary-600"
              />
              {nom}
            </label>
          ))}
        </div>
      </section>

      <section aria-label="Score" className={CARTE}>
        <h2 className="font-bold">Poids du score</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Points que chaque critère peut rapporter. Le total doit faire 100.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {CRITERES.map(([critere, nom]) => (
            <label key={critere} className={LIBELLE}>
              {nom}
              <input
                type="number"
                min={0}
                max={100}
                required
                value={poids[critere]}
                onChange={(evenement) =>
                  setValeurs({
                    ...valeurs,
                    poids: { ...poids, [critere]: Number(evenement.target.value) || 0 },
                  })
                }
                className={CHAMP}
              />
            </label>
          ))}
        </div>
        <p
          role={total === 100 ? undefined : 'alert'}
          className={`mt-3 text-sm font-bold ${
            total === 100
              ? 'text-primary-700 dark:text-primary-400'
              : 'text-red-700 dark:text-red-400'
          }`}
        >
          Total : {total} / 100
        </p>
      </section>

      <section aria-label="Objectif et alertes" className={CARTE}>
        <h2 className="font-bold">Objectif et alertes</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className={LIBELLE}>
            Candidatures visées par semaine
            <input
              type="number"
              min={1}
              max={50}
              required
              value={valeurs.objectif_hebdo}
              onChange={(evenement) =>
                setValeurs({ ...valeurs, objectif_hebdo: Number(evenement.target.value) || 1 })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Score à partir duquel une offre est signalée
            <input
              type="number"
              min={0}
              max={100}
              required
              value={notifications.seuil_push}
              onChange={(evenement) =>
                setValeurs({
                  ...valeurs,
                  notifications: {
                    ...notifications,
                    seuil_push: Number(evenement.target.value) || 0,
                  },
                })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Heures calmes : début
            <input
              type="time"
              required
              value={notifications.heures_calmes.debut}
              onChange={(evenement) =>
                setValeurs({
                  ...valeurs,
                  notifications: {
                    ...notifications,
                    heures_calmes: {
                      ...notifications.heures_calmes,
                      debut: evenement.target.value,
                    },
                  },
                })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Heures calmes : fin
            <input
              type="time"
              required
              value={notifications.heures_calmes.fin}
              onChange={(evenement) =>
                setValeurs({
                  ...valeurs,
                  notifications: {
                    ...notifications,
                    heures_calmes: { ...notifications.heures_calmes, fin: evenement.target.value },
                  },
                })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Heure du résumé du soir (heure de Paris)
            <input
              type="time"
              required
              value={notifications.resume_quotidien.heure}
              onChange={(evenement) =>
                setValeurs({
                  ...valeurs,
                  notifications: {
                    ...notifications,
                    resume_quotidien: {
                      ...notifications.resume_quotidien,
                      heure: evenement.target.value,
                    },
                  },
                })
              }
              className={CHAMP}
            />
          </label>
          <label className="flex items-center gap-2 self-end pb-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={notifications.resume_quotidien.actif}
              onChange={(evenement) =>
                setValeurs({
                  ...valeurs,
                  notifications: {
                    ...notifications,
                    resume_quotidien: {
                      ...notifications.resume_quotidien,
                      actif: evenement.target.checked,
                    },
                  },
                })
              }
              className="size-4 accent-primary-600"
            />
            Recevoir le résumé du soir
          </label>
        </div>
        <p className={`mt-3 text-sm ${SECONDAIRE}`}>
          Pendant les heures calmes, rien n'est envoyé : les alertes attendent la fin de la plage.
        </p>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={enregistrer.isPending || total !== 100 || profil.stage.pays.length === 0}
          className={BOUTON_PRINCIPAL}
        >
          Enregistrer les réglages
        </button>
        {enregistrer.isSuccess && (
          <span role="status" className="text-sm font-bold text-primary-700 dark:text-primary-400">
            Réglages enregistrés. Les scores seront recalculés à la prochaine collecte.
          </span>
        )}
        {enregistrer.isError && (
          <span role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            Les réglages n'ont pas pu être enregistrés.
          </span>
        )}
      </div>
    </form>
  );
}

/** Profil de recherche, poids du score, objectif : ce que la collecte utilise pour trier les offres. */
export function Reglages() {
  const reglages = useReglages();
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Réglages</h1>
      {reglages.isPending && <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>}
      {reglages.isError && (
        <p role="alert" className="mt-8 font-bold text-red-700 dark:text-red-400">
          Les réglages n'ont pas pu être chargés. Vérifie ta connexion.
        </p>
      )}
      <div className="mt-6">
        <NotificationsAppareil />
      </div>
      {reglages.isSuccess && <Formulaire initiales={reglages.data} />}
    </div>
  );
}
