// Notifications reçues par le service worker (chargé par le service worker généré, voir
// vite.config.ts). Le message est préparé par le serveur :
// packages/collector/src/notifications/messages.ts → { titre, corps, url, etiquette }.

self.addEventListener('push', (evenement) => {
  let message;
  try {
    message = evenement.data ? evenement.data.json() : {};
  } catch {
    message = { corps: evenement.data ? evenement.data.text() : '' };
  }
  evenement.waitUntil(
    self.registration.showNotification(message.titre || 'StageRadar', {
      body: message.corps || '',
      // Deux notifications de même étiquette se remplacent au lieu de s'empiler.
      tag: message.etiquette,
      data: { url: message.url || '/' },
      icon: '/pwa-192x192.png',
      badge: '/pwa-64x64.png',
    }),
  );
});

// Un appui sur la notification ramène l'application au premier plan, sur le bon écran.
self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close();
  const chemin = (evenement.notification.data && evenement.notification.data.url) || '/';
  const adresse = new URL(chemin, self.location.origin).href;
  evenement.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const fenetre of fenetres) {
        if ('focus' in fenetre) {
          await fenetre.focus();
          if ('navigate' in fenetre) await fenetre.navigate(adresse);
          return;
        }
      }
      await self.clients.openWindow(adresse);
    })(),
  );
});
