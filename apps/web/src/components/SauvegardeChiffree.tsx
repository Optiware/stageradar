import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import {
  cleGardee,
  definirMotDePasse,
  ecrireReglages,
  lireReglages,
  useRestaurerChiffre,
  useSauvegarderChiffre,
  useSauvegardesChiffrees,
  type Frequence,
  type ReglagesSauvegarde,
} from '../lib/sauvegardes';
import { BOUTON_PRINCIPAL, BOUTON_SECONDAIRE, CARTE, CHAMP, pilule, SECONDAIRE } from '../lib/ui';

/** Clé « sauvegarde-cle » : propre à l'appareil, exclue du cache gardé hors ligne (main.tsx). */
const CLE_PRESENTE = ['sauvegarde-cle'] as const;

function quand(date: string): string {
  return new Date(date).toLocaleString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Sauvegarde chiffrée automatique (maquette du 18 novembre 2026) : chiffrée sur l'appareil avec
 * un mot de passe qui n'en sort pas, lancée à l'ouverture de l'application, cinq gardées.
 */
export function SauvegardeChiffree() {
  const client = useQueryClient();
  const [reglages, setReglages] = useState<ReglagesSauvegarde>(lireReglages);
  const [motDePasse, setMotDePasse] = useState('');
  const [aRestaurer, setARestaurer] = useState<string | null>(null);
  const [motDePasseRestauration, setMotDePasseRestauration] = useState('');
  const presente = useQuery({
    queryKey: CLE_PRESENTE,
    queryFn: async () => (await cleGardee()) !== null,
  });
  const liste = useSauvegardesChiffrees();
  const sauvegarder = useSauvegarderChiffre();
  const restaurer = useRestaurerChiffre();
  const definir = useMutation({
    mutationFn: definirMotDePasse,
    onSuccess: () => {
      setMotDePasse('');
      void client.invalidateQueries({ queryKey: CLE_PRESENTE });
    },
  });

  function changerReglages(champs: Partial<ReglagesSauvegarde>) {
    const suivants = { ...reglages, ...champs };
    setReglages(suivants);
    ecrireReglages(suivants);
  }

  function envoyerMotDePasse(evenement: FormEvent) {
    evenement.preventDefault();
    if (motDePasse.length >= 12) definir.mutate(motDePasse);
  }

  const aCle = presente.data === true;
  const derniere = liste.data?.[0];

  return (
    <section aria-labelledby="titre-sauvegarde-chiffree" className={`flex flex-col gap-5 ${CARTE}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-700 dark:bg-primary-400/15 dark:text-primary-300">
          <ShieldCheck aria-hidden="true" className="size-[1.375rem]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-[1_1_16rem]">
          <h2 id="titre-sauvegarde-chiffree" className="text-lg font-bold">
            Sauvegarde chiffrée automatique
          </h2>
          <p className={`text-sm ${SECONDAIRE}`}>
            Offres suivies, candidatures, messages, documents et réglages, chiffrés avant de quitter
            ton appareil.
          </p>
        </div>
        <span id="libelle-auto" className="text-sm font-semibold">
          Sauvegarde automatique
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={reglages.auto && aCle}
          aria-labelledby="libelle-auto"
          disabled={!aCle}
          onClick={() => changerReglages({ auto: !reglages.auto })}
          className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-50 ${
            reglages.auto && aCle
              ? 'bg-primary-600 dark:bg-primary-400'
              : 'bg-gray-300 dark:bg-gray-700'
          }`}
        >
          <span
            className={`absolute top-1 size-5 rounded-full bg-white transition-all ${
              reglages.auto && aCle ? 'left-6' : 'left-1'
            }`}
          />
        </button>
      </div>

      <form onSubmit={envoyerMotDePasse} className="flex flex-wrap items-end gap-3">
        <label className="flex-[1_1_16rem] text-sm font-semibold">
          {aCle ? 'Nouveau mot de passe de sauvegarde' : 'Mot de passe de sauvegarde'}
          <input
            type="password"
            autoComplete="new-password"
            minLength={12}
            value={motDePasse}
            onChange={(evenement) => setMotDePasse(evenement.target.value)}
            className={CHAMP}
          />
          <span className={`mt-1 block text-xs font-normal ${SECONDAIRE}`}>
            12 caractères au moins. Gardé sur cet appareil seulement, sous forme de clé.
          </span>
        </label>
        <button
          type="submit"
          disabled={motDePasse.length < 12 || definir.isPending}
          className={BOUTON_SECONDAIRE}
        >
          {aCle ? 'Changer' : 'Choisir ce mot de passe'}
        </button>
        <p
          role="note"
          className="basis-full rounded-xl bg-amber-50 px-3.5 py-2.5 text-sm text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
        >
          <strong>Sans ce mot de passe, la sauvegarde est illisible, même pour StageRadar.</strong>{' '}
          Note-le dans un endroit sûr. Après un changement, les anciennes sauvegardes gardent
          l’ancien.
        </p>
      </form>

      {aCle && (
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
          <div className="flex flex-col">
            <span className={`text-sm ${SECONDAIRE}`}>Dernière sauvegarde réussie</span>
            <strong>{derniere ? quand(derniere.created_at) : 'Aucune pour l’instant'}</strong>
          </div>
          <fieldset>
            <legend className={`mb-1.5 text-sm ${SECONDAIRE}`}>Fréquence</legend>
            <div className="flex gap-2">
              {(
                [
                  ['jour', 'Chaque jour'],
                  ['semaine', 'Chaque semaine'],
                ] as [Frequence, string][]
              ).map(([valeur, libelle]) => (
                <button
                  key={valeur}
                  type="button"
                  aria-pressed={reglages.frequence === valeur}
                  onClick={() => changerReglages({ frequence: valeur })}
                  className={pilule(reglages.frequence === valeur)}
                >
                  {libelle}
                </button>
              ))}
            </div>
          </fieldset>
          <button
            type="button"
            disabled={sauvegarder.isPending}
            onClick={() => sauvegarder.mutate()}
            className={BOUTON_PRINCIPAL}
          >
            {sauvegarder.isPending ? 'Chiffrement…' : 'Sauvegarder maintenant'}
          </button>
        </div>
      )}
      {sauvegarder.isError && (
        <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
          La sauvegarde n’a pas pu être faite. Vérifie ta connexion.
        </p>
      )}

      {(liste.data?.length ?? 0) > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="font-bold">Les {Math.min(5, liste.data!.length)} dernières</h3>
          <ul className="divide-y divide-gray-200 rounded-xl border border-gray-200 dark:divide-gray-800 dark:border-gray-800">
            {liste.data!.map((sauvegarde) => (
              <li key={sauvegarde.id} className="flex flex-col gap-2 px-3.5 py-2.5">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <strong className="text-sm">{quand(sauvegarde.created_at)}</strong>
                    <span className={`text-xs ${SECONDAIRE}`}>
                      {sauvegarde.origine === 'auto' ? 'Automatique' : 'À la main'} ·{' '}
                      {Math.max(1, Math.round(sauvegarde.taille / 1024))} Ko
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-expanded={aRestaurer === sauvegarde.id}
                    onClick={() => {
                      setARestaurer(aRestaurer === sauvegarde.id ? null : sauvegarde.id);
                      setMotDePasseRestauration('');
                      restaurer.reset();
                    }}
                    className="text-sm font-semibold text-primary-600 dark:text-primary-300"
                  >
                    Restaurer
                  </button>
                </div>
                {aRestaurer === sauvegarde.id && (
                  <form
                    onSubmit={(evenement) => {
                      evenement.preventDefault();
                      restaurer.mutate({ id: sauvegarde.id, motDePasse: motDePasseRestauration });
                    }}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <label className="flex-[1_1_14rem] text-sm font-semibold">
                      Mot de passe de cette sauvegarde
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={motDePasseRestauration}
                        onChange={(evenement) => setMotDePasseRestauration(evenement.target.value)}
                        className={CHAMP}
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={!motDePasseRestauration || restaurer.isPending}
                      className={BOUTON_SECONDAIRE}
                    >
                      Restaurer cette sauvegarde
                    </button>
                    {restaurer.isError && (
                      <p
                        role="alert"
                        className="basis-full text-sm font-semibold text-red-700 dark:text-red-400"
                      >
                        {restaurer.error.message === 'mot de passe'
                          ? 'Mot de passe incorrect pour cette sauvegarde.'
                          : 'La restauration a échoué. Vérifie ta connexion.'}
                      </p>
                    )}
                    {restaurer.isSuccess && (
                      <p
                        role="status"
                        className="basis-full text-sm font-semibold text-vert-700 dark:text-vert-50"
                      >
                        Sauvegarde restaurée.
                      </p>
                    )}
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className={`text-xs ${SECONDAIRE}`}>
            Restaurer remplace chaque élément par sa version sauvegardée ; rien n’est supprimé.
          </p>
        </div>
      )}
    </section>
  );
}
