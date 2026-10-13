import { adresseDans, lectureInterdite } from '@stageradar/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { appelerApi, ErreurApi, type ResultatImport } from '../lib/api';
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP, SECONDAIRE } from '../lib/ui';

const LIBELLE = 'block text-sm font-bold';
const LIEN = 'font-bold text-primary-700 underline underline-offset-2 dark:text-primary-400';

const ORIGINES: Record<ResultatImport['origine'], string> = {
  page: "Les informations ont été lues sur la page de l'annonce.",
  partage:
    "Ce site interdit la lecture automatique : l'offre est créée avec son adresse et le texte fourni. Complète-la par une note si besoin.",
  illisible: "La page n'a pas pu être lue : l'offre est créée avec son adresse et le texte fourni.",
};

/**
 * Petit programme à enregistrer comme favori : sur la page d'une annonce, il ouvre cet écran
 * avec l'adresse et le titre déjà remplis.
 */
function favori(): string {
  const base = `${window.location.origin}/importer`;
  return `javascript:location.href='${base}?url='+encodeURIComponent(location.href)+'&titre='+encodeURIComponent(document.title)`;
}

/**
 * Ajout d'une offre trouvée ailleurs : par son adresse, par le bouton « Partager » d'Android
 * (l'application installée figure parmi les cibles) ou par un favori du navigateur.
 */
export function Importer() {
  const client = useQueryClient();
  const [params] = useSearchParams();
  // Le partage Android arrive dans l'adresse : ?titre=…&texte=…&url=…
  const partageTexte = params.get('texte') ?? '';
  const [url, setUrl] = useState(
    params.get('url') ?? adresseDans(partageTexte) ?? adresseDans(params.get('titre')) ?? '',
  );
  const [titre, setTitre] = useState(params.get('titre') ?? '');
  const [texte, setTexte] = useState(partageTexte);
  const [copie, setCopie] = useState(false);

  const importer = useMutation({
    mutationFn: () =>
      appelerApi<ResultatImport>('/importer', {
        url: url.trim(),
        titre: titre.trim() || null,
        texte: texte.trim() || null,
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['offers'] }),
  });

  function soumettre(evenement: FormEvent) {
    evenement.preventDefault();
    if (url.trim()) importer.mutate();
  }

  const sansLecture =
    url.trim() !== '' && /^https?:\/\//i.test(url.trim()) && lectureInterdite(url);
  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-extrabold tracking-tight">Importer une offre</h1>
      <p className="mt-1 text-gray-600 dark:text-gray-400">
        Pour une offre trouvée ailleurs. Colle son adresse : l'application lit la page et remplit
        l'offre, qui rejoint le fil avec son score.
      </p>

      <form onSubmit={soumettre} className={`mt-6 space-y-4 ${CARTE}`}>
        <label className={LIBELLE}>
          Adresse de l'annonce
          <input
            type="url"
            required
            placeholder="https://"
            value={url}
            onChange={(evenement) => setUrl(evenement.target.value)}
            className={CHAMP}
          />
        </label>
        {sansLecture && (
          <p className="text-sm font-bold text-amber-700 dark:text-amber-400">
            Ce site interdit la lecture automatique. L'offre sera créée avec le titre et le texte
            ci-dessous : remplis-les.
          </p>
        )}
        <label className={LIBELLE}>
          Titre (facultatif si la page peut être lue)
          <input
            value={titre}
            onChange={(evenement) => setTitre(evenement.target.value)}
            className={CHAMP}
          />
        </label>
        <label className={LIBELLE}>
          Texte ou notes (facultatif)
          <textarea
            rows={3}
            value={texte}
            onChange={(evenement) => setTexte(evenement.target.value)}
            className={CHAMP}
          />
        </label>
        <button type="submit" disabled={importer.isPending} className={BOUTON_PRINCIPAL}>
          {importer.isPending ? 'Import en cours…' : "Importer l'offre"}
        </button>

        {importer.isError && (
          <p role="alert" className="text-sm font-bold text-red-700 dark:text-red-400">
            {importer.error instanceof ErreurApi && importer.error.statut === 400
              ? importer.error.message
              : "L'offre n'a pas pu être importée. Vérifie ta connexion et réessaie."}
          </p>
        )}
        {importer.isSuccess && (
          <div role="status" className="rounded-2xl bg-primary-50 p-4 dark:bg-primary-900/20">
            <p className="font-bold">
              {importer.data.nouvelle ? 'Offre ajoutée' : 'Cette offre était déjà connue'} : «{' '}
              {importer.data.titre} »
            </p>
            <p className={`mt-1 text-sm ${SECONDAIRE}`}>{ORIGINES[importer.data.origine]}</p>
            <Link
              to={`/?offre=${importer.data.id}`}
              className={`mt-2 inline-block text-sm ${LIEN}`}
            >
              Voir l'offre
            </Link>
          </div>
        )}
      </form>

      <section aria-label="Depuis le téléphone" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Depuis ton téléphone</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Une fois l'application installée sur Android, elle apparaît dans le menu « Partager » des
          autres applications et du navigateur. Partage une annonce vers StageRadar : cet écran
          s'ouvre déjà rempli, il ne reste qu'à valider.
        </p>
      </section>

      <section aria-label="Depuis l'ordinateur" className={`mt-4 ${CARTE}`}>
        <h2 className="font-bold">Depuis ton ordinateur</h2>
        <p className={`mt-1 text-sm ${SECONDAIRE}`}>
          Crée un favori dans ton navigateur et colle ce texte à la place de son adresse. Sur la
          page d'une annonce, un clic sur ce favori ouvre cet écran avec l'adresse déjà remplie.
        </p>
        <label className="sr-only" htmlFor="favori">
          Adresse du favori
        </label>
        <textarea id="favori" readOnly rows={3} value={favori()} className={`${CHAMP} text-xs`} />
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(favori()).then(() => setCopie(true));
          }}
          className={`mt-2 flex items-center gap-2 ${BOUTON_DOUX}`}
        >
          <Copy aria-hidden="true" className="size-4" /> {copie ? 'Copié' : 'Copier'}
        </button>
      </section>
    </div>
  );
}
