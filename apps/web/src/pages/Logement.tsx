import {
  LIGNES_BUDGET_DEFAUT,
  moisDeSejour,
  PAYS_STAGE,
  totalBudget,
  type LigneBudget,
} from '@stageradar/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router';
import { Flag } from '../components/Flag';
import {
  COUT_DE_LA_VIE,
  DEVISES,
  LIBELLES_STATUT_LOGEMENT,
  SITES_LOGEMENT,
  STATUTS_LOGEMENT,
  useAjouterLogement,
  useBudgets,
  useEnregistrerBudget,
  useLogements,
  useModifierLogement,
  useSupprimerLogement,
  type Budget,
  type ChampsLogement,
  type StatutLogement,
} from '../lib/logement';
import { lienSur, nomPays } from '../lib/offres';
import { useReglages } from '../lib/reglages';
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CARTE, CHAMP, pilule, SECONDAIRE } from '../lib/ui';

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const LIBELLE = 'block text-sm font-bold';
const PAYS: readonly string[] = [...PAYS_STAGE, 'FR'];
const SUPPRIMER =
  'shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-red-700 dark:hover:bg-gray-800 dark:hover:text-red-400';

function montant(valeur: number, devise: string): string {
  try {
    return valeur.toLocaleString('fr-FR', {
      style: 'currency',
      currency: devise,
      maximumFractionDigits: 0,
    });
  } catch {
    // Devise inconnue du navigateur : le nombre seul, suivi du code.
    return `${valeur.toLocaleString('fr-FR')} ${devise}`;
  }
}

/** Budget d'un pays : chaque montant est saisi par l'utilisateur. */
function BudgetPays({ budget, mois }: { budget: Budget; mois: number }) {
  const [brouillon, setBrouillon] = useState(budget);
  const enregistrer = useEnregistrerBudget();
  const total = totalBudget(brouillon.lignes, mois);
  const changerLigne = (rang: number, partie: Partial<LigneBudget>) =>
    setBrouillon({
      ...brouillon,
      lignes: brouillon.lignes.map((ligne, i) => (i === rang ? { ...ligne, ...partie } : ligne)),
    });

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    enregistrer.mutate({
      ...brouillon,
      lignes: brouillon.lignes.filter((ligne) => ligne.libelle.trim()),
    });
  }

  return (
    <form onSubmit={soumettre} aria-label="Budget" className={`mt-4 ${CARTE}`}>
      <h2 className="font-bold">Budget estimé</h2>
      <p className={`mt-1 text-sm ${SECONDAIRE}`}>
        L'application ne fournit aucun prix : remplis chaque ligne avec ce que tu as relevé.{' '}
        <a href={COUT_DE_LA_VIE.url} target="_blank" rel="noopener noreferrer" className={LIEN}>
          {COUT_DE_LA_VIE.libelle}
        </a>{' '}
        donne un ordre de grandeur, d'après ce que déclarent des habitants.
      </p>

      <label className={`mt-4 ${LIBELLE} max-w-40`}>
        Devise
        <input
          required
          maxLength={3}
          pattern="[A-Za-z]{3}"
          value={brouillon.devise}
          onChange={(evenement) =>
            setBrouillon({ ...brouillon, devise: evenement.target.value.toUpperCase() })
          }
          className={CHAMP}
        />
      </label>

      <ul className="mt-4 space-y-2">
        {brouillon.lignes.map((ligne, rang) => (
          <li key={rang} className="flex flex-wrap items-center gap-2">
            <input
              aria-label={`Libellé de la ligne ${rang + 1}`}
              value={ligne.libelle}
              onChange={(evenement) => changerLigne(rang, { libelle: evenement.target.value })}
              className={`${CHAMP} mt-0 min-w-40 flex-1`}
            />
            <input
              aria-label={`Montant : ${ligne.libelle || `ligne ${rang + 1}`}`}
              type="number"
              min={0}
              step="any"
              value={ligne.montant || ''}
              placeholder="0"
              onChange={(evenement) =>
                changerLigne(rang, { montant: Number(evenement.target.value) || 0 })
              }
              className={`${CHAMP} mt-0 w-32`}
            />
            <label className={`flex items-center gap-1.5 text-xs ${SECONDAIRE}`}>
              <input
                type="checkbox"
                checked={ligne.ponctuel}
                onChange={(evenement) => changerLigne(rang, { ponctuel: evenement.target.checked })}
                className="size-4 accent-primary-600"
              />
              Une seule fois
            </label>
            <button
              type="button"
              aria-label={`Supprimer la ligne ${ligne.libelle || rang + 1}`}
              onClick={() =>
                setBrouillon({
                  ...brouillon,
                  lignes: brouillon.lignes.filter((_, i) => i !== rang),
                })
              }
              className={SUPPRIMER}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() =>
          setBrouillon({
            ...brouillon,
            lignes: [...brouillon.lignes, { libelle: '', montant: 0, ponctuel: false }],
          })
        }
        className={`mt-2 flex items-center gap-1.5 text-sm ${LIEN}`}
      >
        <Plus aria-hidden="true" className="size-4" /> Ajouter une ligne
      </button>

      <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 text-sm">
        <dt className={SECONDAIRE}>Par mois</dt>
        <dd className="font-bold">{montant(total.mensuel, brouillon.devise)}</dd>
        <dt className={SECONDAIRE}>Une seule fois</dt>
        <dd className="font-bold">{montant(total.ponctuel, brouillon.devise)}</dd>
        <dt className={SECONDAIRE}>Séjour de {mois} mois</dt>
        <dd className="text-lg font-extrabold">{montant(total.sejour, brouillon.devise)}</dd>
      </dl>

      <div className="mt-4 flex items-center gap-3">
        <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
          Enregistrer le budget
        </button>
        {enregistrer.isSuccess && (
          <span role="status" className="text-sm font-bold text-primary-700 dark:text-primary-400">
            Budget enregistré.
          </span>
        )}
        {enregistrer.isError && (
          <span role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            Le budget n'a pas pu être enregistré.
          </span>
        )}
      </div>
    </form>
  );
}

function NouveauLogement({ pays, onFermer }: { pays: string; onFermer: () => void }) {
  const ajouter = useAjouterLogement();
  const [champs, setChamps] = useState<ChampsLogement>({
    pays,
    ville: null,
    titre: '',
    url: null,
    prix_mensuel: null,
    devise: DEVISES[pays] ?? 'EUR',
    quartier: null,
    trajet_min: null,
    statut: 'repere',
    notes: null,
  });
  const texte = (cle: 'titre' | 'ville' | 'url' | 'quartier' | 'notes') => ({
    value: champs[cle] ?? '',
    onChange: (evenement: { target: { value: string } }) =>
      setChamps({ ...champs, [cle]: evenement.target.value || (cle === 'titre' ? '' : null) }),
    className: CHAMP,
  });

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    if (!champs.titre.trim()) return;
    ajouter.mutate({ ...champs, titre: champs.titre.trim() }, { onSuccess: onFermer });
  }

  return (
    <form onSubmit={soumettre} className={`mt-3 grid gap-4 sm:grid-cols-2 ${CARTE}`}>
      <label className={`${LIBELLE} sm:col-span-2`}>
        Nom du logement
        <input required placeholder="Chambre en colocation, Shibuya" {...texte('titre')} />
      </label>
      <label className={`${LIBELLE} sm:col-span-2`}>
        Lien de l'annonce
        <input type="url" placeholder="https://" {...texte('url')} />
      </label>
      <label className={LIBELLE}>
        Ville
        <input {...texte('ville')} />
      </label>
      <label className={LIBELLE}>
        Quartier
        <input {...texte('quartier')} />
      </label>
      <label className={LIBELLE}>
        Loyer par mois ({champs.devise})
        <input
          type="number"
          min={0}
          step="any"
          value={champs.prix_mensuel ?? ''}
          onChange={(evenement) =>
            setChamps({
              ...champs,
              prix_mensuel: evenement.target.value === '' ? null : Number(evenement.target.value),
            })
          }
          className={CHAMP}
        />
      </label>
      <label className={LIBELLE}>
        Trajet jusqu'au stage (minutes)
        <input
          type="number"
          min={0}
          value={champs.trajet_min ?? ''}
          onChange={(evenement) =>
            setChamps({
              ...champs,
              trajet_min: evenement.target.value === '' ? null : Number(evenement.target.value),
            })
          }
          className={CHAMP}
        />
      </label>
      <label className={`${LIBELLE} sm:col-span-2`}>
        Notes
        <input {...texte('notes')} />
      </label>
      {ajouter.isError && (
        <p role="alert" className="text-sm font-bold text-red-700 sm:col-span-2 dark:text-red-400">
          Le logement n'a pas pu être enregistré. Vérifie ta connexion.
        </p>
      )}
      <div className="flex gap-3 sm:col-span-2">
        <button type="submit" disabled={ajouter.isPending} className={BOUTON_PRINCIPAL}>
          Ajouter le logement
        </button>
        <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
          Annuler
        </button>
      </div>
    </form>
  );
}

/** Logement et budget par pays : où chercher, ce qui a été repéré, ce que le séjour coûterait. */
export function Logement() {
  const logements = useLogements();
  const budgets = useBudgets();
  const reglages = useReglages();
  const modifier = useModifierLogement();
  const supprimer = useSupprimerLogement();
  const [params, setParams] = useSearchParams();
  const [ajout, setAjout] = useState(false);

  const demande = params.get('pays');
  const pays = PAYS.includes(demande ?? '') ? demande! : PAYS[0]!;
  const duPays = (logements.data ?? []).filter((logement) => logement.pays === pays);
  const budget = budgets.data?.find((autre) => autre.pays === pays) ?? {
    pays,
    devise: DEVISES[pays] ?? 'EUR',
    lignes: LIGNES_BUDGET_DEFAUT,
  };
  // Un stage dure l'été ; une alternance se compte sur douze mois.
  const mois =
    pays === 'FR'
      ? 12
      : reglages.data
        ? moisDeSejour(reglages.data.profil.stage.debut, reglages.data.profil.stage.fin)
        : 3;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Logement et budget</h1>

      <div role="group" aria-label="Pays" className="mt-4 flex flex-wrap gap-2">
        {PAYS.map((code) => (
          <button
            key={code}
            type="button"
            aria-pressed={code === pays}
            onClick={() => {
              setAjout(false);
              setParams({ pays: code }, { replace: true });
            }}
            className={`flex items-center gap-1.5 ${pilule(code === pays)}`}
          >
            <Flag code={code} />
            {nomPays(code)}
          </button>
        ))}
      </div>

      <section aria-label="Où chercher" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Où chercher</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          {pays === 'FR'
            ? "Pour une alternance, un logement à l'année. La recherche s'ouvre sur chaque site."
            : `Pour un séjour de ${mois} mois : colocations et locations meublées de courte durée. La recherche s'ouvre sur chaque site.`}
        </p>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {(SITES_LOGEMENT[pays] ?? []).map((site) => (
            <li key={site.url + site.libelle}>
              <a href={site.url} target="_blank" rel="noopener noreferrer" className={LIEN}>
                {site.libelle}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Logements repérés" className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-extrabold">Logements repérés</h2>
          {!ajout && (
            <button
              type="button"
              onClick={() => setAjout(true)}
              className={`flex items-center gap-2 ${BOUTON_SECONDAIRE} bg-white dark:bg-gray-900`}
            >
              <Plus aria-hidden="true" className="size-4" /> Ajouter un logement
            </button>
          )}
        </div>
        {ajout && <NouveauLogement key={pays} pays={pays} onFermer={() => setAjout(false)} />}

        {logements.isError && (
          <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
            Les logements n'ont pas pu être chargés. Vérifie ta connexion.
          </p>
        )}
        {logements.isSuccess && duPays.length === 0 && !ajout && (
          <p className="mt-3 text-gray-600 dark:text-gray-400">Aucun logement noté pour ce pays.</p>
        )}
        <ul className="mt-3 space-y-3">
          {duPays.map((logement) => {
            const lien = logement.url ? lienSur(logement.url) : null;
            return (
              <li key={logement.id}>
                <article aria-label={logement.titre} className={CARTE}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-bold break-words">{logement.titre}</h3>
                    <button
                      type="button"
                      aria-label={`Supprimer ${logement.titre}`}
                      disabled={supprimer.isPending}
                      onClick={() => supprimer.mutate(logement.id)}
                      className={SUPPRIMER}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </button>
                  </div>
                  <p className={`mt-1 text-sm ${SECONDAIRE}`}>
                    {[
                      [logement.quartier, logement.ville].filter(Boolean).join(', '),
                      logement.prix_mensuel !== null
                        ? `${montant(logement.prix_mensuel, logement.devise ?? 'EUR')} par mois`
                        : null,
                      logement.trajet_min !== null ? `${logement.trajet_min} min de trajet` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {logement.notes && <p className="mt-1 text-sm break-words">{logement.notes}</p>}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="text-sm font-bold">
                      <span className="sr-only">Statut de « {logement.titre} »</span>
                      <select
                        value={logement.statut}
                        onChange={(evenement) =>
                          modifier.mutate({
                            id: logement.id,
                            statut: evenement.target.value as StatutLogement,
                          })
                        }
                        className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 text-sm font-bold dark:border-gray-700 dark:bg-gray-900"
                      >
                        {STATUTS_LOGEMENT.map((statut) => (
                          <option key={statut} value={statut}>
                            {LIBELLES_STATUT_LOGEMENT[statut]}
                          </option>
                        ))}
                      </select>
                    </label>
                    {lien && (
                      <a
                        href={lien}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm ${LIEN}`}
                      >
                        Voir l'annonce
                      </a>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>

      {budgets.isSuccess && <BudgetPays key={pays} budget={budget} mois={mois} />}
      {budgets.isError && (
        <p role="alert" className="mt-4 font-bold text-red-700 dark:text-red-400">
          Le budget n'a pas pu être chargé. Vérifie ta connexion.
        </p>
      )}
    </div>
  );
}
