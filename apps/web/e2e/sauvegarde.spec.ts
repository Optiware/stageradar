import { expect, OWNER_EMAIL, test } from './fixtures';

test.beforeEach(async ({ backend }) => {
  await backend.signInAs(OWNER_EMAIL);
});

test('chiffre une sauvegarde avec un mot de passe et la restaure', async ({ page, backend }) => {
  await page.goto('/donnees');
  const section = page.getByRole('region', { name: 'Sauvegarde chiffrée automatique' });
  await expect(section.getByRole('switch', { name: 'Sauvegarde automatique' })).toBeDisabled();

  await section.getByLabel('Mot de passe de sauvegarde').fill('un mot de passe solide');
  await section.getByRole('button', { name: 'Choisir ce mot de passe' }).click();
  await expect(section.getByRole('switch', { name: 'Sauvegarde automatique' })).toBeEnabled();

  await section.getByRole('button', { name: 'Sauvegarder maintenant' }).click();
  await expect.poll(() => backend.backups.length, { timeout: 15000 }).toBe(1);
  const ligne = backend.backups[0]!;
  // Le serveur ne reçoit qu'un texte illisible.
  expect(String(ligne.donnees)).not.toContain('stageradar');
  expect(ligne).toMatchObject({ origine: 'manuelle' });

  await section.getByRole('button', { name: 'Restaurer' }).click();
  await section.getByLabel('Mot de passe de cette sauvegarde').fill('mauvais mot de passe');
  await section.getByRole('button', { name: 'Restaurer cette sauvegarde' }).click();
  await expect(section.getByRole('alert')).toContainText('Mot de passe incorrect', {
    timeout: 15000,
  });

  await section.getByLabel('Mot de passe de cette sauvegarde').fill('un mot de passe solide');
  await section.getByRole('button', { name: 'Restaurer cette sauvegarde' }).click();
  await expect(section.getByRole('status')).toContainText('Sauvegarde restaurée.', {
    timeout: 15000,
  });
});
