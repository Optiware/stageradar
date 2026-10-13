import { expect, OWNER_EMAIL, test } from './fixtures';

test.describe('Apparence et confidentialité', () => {
  test('s’ouvre en thème clair et garde le thème sombre une fois choisi', async ({
    page,
    backend,
  }) => {
    await backend.signInAs(OWNER_EMAIL);
    await page.goto('/plus');

    const html = page.locator('html');
    const theme = page.getByRole('group', { name: 'Thème' });
    await expect(html).not.toHaveClass(/dark/);
    await expect(theme.getByRole('button', { name: 'Clair' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await theme.getByRole('button', { name: 'Sombre' }).click();
    await expect(html).toHaveClass(/dark/);

    await page.reload();
    await expect(html).toHaveClass(/dark/);
    await expect(theme.getByRole('button', { name: 'Sombre' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('bascule le thème depuis la navigation', async ({ page, backend }) => {
    await backend.signInAs(OWNER_EMAIL);
    await page.goto('/');

    const html = page.locator('html');
    await page.getByRole('button', { name: 'Mode sombre' }).click();
    await expect(html).toHaveClass(/dark/);

    // Le choix fait ici se retrouve dans « Plus ».
    await page.getByRole('navigation').getByRole('link', { name: 'Plus' }).click();
    await expect(
      page.getByRole('group', { name: 'Thème' }).getByRole('button', { name: 'Sombre' }),
    ).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: 'Mode clair' }).click();
    await expect(html).not.toHaveClass(/dark/);
  });

  test('demande aux moteurs de recherche de ne rien indexer', async ({ page, request }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );

    const robots = await request.get('/robots.txt');
    expect(await robots.text()).toContain('Disallow: /');
  });
});
