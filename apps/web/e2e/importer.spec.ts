import { expect, OWNER_EMAIL, test } from './fixtures';

const ID = '66666666-6666-4666-8666-666666666666';

test.describe('Lot 4 — import manuel', () => {
  test.beforeEach(async ({ backend }) => {
    await backend.signInAs(OWNER_EMAIL);
  });

  test('importe une offre par son adresse et propose de l’ouvrir', async ({ page, backend }) => {
    backend.apiReponses['/importer'] = {
      corps: { id: ID, nouvelle: true, origine: 'page', titre: 'Software Engineer Intern' },
    };
    await page.goto('/plus');
    await page.getByRole('link', { name: /Importer une offre/ }).click();

    await page.getByLabel("Adresse de l'annonce").fill('https://carrieres.exemple.test/postes/42');
    await page.getByRole('button', { name: "Importer l'offre" }).click();

    const resultat = page.getByRole('status');
    await expect(resultat).toContainText('Offre ajoutée : « Software Engineer Intern »');
    await expect(resultat).toContainText("lues sur la page de l'annonce");
    await expect(resultat.getByRole('link', { name: "Voir l'offre" })).toHaveAttribute(
      'href',
      `/?offre=${ID}`,
    );
    expect(backend.api).toEqual([
      {
        chemin: '/importer',
        corps: { url: 'https://carrieres.exemple.test/postes/42', titre: null, texte: null },
      },
    ]);
  });

  test('arrive déjà rempli depuis le bouton « Partager » d’Android', async ({ page, backend }) => {
    backend.apiReponses['/importer'] = {
      corps: { id: ID, nouvelle: true, origine: 'partage', titre: 'Backend Intern' },
    };
    // Certaines applications mettent l'adresse dans le texte partagé plutôt que dans `url`.
    await page.goto(
      '/importer?titre=Backend%20Intern&texte=Vu%20ici%20https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F123',
    );

    await expect(page.getByLabel("Adresse de l'annonce")).toHaveValue(
      'https://www.linkedin.com/jobs/view/123',
    );
    await expect(page.getByLabel(/^Titre/)).toHaveValue('Backend Intern');
    await expect(page.getByText("L'offre sera créée avec le titre et le texte")).toBeVisible();

    await page.getByRole('button', { name: "Importer l'offre" }).click();
    await expect(page.getByRole('status')).toContainText('Ce site interdit la lecture automatique');
    expect(backend.api[0]!.corps).toMatchObject({
      url: 'https://www.linkedin.com/jobs/view/123',
      titre: 'Backend Intern',
    });
  });

  test('explique une adresse refusée', async ({ page, backend }) => {
    backend.apiReponses['/importer'] = {
      statut: 400,
      corps: { message: "Aucune adresse web valide n'a été fournie." },
    };
    await page.goto('/importer');
    await page.getByLabel("Adresse de l'annonce").fill('https://exemple.test/x');
    await page.getByRole('button', { name: "Importer l'offre" }).click();
    await expect(page.getByRole('alert')).toHaveText("Aucune adresse web valide n'a été fournie.");
  });

  test('déclare l’application comme cible de partage', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="manifest"]').getAttribute('href');
    const manifeste = await (await request.get(href!)).json();
    expect(manifeste.share_target).toEqual({
      action: '/importer',
      method: 'GET',
      params: { title: 'titre', text: 'texte', url: 'url' },
    });
  });

  test('lance une collecte depuis l’écran des sources', async ({ page, backend }) => {
    backend.apiReponses['/collecter'] = {
      corps: { sources: 37, en_erreur: 1, lues: 7605, retenues: 34, nouvelles: 5 },
    };
    await page.goto('/sources');
    await page.getByRole('button', { name: 'Lancer une collecte maintenant' }).click();
    await expect(
      page.getByText(
        'Collecte terminée : 7605 annonces lues, 34 offres dans ta cible, dont 5 nouvelles ; 1 sources en erreur.',
      ),
    ).toBeVisible();
  });
});
