import { appelerApi } from './api';
import { supabase } from './supabase';

// Notifications « Web Push » sur cet appareil. Le navigateur s'abonne auprès de son service de
// notification avec la clé publique du serveur ; l'abonnement est rangé dans `push_subscriptions`,
// où la collecte le retrouve pour signaler une nouvelle offre.

export type EtatNotifications =
  | 'indisponible' // ce navigateur ne sait pas recevoir de notifications
  | 'bloquees' // refusées dans les réglages du navigateur
  | 'inactives'
  | 'actives';

function possibles(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function abonnement(): Promise<PushSubscription | null> {
  const enregistrement = await navigator.serviceWorker.ready;
  return enregistrement.pushManager.getSubscription();
}

export async function etatNotifications(): Promise<EtatNotifications> {
  if (!possibles()) return 'indisponible';
  if (Notification.permission === 'denied') return 'bloquees';
  return (await abonnement()) ? 'actives' : 'inactives';
}

/** « Chrome sur Android », « Edge sur Windows »… pour reconnaître l'appareil dans la liste. */
function nomAppareil(): string {
  const agent = navigator.userAgent;
  const navigateur = /Edg\//.test(agent)
    ? 'Edge'
    : /Firefox\//.test(agent)
      ? 'Firefox'
      : /Chrome\//.test(agent)
        ? 'Chrome'
        : 'Navigateur';
  const systeme = /Android/.test(agent)
    ? 'Android'
    : /Windows/.test(agent)
      ? 'Windows'
      : /Mac OS X|iPhone|iPad/.test(agent)
        ? 'Apple'
        : /Linux/.test(agent)
          ? 'Linux'
          : 'appareil inconnu';
  return `${navigateur} sur ${systeme}`;
}

/**
 * Demande l'autorisation, abonne cet appareil et enregistre l'abonnement.
 * À appeler depuis un clic : le navigateur n'affiche sa demande qu'à ce moment-là.
 */
export async function activerNotifications(): Promise<EtatNotifications> {
  if (!possibles()) return 'indisponible';
  if ((await Notification.requestPermission()) !== 'granted') {
    return Notification.permission === 'denied' ? 'bloquees' : 'inactives';
  }
  const { cle } = await appelerApi<{ cle: string | null }>('/push/cle');
  if (!cle) throw new Error('Notifications non configurées sur le serveur.');

  const enregistrement = await navigator.serviceWorker.ready;
  const nouvel = await enregistrement.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: cle,
  });
  const { endpoint, keys } = nouvel.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new Error('Abonnement incomplet.');
  const { error } = await supabase!
    .from('push_subscriptions')
    .upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, appareil: nomAppareil() },
      { onConflict: 'endpoint' },
    );
  if (error) throw error;
  return 'actives';
}

export async function desactiverNotifications(): Promise<EtatNotifications> {
  const actuel = await abonnement();
  if (actuel) {
    await supabase!.from('push_subscriptions').delete().eq('endpoint', actuel.endpoint);
    await actuel.unsubscribe();
  }
  return 'inactives';
}

/** Fait envoyer par le serveur une notification d'essai à tous les appareils abonnés. */
export async function envoyerEssai(): Promise<number> {
  const { appareils } = await appelerApi<{ appareils: number }>('/push/essai');
  return appareils;
}
