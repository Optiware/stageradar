import { expect, OWNER_EMAIL, test } from './fixtures';

const FICHE = {
  pays: 'JP',
  nom: 'Japon',
  contenu_md: '',
  liens: [],
  echeances: [],
  delais_visa: [
    {
      etape: 'Déposer la demande',
      jours_avant: 90,
      source: 'Source officielle',
      url: 'https://example.test/visa',
      verifiee: '2026-11-18',
    },
    {
      etape: 'Rendez-vous',
      jours_avant: null,
      source: 'Source officielle',
      url: 'https://example.test/visa',
      verifiee: '2026-11-18',
    },
  ],
  statut: 'a_verifier',
  derniere_verification: null,
};

test.beforeEach(async ({ backend }) => {
  backend.country_sheets = [FICHE];
  await backend.signInAs(OWNER_EMAIL);
});

test('calcule les échéances visa depuis le début du stage, avec leur source', async ({ page }) => {
  await page.goto('/calendrier');
  const visas = page.getByRole('region', { name: 'Échéances visa' });
  await expect(visas).toContainText('Visa · Japon : Déposer la demande');
  await expect(visas).toContainText('Délai non indiqué dans la fiche : à vérifier');
  await expect(visas.getByRole('link', { name: 'Source officielle' }).first()).toHaveAttribute(
    'href',
    'https://example.test/visa',
  );
  await page.getByLabel('Afficher les échéances visa').uncheck();
  await expect(page.getByRole('region', { name: 'Toutes les dates à venir' })).not.toContainText(
    'Visa · Japon',
  );
});

test('note un délai visa dans la fiche pays', async ({ page, backend }) => {
  backend.country_sheets = [{ ...FICHE, delais_visa: [] }];
  await page.goto('/pays?pays=JP');
  await page.getByRole('button', { name: 'Modifier la fiche' }).click();
  await page.getByRole('button', { name: 'Ajouter une étape du visa' }).click();
  await page.getByLabel('Étape', { exact: true }).fill('Demander le certificat');
  await page.getByLabel('Jours avant le début du stage').fill('120');
  await page.getByLabel('Source', { exact: true }).fill('Ambassade');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect
    .poll(
      () => (backend.country_sheets[0]?.delais_visa as { jours_avant: number }[])?.[0]?.jours_avant,
    )
    .toBe(120);
  await expect(page.getByText('120 jours avant le début du stage')).toBeVisible();
});
