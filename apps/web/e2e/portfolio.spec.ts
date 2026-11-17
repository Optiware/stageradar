import { expect, OWNER_EMAIL, test } from './fixtures';

test.beforeEach(async ({ backend }) => {
  backend.technologies = [
    { terme: 'golang', nombre: 12 },
    { terme: 'go', nombre: 9 },
    { terme: 'docker', nombre: 7 },
    { terme: 'react', nombre: 4 },
  ];
  await backend.signInAs(OWNER_EMAIL);
});

test('un portfolio vide invite à ajouter un projet et propose les technologies demandées', async ({
  page,
}) => {
  await page.goto('/plus');
  await page.getByRole('link', { name: /Portfolio/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Portfolio' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ajoute ton premier projet' })).toBeVisible();

  const aFaire = page.getByRole('complementary', { name: 'Projets à faire' });
  await expect(aFaire).toContainText('Go');
  await expect(aFaire).toContainText('demandé dans 12 offres, absent du portfolio');
});

test('ajoute un projet, calcule sa complétude et retire ses technologies des projets à faire', async ({
  page,
  backend,
}) => {
  await page.goto('/portfolio');
  await page.getByRole('button', { name: 'Ajouter un projet' }).first().click();
  await page.getByLabel('Titre').fill('StageRadar');
  await page.getByLabel('Technologies, séparées par des virgules').fill('React, Docker');
  await page.getByLabel('Lien de la démo en ligne').fill('https://stageradar.example');
  await page.getByLabel('Un README').check();
  await page.getByRole('button', { name: 'Enregistrer' }).click();

  const carte = page.getByRole('article').filter({ hasText: 'StageRadar' });
  await expect(carte).toContainText('50 %');
  await expect(carte.getByRole('link', { name: 'Démo' })).toHaveAttribute(
    'href',
    'https://stageradar.example/',
  );
  expect(backend.projects[0]).toMatchObject({
    titre: 'StageRadar',
    technologies: ['React', 'Docker'],
  });

  const aFaire = page.getByRole('complementary', { name: 'Projets à faire' });
  await expect(aFaire).toContainText('Go');
  await expect(aFaire).not.toContainText('Docker');
});

test('« Ajouter à mes projets » prépare un projet pour la technologie manquante', async ({
  page,
}) => {
  await page.goto('/portfolio');
  await page
    .getByRole('complementary', { name: 'Projets à faire' })
    .getByRole('button', { name: 'Ajouter à mes projets' })
    .first()
    .click();
  await expect(page.getByLabel('Titre')).toHaveValue('Projet Go');
  await expect(page.getByLabel('Technologies, séparées par des virgules')).toHaveValue('Go');
});

test('n’affiche pas en lien une adresse qui n’est pas une page web', async ({ page, backend }) => {
  backend.projects = [
    {
      id: 'p-1',
      titre: 'Piège',
      description: '',
      technologies: [],
      statut: 'termine',
      url_code: 'javascript:alert(1)',
      url_demo: null,
      image: null,
      appris: '',
      a_readme: false,
      a_captures: false,
      a_tests: false,
      position: 0,
      created_at: '2026-11-18T09:00:00Z',
    },
  ];
  await page.goto('/portfolio');
  const carte = page.getByRole('article').filter({ hasText: 'Piège' });
  await expect(carte).toBeVisible();
  await expect(carte.getByRole('link')).toHaveCount(0);
});
