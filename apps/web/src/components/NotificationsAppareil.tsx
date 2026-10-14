import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import {
  activerNotifications,
  desactiverNotifications,
  envoyerEssai,
  etatNotifications,
  type EtatNotifications,
} from '../lib/notifications';
import { BADGE, BOUTON_DOUX, BOUTON_SECONDAIRE, CARTE, SECONDAIRE } from '../lib/ui';

const CLE = ['notifications', 'appareil'] as const;

/** Abonnement de cet appareil aux notifications : chaque téléphone ou PC s'active séparément. */
export function NotificationsAppareil() {
  const client = useQueryClient();
  const etat = useQuery({ queryKey: CLE, queryFn: etatNotifications, staleTime: 0, gcTime: 0 });
  const changer = useMutation({
    mutationFn: (activer: boolean) =>
      activer ? activerNotifications() : desactiverNotifications(),
    onSuccess: (nouvel: EtatNotifications) => client.setQueryData(CLE, nouvel),
  });
  const essai = useMutation({ mutationFn: envoyerEssai });

  return (
    <section aria-label="Notifications sur cet appareil" className={CARTE}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">Notifications sur cet appareil</h2>
        {etat.data === 'actives' && <span className={BADGE.accent}>Activées</span>}
        {etat.data === 'inactives' && <span className={BADGE.neutre}>Désactivées</span>}
        {etat.data === 'bloquees' && <span className={BADGE.rouge}>Bloquées</span>}
      </div>
      <p className={`mt-1 text-sm ${SECONDAIRE}`}>
        Une alerte dès qu'une nouvelle offre atteint le score choisi plus bas, et un résumé chaque
        soir. À activer sur chaque appareil : sur Android, l'application doit être installée.
      </p>

      {etat.data === 'indisponible' && (
        <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-400">
          Ce navigateur ne sait pas recevoir de notifications.
        </p>
      )}
      {etat.data === 'bloquees' && (
        <p className="mt-3 text-sm font-bold text-amber-700 dark:text-amber-400">
          Les notifications sont bloquées pour ce site dans les réglages du navigateur :
          autorise-les là-bas, puis reviens ici.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {etat.data === 'inactives' && (
          <button
            type="button"
            disabled={changer.isPending}
            onClick={() => changer.mutate(true)}
            className={`flex items-center gap-2 ${BOUTON_SECONDAIRE}`}
          >
            <Bell aria-hidden="true" className="size-4" /> Activer les notifications
          </button>
        )}
        {etat.data === 'actives' && (
          <>
            <button
              type="button"
              disabled={essai.isPending}
              onClick={() => essai.mutate()}
              className={`flex items-center gap-2 ${BOUTON_SECONDAIRE}`}
            >
              <Bell aria-hidden="true" className="size-4" /> Envoyer une notification d'essai
            </button>
            <button
              type="button"
              disabled={changer.isPending}
              onClick={() => changer.mutate(false)}
              className={`flex items-center gap-2 ${BOUTON_DOUX}`}
            >
              <BellOff aria-hidden="true" className="size-4" /> Désactiver
            </button>
          </>
        )}
      </div>

      {essai.isSuccess && (
        <p role="status" className={`mt-2 text-sm ${SECONDAIRE}`}>
          {essai.data > 0
            ? `Notification envoyée à ${essai.data} appareil${essai.data > 1 ? 's' : ''} : elle arrive dans quelques secondes.`
            : "Aucun appareil n'a pu être joint."}
        </p>
      )}
      {(changer.isError || essai.isError) && (
        <p role="alert" className="mt-2 text-sm font-bold text-red-700 dark:text-red-400">
          L'opération a échoué. Vérifie ta connexion et réessaie.
        </p>
      )}
    </section>
  );
}
