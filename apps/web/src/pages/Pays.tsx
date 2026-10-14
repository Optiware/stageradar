import { jourIso, PAYS_STAGE } from '@stageradar/shared';
import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Flag } from '../components/Flag';
import { RECHERCHES_STAGE } from '../lib/liens-recherche';
import { PISTES } from '../lib/methodes';
import { dateLongue, lienSur, nomPays } from '../lib/offres';
import { useEnregistrerFiche, useFichesPays, type FichePays } from '../lib/pays';
import {
  BADGE,
  BOUTON_PRINCIPAL,
  BOUTON_SECONDAIRE,
  CARTE,
  CHAMP,
  pilule,
  SECONDAIRE,
} from '../lib/ui';

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const LIBELLE = 'block text-sm font-bold';
const SUPPRIMER =
  'shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-red-700 dark:hover:bg-gray-800 dark:hover:text-red-400';

/** Formulaire de correction d'une fiche : notes, liens, échéances, date de vérification. */
function Edition({ fiche, onFermer }: { fiche: FichePays; onFermer: () => void }) {
  const [brouillon, setBrouillon] = useState<FichePays>(fiche);
  const [verifiee, setVerifiee] = useState(false);
  const enregistrer = useEnregistrerFiche();

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    enregistrer.mutate(
      {
        ...brouillon,
        liens: brouillon.liens.filter((lien) => lien.libelle.trim() && lien.url.trim()),
        echeances: brouillon.echeances.filter(
          (echeance) => echeance.libelle.trim() && echeance.date,
        ),
        ...(verifiee
          ? { statut: 'verifie' as const, derniere_verification: jourIso(new Date()) }
          : {}),
      },
      { onSuccess: onFermer },
    );
  }

  return (
    <form onSubmit={soumettre} className="mt-4 space-y-5">
      <label className={LIBELLE}>
        Notes
        <textarea
          rows={10}
          value={brouillon.contenu_md}
          onChange={(evenement) =>
            setBrouillon({ ...brouillon, contenu_md: evenement.target.value })
          }
          className={CHAMP}
        />
      </label>

      <fieldset>
        <legend className={LIBELLE}>Liens</legend>
        {brouillon.liens.map((lien, rang) => (
          <div key={rang} className="mt-2 flex items-center gap-2">
            <input
              aria-label={`Libellé du lien ${rang + 1}`}
              value={lien.libelle}
              placeholder="Libellé"
              onChange={(evenement) =>
                setBrouillon({
                  ...brouillon,
                  liens: brouillon.liens.map((autre, i) =>
                    i === rang ? { ...autre, libelle: evenement.target.value } : autre,
                  ),
                })
              }
              className={`${CHAMP} mt-0`}
            />
            <input
              aria-label={`Adresse du lien ${rang + 1}`}
              type="url"
              value={lien.url}
              placeholder="https://"
              onChange={(evenement) =>
                setBrouillon({
                  ...brouillon,
                  liens: brouillon.liens.map((autre, i) =>
                    i === rang ? { ...autre, url: evenement.target.value.trim() } : autre,
                  ),
                })
              }
              className={`${CHAMP} mt-0`}
            />
            <button
              type="button"
              aria-label={`Supprimer le lien ${rang + 1}`}
              onClick={() =>
                setBrouillon({ ...brouillon, liens: brouillon.liens.filter((_, i) => i !== rang) })
              }
              className={SUPPRIMER}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setBrouillon({ ...brouillon, liens: [...brouillon.liens, { libelle: '', url: '' }] })
          }
          className={`mt-2 flex items-center gap-1.5 text-sm ${LIEN}`}
        >
          <Plus aria-hidden="true" className="size-4" /> Ajouter un lien
        </button>
      </fieldset>

      <fieldset>
        <legend className={LIBELLE}>Échéances</legend>
        {brouillon.echeances.map((echeance, rang) => (
          <div key={rang} className="mt-2 flex items-center gap-2">
            <input
              aria-label={`Libellé de l'échéance ${rang + 1}`}
              value={echeance.libelle}
              placeholder="Ouverture de la saison…"
              onChange={(evenement) =>
                setBrouillon({
                  ...brouillon,
                  echeances: brouillon.echeances.map((autre, i) =>
                    i === rang ? { ...autre, libelle: evenement.target.value } : autre,
                  ),
                })
              }
              className={`${CHAMP} mt-0`}
            />
            <input
              aria-label={`Date de l'échéance ${rang + 1}`}
              type="date"
              value={echeance.date}
              onChange={(evenement) =>
                setBrouillon({
                  ...brouillon,
                  echeances: brouillon.echeances.map((autre, i) =>
                    i === rang ? { ...autre, date: evenement.target.value } : autre,
                  ),
                })
              }
              className={`${CHAMP} mt-0 sm:max-w-44`}
            />
            <button
              type="button"
              aria-label={`Supprimer l'échéance ${rang + 1}`}
              onClick={() =>
                setBrouillon({
                  ...brouillon,
                  echeances: brouillon.echeances.filter((_, i) => i !== rang),
                })
              }
              className={SUPPRIMER}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setBrouillon({
              ...brouillon,
              echeances: [...brouillon.echeances, { libelle: '', date: '' }],
            })
          }
          className={`mt-2 flex items-center gap-1.5 text-sm ${LIEN}`}
        >
          <Plus aria-hidden="true" className="size-4" /> Ajouter une échéance
        </button>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={verifiee}
          onChange={(evenement) => setVerifiee(evenement.target.checked)}
          className="mt-0.5 size-4 accent-primary-600"
        />
        J'ai vérifié cette fiche aujourd'hui sur les sites officiels
      </label>

      {enregistrer.isError && (
        <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
          La fiche n'a pas pu être enregistrée. Vérifie ta connexion.
        </p>
      )}
      <div className="flex gap-3">
        <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
          Enregistrer
        </button>
        <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Fiches des pays visés pour le stage : visa, liens officiels, échéances, recherches d'offres. */
export function Pays() {
  const fiches = useFichesPays();
  const [params, setParams] = useSearchParams();
  const [edition, setEdition] = useState(false);

  const demande = params.get('pays');
  const code = (PAYS_STAGE as readonly string[]).includes(demande ?? '') ? demande! : PAYS_STAGE[0];
  const fiche = fiches.data?.find((autre) => autre.pays === code);
  const recherches = RECHERCHES_STAGE[code] ?? [];
  const pistes = PISTES[code] ?? [];

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Fiches pays</h1>

      <div role="group" aria-label="Pays" className="mt-4 flex flex-wrap gap-2">
        {PAYS_STAGE.map((pays) => (
          <button
            key={pays}
            type="button"
            aria-pressed={pays === code}
            onClick={() => {
              setEdition(false);
              setParams({ pays }, { replace: true });
            }}
            className={`flex items-center gap-1.5 ${pilule(pays === code)}`}
          >
            <Flag code={pays} />
            {nomPays(pays)}
          </button>
        ))}
      </div>

      {fiches.isPending && <p className="mt-8 text-gray-600 dark:text-gray-400">Chargement…</p>}
      {fiches.isError && (
        <p role="alert" className="mt-8 font-bold text-red-700 dark:text-red-400">
          Les fiches n'ont pas pu être chargées. Vérifie ta connexion.
        </p>
      )}
      {fiches.isSuccess && !fiche && (
        <p className="mt-8 text-gray-600 dark:text-gray-400">
          Aucune fiche n'existe encore pour ce pays.
        </p>
      )}

      {fiche && (
        <article aria-label={`Fiche : ${fiche.nom}`} className={`mt-4 ${CARTE}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-xl font-extrabold">
              <Flag code={fiche.pays} />
              {fiche.nom}
            </h2>
            {fiche.statut === 'verifie' ? (
              <span className={BADGE.accent}>
                Vérifiée le {dateLongue(fiche.derniere_verification)}
              </span>
            ) : (
              <span className={BADGE.ambre}>À vérifier</span>
            )}
          </div>
          {fiche.statut === 'a_verifier' && (
            <p className={`mt-2 text-sm ${SECONDAIRE}`}>
              Cette fiche n'a pas été contrôlée sur les sites officiels. Ne t'appuie pas dessus pour
              une démarche : vérifie d'abord, puis corrige-la ici.
            </p>
          )}

          {edition ? (
            <Edition key={fiche.pays} fiche={fiche} onFermer={() => setEdition(false)} />
          ) : (
            <>
              <p className="mt-4 text-sm leading-relaxed break-words whitespace-pre-line">
                {fiche.contenu_md || 'Aucune note pour le moment.'}
              </p>

              <h3 className="mt-6 font-bold">Liens officiels</h3>
              {fiche.liens.length === 0 && (
                <p className={`mt-1 text-sm ${SECONDAIRE}`}>Aucun lien enregistré.</p>
              )}
              <ul className="mt-2 space-y-1.5 text-sm">
                {fiche.liens.map((lien) => {
                  const url = lienSur(lien.url);
                  return (
                    <li key={lien.url + lien.libelle}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className={LIEN}>
                          {lien.libelle}
                        </a>
                      ) : (
                        lien.libelle
                      )}
                    </li>
                  );
                })}
              </ul>

              <h3 className="mt-6 font-bold">Échéances</h3>
              {fiche.echeances.length === 0 && (
                <p className={`mt-1 text-sm ${SECONDAIRE}`}>
                  Aucune échéance enregistrée. Ajoute les dates relevées sur les sites officiels.
                </p>
              )}
              <ul className="mt-2 space-y-1.5 text-sm">
                {[...fiche.echeances]
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((echeance) => (
                    <li key={echeance.date + echeance.libelle} className="flex gap-3">
                      <span className="shrink-0 font-bold">{dateLongue(echeance.date)}</span>
                      <span>{echeance.libelle}</span>
                    </li>
                  ))}
              </ul>

              <button
                type="button"
                onClick={() => setEdition(true)}
                className={`mt-6 ${BOUTON_SECONDAIRE}`}
              >
                Modifier la fiche
              </button>
            </>
          )}
        </article>
      )}

      {pistes.length > 0 && (
        <section aria-label="Pistes pour trouver un stage" className={`mt-4 ${CARTE}`}>
          <h2 className="font-bold">Pistes pour trouver un stage</h2>
          <p className={`mt-1 text-sm ${SECONDAIRE}`}>
            Des pistes, pas des garanties. Quand un fait vient d'une page précise, sa source et sa
            date de lecture sont indiquées.
          </p>
          <ol className="mt-4 space-y-5">
            {pistes.map((piste) => (
              <li key={piste.titre}>
                <h3 className="text-sm font-bold">{piste.titre}</h3>
                <p className="mt-1 text-sm leading-relaxed">{piste.texte}</p>
                {piste.source && (
                  <p className={`mt-1 text-xs ${SECONDAIRE}`}>Source : {piste.source}.</p>
                )}
                {(piste.liens.length > 0 || piste.ecran) && (
                  <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {piste.liens.map((lien) => (
                      <li key={lien.url}>
                        <a
                          href={lien.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={LIEN}
                        >
                          {lien.libelle}
                        </a>
                      </li>
                    ))}
                    {piste.ecran && (
                      <li>
                        <Link to={piste.ecran.vers} className={LIEN}>
                          {piste.ecran.libelle}
                        </Link>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {recherches.length > 0 && (
        <section aria-label="Recherches d'offres" className={`mt-4 ${CARTE}`}>
          <h2 className="font-bold">Chercher aussi ailleurs</h2>
          <p className={`mt-1 text-sm ${SECONDAIRE}`}>
            Ces sites ne peuvent pas être collectés automatiquement : la recherche s'ouvre chez eux.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recherches.map(({ libelle, url }) => (
              <li key={libelle}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3.5 py-1.5 text-sm font-bold text-primary-700 transition hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                >
                  {libelle}
                  <ExternalLink aria-hidden="true" className="size-3.5" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
