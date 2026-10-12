import { expect, OWNER_EMAIL, test } from './fixtures';

test.describe('Lot 0 — socle', () => {
  test('demande un lien magique depuis la page de connexion', async ({ page, backend }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'StageRadar' })).toBeVisible();

    await page.getByLabel('Adresse e-mail').fill(`  ${OWNER_EMAIL} `);
    await page.getByRole('button', { name: 'Recevoir un lien de connexion' }).click();

    await expect(page.getByRole('status')).toContainText('Lien envoyé');
    await expect(page.getByRole('status')).toContainText(OWNER_EMAIL);
    expect(backend.lastOtpBody).toMatchObject({ email: OWNER_EMAIL });
  });

  test('affiche le cadre de l’application au propriétaire et permet de naviguer', async ({
    page,
    backend,
  }) => {
    await backend.signInAs(OWNER_EMAIL);
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: 'Navigation principale' });
    await expect(nav).toBeVisible();
    await expect(page.getByRole('heading', { level: 1, name: 'Fil' })).toBeVisible();
    expect(backend.calls).toContain('POST /rest/v1/rpc/is_owner');

    for (const [lien, titre] of [
      ['Suivi', 'Suivi'],
      ['Calendrier', 'Calendrier'],
      ['Pays', 'Fiches pays'],
      ['Plus', 'Plus'],
    ] as const) {
      await nav.getByRole('link', { name: lien }).click();
      await expect(page.getByRole('heading', { level: 1, name: titre })).toBeVisible();
    }
    await expect(page.getByText(OWNER_EMAIL)).toBeVisible();
  });

  test('revient à la connexion après une déconnexion', async ({ page, backend }) => {
    await backend.signInAs(OWNER_EMAIL);
    await page.goto('/plus');

    await page.getByRole('button', { name: 'Se déconnecter' }).click();
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible();

    await page.reload();
    await expect(page.getByLabel('Adresse e-mail')).toBeVisible();
  });

  test('bloque un compte connecté qui n’est pas le propriétaire', async ({ page, backend }) => {
    await backend.signInAs('intrus@example.test', { isOwner: false });
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'Compte non autorisé' })).toBeVisible();
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });

  test('ouvre une adresse profonde directement', async ({ page, backend }) => {
    await backend.signInAs(OWNER_EMAIL);
    await page.goto('/suivi');
    await expect(page.getByRole('heading', { level: 1, name: 'Suivi' })).toBeVisible();
  });

  test('est installable : manifeste, icônes et service worker', async ({ page, request }) => {
    await page.goto('/');

    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    expect(href).toBeTruthy();
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({
      name: 'StageRadar',
      lang: 'fr',
      display: 'standalone',
      start_url: '/',
    });

    const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
      true,
    );
    for (const icon of manifest.icons as { src: string }[]) {
      const response = await request.get(`/${icon.src}`);
      expect(response.status(), icon.src).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
    }

    const scope = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.ready;
      return registration.scope;
    });
    expect(scope).toBe(new URL('/', page.url()).href);
  });
});
