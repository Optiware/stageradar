import {
  changerStatut,
  LIBELLES_STATUT,
  STATUTS_SUIVI,
  type StatutSuivi,
} from '@stageradar/shared';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { nomDocument, useDocuments } from '../lib/documents';
import { lienSur, lieu } from '../lib/offres';
import {
  STATUTS_AVANT_ENTRETIEN,
  useEnregistrerCandidature,
  useRetirerCandidature,
  valeursDe,
  type Candidature,
  type ValeursCandidature,
} from '../lib/suivi';
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CHAMP, SECONDAIRE } from '../lib/ui';

const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';
const LIBELLE = 'block text-sm font-bold';

/** Valeur d'un champ « date et heure » (heure de l'appareil) à partir d'une date ISO. */
function versChampLocal(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const deux = (nombre: number) => String(nombre).padStart(2, '0');
  return (
    `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}` +
    `T${deux(date.getHours())}:${deux(date.getMinutes())}`
  );
}

function depuisChampLocal(valeur: string): string | null {
  const date = new Date(valeur);
  return valeur && !Number.isNaN(date.getTime()) ? date.toISOString() : null;
}

/** Fenêtre d'une candidature : colonne, dates, entretien, notes. */
export function CandidatureDialog({
  candidature,
  aujourdhui,
  onFermer,
}: {
  candidature: Candidature;
  /** Jour courant (AAAA-MM-JJ) : sert à dater une candidature et à proposer la relance. */
  aujourdhui: string;
  onFermer: () => void;
}) {
  const fenetre = useRef<HTMLDialogElement>(null);
  const [valeurs, setValeurs] = useState<ValeursCandidature>(() => valeursDe(candidature));
  const [retraitDemande, setRetraitDemande] = useState(false);
  const documents = useDocuments();
  const cvs = (documents.data ?? []).filter((document) => document.type === 'cv');
  const lettres = (documents.data ?? []).filter((document) => document.type !== 'cv');
  const enregistrer = useEnregistrerCandidature();
  const retirer = useRetirerCandidature();
  const offre = candidature.offre;

  useEffect(() => {
    fenetre.current?.showModal();
  }, []);

  function changer(partie: Partial<ValeursCandidature>) {
    setValeurs((actuelles) => ({ ...actuelles, ...partie }));
  }

  function changerColonne(vers: StatutSuivi) {
    setValeurs((actuelles) => ({ ...actuelles, ...changerStatut(actuelles, vers, aujourdhui) }));
  }

  function changerEntretien(valeur: string) {
    const entretien = depuisChampLocal(valeur);
    setValeurs((actuelles) => ({
      ...actuelles,
      // Un entretien fixé fait passer la candidature dans la colonne « Entretien ».
      ...(entretien && STATUTS_AVANT_ENTRETIEN.includes(actuelles.statut)
        ? changerStatut(actuelles, 'entretien', aujourdhui)
        : {}),
      entretien,
    }));
  }

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    enregistrer.mutate({ candidature, valeurs }, { onSuccess: onFermer });
  }

  const annonce = offre && lienSur(offre.url);
  return (
    <dialog
      ref={fenetre}
      onClose={onFermer}
      aria-labelledby="titre-candidature"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(32rem,calc(100vw-2rem))] overflow-y-auto rounded-3xl border border-gray-200 bg-white p-6 text-gray-900 shadow-md backdrop:bg-gray-950/60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100"
    >
      <form onSubmit={soumettre}>
        <h2 id="titre-candidature" className="text-xl leading-tight font-extrabold break-words">
          {candidature.resume.titre}
        </h2>
        <p className={`mt-1 text-sm font-bold ${SECONDAIRE}`}>
          {[candidature.resume.entreprise, lieu(candidature.resume)].filter(Boolean).join(' · ')}
        </p>
        {offre && (
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {offre.actif ? (
              <Link to={`/?offre=${offre.id}`} className={LIEN}>
                Voir l'offre
              </Link>
            ) : (
              <span className={SECONDAIRE}>L'annonce n'est plus en ligne sur sa source.</span>
            )}
            {annonce && (
              <a href={annonce} target="_blank" rel="noopener noreferrer" className={LIEN}>
                Annonce d'origine
              </a>
            )}
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className={`${LIBELLE} sm:col-span-2`}>
            Colonne
            <select
              value={valeurs.statut}
              onChange={(evenement) => changerColonne(evenement.target.value as StatutSuivi)}
              className={CHAMP}
            >
              {STATUTS_SUIVI.map((statut) => (
                <option key={statut} value={statut}>
                  {LIBELLES_STATUT[statut]}
                </option>
              ))}
            </select>
          </label>
          <label className={LIBELLE}>
            Candidature envoyée le
            <input
              type="date"
              value={valeurs.date_candidature ?? ''}
              onChange={(evenement) =>
                changer({ date_candidature: evenement.target.value || null })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Prochaine relance
            <input
              type="date"
              value={valeurs.prochaine_relance ?? ''}
              onChange={(evenement) =>
                changer({ prochaine_relance: evenement.target.value || null })
              }
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Entretien (date et heure)
            <input
              type="datetime-local"
              value={versChampLocal(valeurs.entretien)}
              onChange={(evenement) => changerEntretien(evenement.target.value)}
              className={CHAMP}
            />
          </label>
          <label className={LIBELLE}>
            Lien de la visio
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={valeurs.lien_entretien ?? ''}
              onChange={(evenement) =>
                changer({ lien_entretien: evenement.target.value.trim() || null })
              }
              className={CHAMP}
            />
          </label>
          {cvs.length > 0 && (
            <label className={LIBELLE}>
              CV envoyé
              <select
                value={valeurs.cv_document_id ?? ''}
                onChange={(evenement) =>
                  changer({ cv_document_id: evenement.target.value || null })
                }
                className={CHAMP}
              >
                <option value="">Non précisé</option>
                {cvs.map((document) => (
                  <option key={document.id} value={document.id}>
                    {nomDocument(document)}
                  </option>
                ))}
              </select>
            </label>
          )}
          {lettres.length > 0 && (
            <label className={LIBELLE}>
              Lettre envoyée
              <select
                value={valeurs.lettre_document_id ?? ''}
                onChange={(evenement) =>
                  changer({ lettre_document_id: evenement.target.value || null })
                }
                className={CHAMP}
              >
                <option value="">Aucune ou non précisée</option>
                {lettres.map((document) => (
                  <option key={document.id} value={document.id}>
                    {nomDocument(document)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className={`${LIBELLE} sm:col-span-2`}>
            Notes
            <textarea
              rows={3}
              value={valeurs.notes ?? ''}
              onChange={(evenement) => changer({ notes: evenement.target.value || null })}
              className={CHAMP}
            />
          </label>
        </div>

        {(enregistrer.isError || retirer.isError) && (
          <p role="alert" className="mt-4 text-sm font-bold text-red-700 dark:text-red-400">
            L'enregistrement a échoué. Vérifie ta connexion et réessaie.
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={enregistrer.isPending} className={BOUTON_PRINCIPAL}>
            Enregistrer
          </button>
          <button type="button" onClick={onFermer} className={BOUTON_SECONDAIRE}>
            Fermer
          </button>
          {retraitDemande ? (
            <button
              type="button"
              disabled={retirer.isPending}
              onClick={() => retirer.mutate(candidature.id, { onSuccess: onFermer })}
              className="ml-auto rounded-2xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              Confirmer le retrait
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRetraitDemande(true)}
              className="ml-auto px-2 text-sm font-bold text-red-700 underline underline-offset-2 dark:text-red-400"
            >
              Retirer du suivi
            </button>
          )}
        </div>
      </form>
    </dialog>
  );
}
