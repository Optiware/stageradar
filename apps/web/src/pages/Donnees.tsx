import { jourIso } from '@stageradar/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { candidaturesEnCsv, estSauvegarde, exporter, importer } from '../lib/donnees';
import { useCandidatures } from '../lib/suivi';
import { telecharger } from '../lib/telechargement';
import { BOUTON_SECONDAIRE, CARTE, SECONDAIRE } from '../lib/ui';

const BOUTON = `flex items-center gap-2 ${BOUTON_SECONDAIRE}`;

/** Export et réimport de tout ce qui a été saisi dans l'application. */
export function Donnees() {
  const client = useQueryClient();
  const candidatures = useCandidatures();
  const fichier = useRef<HTMLInputElement>(null);
  const [refus, setRefus] = useState(false);

  const sauvegarder = useMutation({
    mutationFn: async () => {
      const sauvegarde = await exporter();
      telecharger(
        `stageradar-${jourIso(new Date())}.json`,
        JSON.stringify(sauvegarde, null, 2),
        'application/json',
      );
    },
  });

  const restaurer = useMutation({
    mutationFn: async (choisi: File) => {
      let contenu: unknown;
      try {
        contenu = JSON.parse(await choisi.text());
      } catch {
        contenu = null;
      }
      if (!estSauvegarde(contenu)) {
        setRefus(true);
        throw new Error('fichier non reconnu');
      }
      setRefus(false);
      await importer(contenu);
    },
    // Tout ce qui est affiché peut avoir changé.
    onSuccess: () => client.invalidateQueries(),
  });

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Mes données</h1>

      <section aria-label="Sauvegarde" className={`mt-6 ${CARTE}`}>
        <h2 className="font-bold">Sauvegarde complète</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Un fichier avec tes candidatures, tes entreprises, tes notes, tes fiches pays et tes
          réglages. Il contient des données personnelles : garde-le dans un endroit sûr.
        </p>
        <button
          type="button"
          disabled={sauvegarder.isPending}
          onClick={() => sauvegarder.mutate()}
          className={`mt-3 ${BOUTON}`}
        >
          <Download aria-hidden="true" className="size-4" /> Télécharger la sauvegarde (.json)
        </button>
        {sauvegarder.isError && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            La sauvegarde n'a pas pu être préparée. Vérifie ta connexion.
          </p>
        )}
      </section>

      <section aria-label="Tableur" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Candidatures pour un tableur</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Une ligne par candidature, à ouvrir dans Excel ou LibreOffice.
        </p>
        <button
          type="button"
          disabled={!candidatures.isSuccess}
          onClick={() =>
            telecharger(
              `candidatures-${jourIso(new Date())}.csv`,
              candidaturesEnCsv(candidatures.data ?? []),
              'text/csv;charset=utf-8',
            )
          }
          className={`mt-3 ${BOUTON}`}
        >
          <Download aria-hidden="true" className="size-4" /> Télécharger les candidatures (.csv)
        </button>
      </section>

      <section aria-label="Restauration" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Réimporter une sauvegarde</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Chaque élément du fichier remplace celui du même identifiant. Rien n'est supprimé : ce que
          tu as ajouté depuis la sauvegarde est conservé.
        </p>
        <input
          ref={fichier}
          type="file"
          accept="application/json,.json"
          aria-label="Fichier de sauvegarde"
          className="sr-only"
          onChange={(evenement) => {
            const choisi = evenement.target.files?.[0];
            if (choisi) restaurer.mutate(choisi);
            evenement.target.value = '';
          }}
        />
        <button
          type="button"
          disabled={restaurer.isPending}
          onClick={() => fichier.current?.click()}
          className={`mt-3 ${BOUTON}`}
        >
          <Upload aria-hidden="true" className="size-4" /> Choisir un fichier de sauvegarde
        </button>
        {restaurer.isPending && (
          <p role="status" className={`mt-2 text-sm ${SECONDAIRE}`}>
            Réimport en cours…
          </p>
        )}
        {restaurer.isSuccess && (
          <p
            role="status"
            className="mt-2 text-sm font-bold text-primary-700 dark:text-primary-400"
          >
            Sauvegarde réimportée.
          </p>
        )}
        {restaurer.isError && (
          <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
            {refus
              ? "Ce fichier n'est pas une sauvegarde de StageRadar."
              : "Le réimport a échoué en cours de route. Vérifie ta connexion et recommence : l'opération peut être rejouée sans risque."}
          </p>
        )}
      </section>
    </div>
  );
}
