import { expect, OWNER_EMAIL, test } from './fixtures';

// Exemple écrit pour le test, pas une vraie alerte.
const ALERTE = `<html><body>
<a href="https://www.linkedin.com/comm/jobs/view/4012345678/?refId=1">Backend Intern</a>
<p>Hoshi Labs · Tokyo</p>
<a href="https://jp.indeed.com/rc/clk?jk=0a1b2c3d4e5f6a7b">Software Engineer Intern</a>
</body></html>`;

test('repère les offres d’une alerte collée et les importe après vérification', async ({
  page,
  backend,
}) => {
  backend.apiReponses['/importer'] = {
    corps: { id: 'o-1', nouvelle: true, origine: 'partage', titre: 'Backend Intern' },
  };
  await backend.signInAs(OWNER_EMAIL);
  await page.goto('/sources');
  const section = page.getByRole('region', { name: 'LinkedIn et Indeed' });
  await section.getByLabel('Contenu de l’alerte').fill(ALERTE);
  await section.getByRole('button', { name: 'Repérer les offres' }).click();
  await expect(section.getByText('2 offres repérées')).toBeVisible();

  await section.getByRole('checkbox', { name: /Software Engineer Intern/ }).uncheck();
  await section
    .getByRole('textbox', { name: 'Titre de l’offre' })
    .first()
    .fill('Backend Intern (Go)');
  await section.getByRole('button', { name: 'Importer 1 offre' }).click();
  await expect(section.getByText('1 offre importée')).toBeVisible();
  expect(backend.api).toEqual([
    {
      chemin: '/importer',
      corps: {
        url: 'https://www.linkedin.com/jobs/view/4012345678/',
        titre: 'Backend Intern (Go)',
        texte: null,
      },
    },
  ]);
});

test('prépare les recherches LinkedIn et Indeed pour créer une alerte', async ({
  page,
  backend,
}) => {
  await backend.signInAs(OWNER_EMAIL);
  await page.goto('/sources');
  const section = page.getByRole('region', { name: 'LinkedIn et Indeed' });
  await section.getByLabel('Domaine').selectOption('cyber');
  await section.getByLabel('Lieu').selectOption('KR');
  await expect(
    section.getByRole('link', { name: /LinkedIn : « security intern »/ }),
  ).toHaveAttribute(
    'href',
    'https://www.linkedin.com/jobs/search/?keywords=security+intern&location=South+Korea',
  );
  await expect(section.getByRole('link', { name: /Indeed : « security intern »/ })).toHaveAttribute(
    'href',
    'https://kr.indeed.com/jobs?q=security+intern&l=South+Korea',
  );
});
