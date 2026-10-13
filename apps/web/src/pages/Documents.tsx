import { Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  LANGUES_DOCUMENT,
  LIBELLES_TYPE_DOCUMENT,
  nomDocument,
  useAjouterDocument,
  useDocuments,
  useSupprimerDocument,
  type ChampsDocument,
} from '../lib/documents';
import { lienSur } from '../lib/offres';
import { BOUTON_PRINCIPAL, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

const LIBELLE = 'block text-sm font-bold';
const VIDE: ChampsDocument = {
  type: 'cv',
  langue: 'en',
  titre: '',
  version: 1,
  chemin_stockage: null,
  notes: null,
};

/** Versions de CV et de lettres : pour savoir laquelle a été envoyée à qui. */
export function Documents() {
  const documents = useDocuments();
  const ajouter = useAjouterDocument();
  const supprimer = useSupprimerDocument();
  const [champs, setChamps] = useState<ChampsDocument>(VIDE);

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    if (!champs.titre.trim()) return;
    ajouter.mutate(
      { ...champs, titre: champs.titre.trim() },
      { onSuccess: () => setChamps({ ...VIDE, type: champs.type, langue: champs.langue }) },
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Documents</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Note ici chaque version de ton CV et de tes lettres. Dans le suivi, tu indiques ensuite
        laquelle est partie avec chaque candidature. Les fichiers restent là où tu les ranges.
      </p>

      <form onSubmit={soumettre} className={`mt-6 grid gap-4 sm:grid-cols-2 ${CARTE}`}>
        <h2 className="font-bold sm:col-span-2">Nouveau document</h2>
        <label className={LIBELLE}>
          Type
          <select
            value={champs.type}
            onChange={(evenement) =>
              setChamps({ ...champs, type: evenement.target.value as ChampsDocument['type'] })
            }
            className={CHAMP}
          >
            {Object.entries(LIBELLES_TYPE_DOCUMENT).map(([type, nom]) => (
              <option key={type} value={type}>
                {nom}
              </option>
            ))}
          </select>
        </label>
        <label className={LIBELLE}>
          Langue
          <select
            value={champs.langue ?? ''}
            onChange={(evenement) =>
              setChamps({ ...champs, langue: evenement.target.value || null })
            }
            className={CHAMP}
          >
            {LANGUES_DOCUMENT.map(([code, nom]) => (
              <option key={code} value={code}>
                {nom}
              </option>
            ))}
          </select>
        </label>
        <label className={LIBELLE}>
          Titre
          <input
            required
            value={champs.titre}
            placeholder="Développeur backend"
            onChange={(evenement) => setChamps({ ...champs, titre: evenement.target.value })}
            className={CHAMP}
          />
        </label>
        <label className={LIBELLE}>
          Version
          <input
            type="number"
            min={1}
            required
            value={champs.version}
            onChange={(evenement) =>
              setChamps({ ...champs, version: Math.max(1, Number(evenement.target.value) || 1) })
            }
            className={CHAMP}
          />
        </label>
        <label className={`${LIBELLE} sm:col-span-2`}>
          Adresse du fichier, s'il est en ligne
          <input
            type="url"
            placeholder="https://"
            value={champs.chemin_stockage ?? ''}
            onChange={(evenement) =>
              setChamps({ ...champs, chemin_stockage: evenement.target.value.trim() || null })
            }
            className={CHAMP}
          />
        </label>
        <label className={`${LIBELLE} sm:col-span-2`}>
          Notes
          <input
            value={champs.notes ?? ''}
            placeholder="Ce qui change dans cette version"
            onChange={(evenement) =>
              setChamps({ ...champs, notes: evenement.target.value || null })
            }
            className={CHAMP}
          />
        </label>
        {ajouter.isError && (
          <p
            role="alert"
            className="text-sm font-bold text-red-700 sm:col-span-2 dark:text-red-400"
          >
            Le document n'a pas pu être enregistré. Vérifie ta connexion.
          </p>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={ajouter.isPending} className={BOUTON_PRINCIPAL}>
            Ajouter le document
          </button>
        </div>
      </form>

      {documents.isPending && <p className="mt-6 text-gray-600 dark:text-gray-400">Chargement…</p>}
      {documents.isError && (
        <p role="alert" className="mt-6 font-bold text-red-700 dark:text-red-400">
          Les documents n'ont pas pu être chargés. Vérifie ta connexion.
        </p>
      )}
      {documents.isSuccess && documents.data.length === 0 && (
        <p className="mt-6 text-gray-600 dark:text-gray-400">Aucun document pour le moment.</p>
      )}
      <ul className="mt-4 space-y-3">
        {(documents.data ?? []).map((document) => {
          const adresse = document.chemin_stockage ? lienSur(document.chemin_stockage) : null;
          return (
            <li key={document.id} className={`flex items-start justify-between gap-3 ${CARTE}`}>
              <div className="min-w-0">
                <p className="font-bold break-words">{nomDocument(document)}</p>
                {document.notes && (
                  <p className={`mt-1 text-sm break-words ${SECONDAIRE}`}>{document.notes}</p>
                )}
                {adresse && (
                  <a
                    href={adresse}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400"
                  >
                    Ouvrir le fichier
                  </a>
                )}
              </div>
              <button
                type="button"
                aria-label={`Supprimer ${nomDocument(document)}`}
                disabled={supprimer.isPending}
                onClick={() => supprimer.mutate(document.id)}
                className="shrink-0 rounded-full p-2 text-gray-500 transition hover:bg-gray-100 hover:text-red-700 dark:hover:bg-gray-800 dark:hover:text-red-400"
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
