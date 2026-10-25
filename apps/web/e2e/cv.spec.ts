import { expect, OWNER_EMAIL, test } from './fixtures';

const OFFRE = '77777777-7777-4777-8777-777777777777';

const PROFIL = {
  prenom: 'Camille',
  nom: 'Martin',
  titre: { fr: 'Développeuse web', en: 'Web developer' },
  resume: { fr: 'Étudiante en informatique.', en: 'Computer science student.' },
  email: 'camille@example.test',
  telephone: '+33 6 00 00 00 00',
  adresse: '1 rue de la Paix, 69000 Lyon',
  ville: 'Lyon',
  permis: { fr: 'Permis B' },
  experiences: [
    {
      poste: { fr: 'Stage développeuse', en: 'Developer intern' },
      entreprise: 'Exemple',
      lieu: 'Lyon',
      debut: '2025',
      fin: '2025',
      points: {
        fr: ['Support client', 'Développement React'],
        en: ['Customer support', 'React work'],
      },
    },
  ],
  formations: [],
  competences: ['TypeScript', 'React', 'MySQL'],
};

test.describe('Générateur de CV', () => {
  test.beforeEach(async ({ backend }) => {
    backend.settings = { objectif_hebdo: 5, presentation: '', cv: structuredClone(PROFIL) };
    await backend.signInAs(OWNER_EMAIL);
  });

  test('met le profil aux usages de chaque pays, avec leurs sources', async ({ page }) => {
    await page.goto('/plus');
    await page.getByRole('link', { name: /Générateur de CV/ }).click();

    // Japon par défaut : CV anglais, ville seule, sans permis.
    const feuille = page.getByTestId('cv-feuille');
    await expect(feuille).toContainText('Camille MARTIN');
    await expect(feuille).toContainText('Web developer');
    await expect(feuille).toContainText('Work experience');
    await expect(feuille).not.toContainText('rue de la Paix');
    await expect(page.getByText(/Indique ton statut de visa/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /Japan Dev : developer resume/ }).first(),
    ).toHaveAttribute('href', 'https://japan-dev.com/blog/developer-english-resume-japan');
    await expect(page.getByText('Autre format')).toBeVisible();

    // France : CV français, adresse complète et permis.
    await page.getByRole('group', { name: 'Pays' }).getByRole('button', { name: 'France' }).click();
    await expect(feuille).toContainText('Expériences professionnelles');
    await expect(feuille).toContainText('1 rue de la Paix, 69000 Lyon');
    await expect(feuille).toContainText('Permis B');

    // Colombie : rien en espagnol n'a été saisi, l'application le signale au lieu de traduire.
    await page
      .getByRole('group', { name: 'Pays' })
      .getByRole('button', { name: 'Colombie' })
      .click();
    await expect(page.getByText('Titre : pas de version espagnole.')).toBeVisible();
  });

  test("s'adapte à une offre sans ajouter de compétence", async ({ page, backend }) => {
    backend.offers = [
      {
        id: OFFRE,
        titre: 'Frontend Intern',
        entreprise: 'Exemple KK',
        pays: 'JP',
        description: 'Build features with React and TypeScript, deployed with Docker.',
        competences: [],
        langues_requises: ['ja'],
      },
    ];
    await page.goto(`/cv?offre=${OFFRE}`);

    const attentes = page.getByRole('heading', { name: "Ce que l'offre attend" }).locator('..');
    await expect(attentes).toContainText('Exemple KK : Frontend Intern');
    await expect(attentes).toContainText('docker');
    await expect(attentes).toContainText('Langue exigée que ton profil ne cite pas : Japonais');
    await expect(page.getByTestId('cv-feuille')).toContainText('TypeScript · React · MySQL');

    // Le point qui parle de React passe devant.
    await expect(page.getByTestId('cv-feuille').getByRole('listitem').first()).toHaveText(
      'React work',
    );

    await page.getByRole('button', { name: 'Noter dans Documents' }).click();
    await expect(page.getByRole('button', { name: 'Noté dans Documents' })).toBeDisabled();
    expect(backend.documents[0]).toMatchObject({
      type: 'cv',
      langue: 'en',
      titre: 'Resume Japon : Exemple KK, Frontend Intern',
      version: 1,
    });
  });

  test('enregistre le profil saisi dans chaque langue', async ({ page, backend }) => {
    await page.goto('/cv?onglet=profil');
    await page.getByRole('button', { name: 'Espagnol' }).click();
    await page.getByLabel('Titre (espagnol)').fill('Desarrolladora web');
    await page.getByRole('button', { name: 'Enregistrer le profil' }).click();
    await expect(page.getByText('Profil enregistré.')).toBeVisible();
    expect((backend.settings.cv as { titre: unknown }).titre).toEqual({
      fr: 'Développeuse web',
      en: 'Web developer',
      es: 'Desarrolladora web',
    });
  });
});
