import { expect, OWNER_EMAIL, test } from './fixtures';

test.beforeEach(async ({ backend }) => {
  await backend.signInAs(OWNER_EMAIL);
});

test('montre la loi sur les stages non payés et filtre l’annuaire', async ({ page }) => {
  await page.goto('/plus');
  await page.getByRole('link', { name: /Communautés/ }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Communautés et startups' }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /gratification minimale d’un étudiant en entreprise/ }),
  ).toHaveAttribute('href', 'https://www.service-public.gouv.fr/particuliers/vosdroits/F32131');

  const annuaire = page.getByRole('region', { name: /Annuaire/ });
  await page
    .getByRole('group', { name: 'Filtres' })
    .getByRole('button', { name: 'Corée du Sud' })
    .click();
  await expect(annuaire.getByRole('article')).toHaveCount(2);
  await expect(
    annuaire.getByRole('article', { name: 'Seoul Startups' }).getByRole('link', { name: /Ouvrir/ }),
  ).toHaveAttribute('href', 'https://seoulstartups.com/');
  await page.getByRole('button', { name: 'Gratuit seulement' }).click();
  await expect(annuaire).toContainText('Aucune communauté pour ces filtres');
});

test('note une personne rencontrée et son échange', async ({ page, backend }) => {
  await page.goto('/communautes');
  await page.getByRole('button', { name: 'Ajouter un contact' }).click();
  const formulaire = page.getByRole('form', { name: 'Nouveau contact' });
  await formulaire.getByLabel('Nom').fill('Min-jun K.');
  await formulaire.getByLabel('Startup').fill('Hanul Cloud');
  await formulaire.getByLabel('E-mail ou lien (LinkedIn, site)').fill('minjun@example.test');
  await formulaire.getByLabel('Trouvé via').fill('Seoul Startups');
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click();
  await expect.poll(() => backend.network_contacts.length).toBe(1);
  expect(backend.network_contacts[0]).toMatchObject({
    nom: 'Min-jun K.',
    startup: 'Hanul Cloud',
    statut: 'a_contacter',
  });
});
