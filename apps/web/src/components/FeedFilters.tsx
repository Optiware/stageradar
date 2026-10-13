import { DOMAINES, type Domaine } from '@stageradar/shared';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { estNouvelle, LIBELLES_DOMAINE, LIBELLES_TELETRAVAIL, type FeedOffer } from '../lib/offres';
import { CARTE, pilule } from '../lib/ui';

type Organisation = NonNullable<FeedOffer['teletravail']>;

export interface Filtres {
  domaines: Domaine[];
  organisations: Organisation[];
  scoreMin: number;
  sansLangueExigee: boolean;
  nouvelles: boolean;
}

export const AUCUN_FILTRE: Filtres = {
  domaines: [],
  organisations: [],
  scoreMin: 0,
  sansLangueExigee: false,
  nouvelles: false,
};

const ORGANISATIONS: Organisation[] = ['remote', 'hybride', 'sur_site'];
const SCORES = [0, 50, 75];

export function nombreDeFiltres(filtres: Filtres): number {
  return (
    filtres.domaines.length +
    filtres.organisations.length +
    (filtres.scoreMin > 0 ? 1 : 0) +
    (filtres.sansLangueExigee ? 1 : 0) +
    (filtres.nouvelles ? 1 : 0)
  );
}

/** Vrai si l'offre passe tous les filtres choisis. */
export function passeLesFiltres(offre: FeedOffer, filtres: Filtres, maintenant: number): boolean {
  if (
    filtres.domaines.length > 0 &&
    !filtres.domaines.some((domaine) => offre.domaines.includes(domaine))
  ) {
    return false;
  }
  if (
    filtres.organisations.length > 0 &&
    !(offre.teletravail && filtres.organisations.includes(offre.teletravail))
  ) {
    return false;
  }
  if ((offre.score ?? 0) < filtres.scoreMin) return false;
  if (filtres.sansLangueExigee && offre.langues_requises.length > 0) return false;
  if (filtres.nouvelles && !estNouvelle(offre, maintenant)) return false;
  return true;
}

function basculer<T>(liste: T[], valeur: T): T[] {
  return liste.includes(valeur) ? liste.filter((autre) => autre !== valeur) : [...liste, valeur];
}

/** Filtres secondaires du fil, repliés par défaut pour laisser la place aux offres. */
export function FeedFilters({
  filtres,
  onChange,
}: {
  filtres: Filtres;
  onChange: (filtres: Filtres) => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const actifs = nombreDeFiltres(filtres);

  return (
    <div className="mt-3">
      <button
        type="button"
        aria-expanded={ouvert}
        onClick={() => setOuvert(!ouvert)}
        className={`flex items-center gap-2 ${pilule(actifs > 0)}`}
      >
        <SlidersHorizontal aria-hidden="true" className="size-4" />
        Filtres{actifs > 0 ? ` (${actifs})` : ''}
      </button>

      {ouvert && (
        <div role="group" aria-label="Filtres" className={`mt-2 space-y-4 ${CARTE}`}>
          <div>
            <p className="text-sm font-bold">Domaine</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DOMAINES.map((domaine) => (
                <button
                  key={domaine}
                  type="button"
                  aria-pressed={filtres.domaines.includes(domaine)}
                  onClick={() =>
                    onChange({ ...filtres, domaines: basculer(filtres.domaines, domaine) })
                  }
                  className={pilule(filtres.domaines.includes(domaine))}
                >
                  {LIBELLES_DOMAINE[domaine]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold">Organisation</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ORGANISATIONS.map((organisation) => (
                <button
                  key={organisation}
                  type="button"
                  aria-pressed={filtres.organisations.includes(organisation)}
                  onClick={() =>
                    onChange({
                      ...filtres,
                      organisations: basculer(filtres.organisations, organisation),
                    })
                  }
                  className={pilule(filtres.organisations.includes(organisation))}
                >
                  {LIBELLES_TELETRAVAIL[organisation]}
                </button>
              ))}
            </div>
          </div>

          <label className="block text-sm font-bold">
            Score minimum
            <select
              value={filtres.scoreMin}
              onChange={(evenement) =>
                onChange({ ...filtres, scoreMin: Number(evenement.target.value) })
              }
              className="mt-1.5 block rounded-2xl border border-gray-300 bg-white px-4 py-2 text-base dark:border-gray-700 dark:bg-gray-950"
            >
              {SCORES.map((score) => (
                <option key={score} value={score}>
                  {score === 0 ? 'Tous les scores' : `${score} et plus`}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.sansLangueExigee}
              onChange={(evenement) =>
                onChange({ ...filtres, sansLangueExigee: evenement.target.checked })
              }
              className="size-4 accent-primary-600"
            />
            Sans japonais, coréen ni espagnol exigé
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filtres.nouvelles}
              onChange={(evenement) =>
                onChange({ ...filtres, nouvelles: evenement.target.checked })
              }
              className="size-4 accent-primary-600"
            />
            Nouvelles seulement (deux derniers jours)
          </label>

          {actifs > 0 && (
            <button
              type="button"
              onClick={() => onChange(AUCUN_FILTRE)}
              className="text-sm font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
            >
              Effacer les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}
