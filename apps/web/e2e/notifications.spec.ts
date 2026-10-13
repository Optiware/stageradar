import { expect, OWNER_EMAIL, test } from './fixtures';

const REGLAGES = {
  profil: {
    alternance: { rentree: '2027-09-01', villes: [], rayon_km: 30, rythme: null },
    stage: { debut: '2027-06-01', fin: '2027-08-31', pays: ['JP', 'KR', 'CO', 'CA', 'GB'] },
    langues: [],
  },
  poids: { domaine: 30, periode: 20, pays: 15, niveau: 15, langue: 10, fraicheur: 10 },
  notifications: {
    seuil_push: 75,
    resume_quotidien: { actif: true, heure: '19:00', fuseau: 'Europe/Paris' },
    heures_calmes: { debut: '22:00', fin: '08:00' },
  },
  objectif_hebdo: 5,
  presentation: '',
};

test.describe('Lot 5 — notifications', () => {
  test.beforeEach(async ({ backend }) => {
    backend.settings = structuredClone(REGLAGES);
    await backend.signInAs(OWNER_EMAIL);
  });

  test('abonne cet appareil, envoie un essai, puis le désabonne', async ({ page, backend }) => {
    // Le navigateur de test n'a pas de service de notification : l'abonnement est simulé.
    await page.addInitScript(() => {
      // Sans écran, le navigateur de test refuse toujours les notifications : l'accord est simulé.
      Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
      Notification.requestPermission = () => Promise.resolve('granted');
      let abonnement: unknown = null;
      const faux = {
        endpoint: 'https://push.example.test/appareil-1',
        toJSON: () => ({
          endpoint: 'https://push.example.test/appareil-1',
          keys: { p256dh: 'cle-publique-appareil', auth: 'secret-appareil' },
        }),
        unsubscribe: () => {
          abonnement = null;
          return Promise.resolve(true);
        },
      };
      PushManager.prototype.getSubscription = () =>
        Promise.resolve(abonnement as PushSubscription | null);
      PushManager.prototype.subscribe = (options) => {
        (window as unknown as { cleDemandee: unknown }).cleDemandee = options?.applicationServerKey;
        abonnement = faux;
        return Promise.resolve(faux as unknown as PushSubscription);
      };
    });
    backend.apiReponses['/push/cle'] = { corps: { cle: 'cle-publique-du-serveur' } };
    backend.apiReponses['/push/essai'] = { corps: { appareils: 1 } };

    await page.goto('/reglages');
    const bloc = page.getByRole('region', { name: 'Notifications sur cet appareil' });
    await expect(bloc).toContainText('Désactivées');

    await bloc.getByRole('button', { name: 'Activer les notifications' }).click();
    await expect(bloc).toContainText('Activées');
    expect(
      await page.evaluate(() => (window as unknown as { cleDemandee: unknown }).cleDemandee),
    ).toBe('cle-publique-du-serveur');
    expect(backend.push_subscriptions).toHaveLength(1);
    expect(backend.push_subscriptions[0]).toMatchObject({
      endpoint: 'https://push.example.test/appareil-1',
      p256dh: 'cle-publique-appareil',
      auth: 'secret-appareil',
    });

    await bloc.getByRole('button', { name: "Envoyer une notification d'essai" }).click();
    await expect(bloc.getByRole('status')).toContainText('Notification envoyée à 1 appareil');

    await bloc.getByRole('button', { name: 'Désactiver' }).click();
    await expect(bloc).toContainText('Désactivées');
    expect(backend.push_subscriptions).toHaveLength(0);
  });

  test('règle les heures calmes et le résumé du soir', async ({ page, backend }) => {
    await page.goto('/reglages');

    await page.getByLabel('Heures calmes : début').fill('23:30');
    await page.getByLabel('Heure du résumé du soir (heure de Paris)').fill('18:15');
    await page.getByLabel('Recevoir le résumé du soir').uncheck();
    await page.getByRole('button', { name: 'Enregistrer les réglages' }).click();

    await expect(page.getByText('Réglages enregistrés')).toBeVisible();
    expect(backend.settings).toMatchObject({
      notifications: {
        seuil_push: 75,
        heures_calmes: { debut: '23:30', fin: '08:00' },
        resume_quotidien: { actif: false, heure: '18:15', fuseau: 'Europe/Paris' },
      },
    });
  });

  test('le service worker charge le script qui affiche les notifications', async ({ request }) => {
    expect(await (await request.get('/sw.js')).text()).toContain('push-sw.js');
    const script = await request.get('/push-sw.js');
    expect(script.status()).toBe(200);
    expect(await script.text()).toContain('showNotification');
  });
});
