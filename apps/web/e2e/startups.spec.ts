import { expect, OWNER_EMAIL, test } from './fixtures';

test.describe('Startups Japon et Corée', () => {
  test.beforeEach(async ({ backend }) => {
    await backend.signInAs(OWNER_EMAIL);
  });

  test('donne les contacts sourcés et ajoute une startup au démarchage', async ({
    page,
    backend,
  }) => {
    await page.goto('/plus');
    await page.getByRole('link', { name: /Startups Japon et Corée/ }).click();

    const hennge = page.getByRole('article', { name: 'HENNGE' });
    await expect(hennge).toContainText('Programme de stage');
    await expect(hennge.getByRole('link', { name: 'Page carrière' })).toHaveAttribute(
      'href',
      'https://recruit.hennge.com/en/gip/',
    );
    // Pas de profil deviné : une recherche LinkedIn sur le nom et l'entreprise.
    await expect(
      hennge.getByRole('link', { name: 'Chercher sur LinkedIn' }).first(),
    ).toHaveAttribute(
      'href',
      /linkedin\.com\/search\/results\/people\/\?keywords=Kazuhiro%20Ogura%20HENNGE/,
    );

    await page
      .getByRole('group', { name: 'Pays' })
      .getByRole('button', { name: 'Corée du Sud' })
      .click();
    await expect(hennge).toHaveCount(0);
    await page
      .getByRole('group', { name: 'Accès au stage' })
      .getByRole('button', { name: 'Stage publié' })
      .click();
    const sendbird = page.getByRole('article', { name: 'Sendbird' });
    await expect(sendbird).toContainText('AI Agent Engineer, Intern');

    await sendbird.getByRole('button', { name: 'Ajouter au démarchage' }).click();
    await expect(sendbird.getByRole('link', { name: 'Déjà dans le démarchage' })).toBeVisible();
    expect(backend.companies[0]).toMatchObject({
      nom: 'Sendbird',
      pays: 'KR',
      site: 'https://sendbird.com/',
      url_carriere: 'https://sendbird.com/careers',
      contact_linkedin: 'https://www.linkedin.com/company/sendbird',
    });
  });

  test('cherche par mot', async ({ page }) => {
    await page.goto('/startups');
    await page.getByLabel('Chercher').fill('lunaires');
    await expect(page.getByRole('status')).toHaveText('1 startup');
    await expect(page.getByRole('article', { name: 'ispace' })).toContainText('9 novembre 2026');
  });

  test('filtre la robotique et le matériel', async ({ page }) => {
    await page.goto('/startups');
    await page
      .getByRole('group', { name: 'Secteur' })
      .getByRole('button', { name: 'Robotique, spatial, matériel' })
      .click();
    await expect(page.getByRole('article', { name: 'Mujin' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'Seoul Robotics' })).toBeVisible();
    await expect(page.getByRole('article', { name: 'HENNGE' })).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('14 startups');
  });
});
