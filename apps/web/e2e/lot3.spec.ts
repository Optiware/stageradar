import { expect, OWNER_EMAIL, test } from './fixtures';

function offre(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    titre: 'Software Engineer Intern',
    entreprise: 'Exemple',
    pays: 'JP',
    ville: 'Tokyo',
    type: 'stage',
    domaines: ['dev'],
    score: 80,
    score_details: [
      { critere: 'domaine', points: 30, max: 30, libelle: 'développement' },
      { critere: 'langue', points: -10, max: 10, libelle: 'japonais exigé' },
    ],
    exclue_raison: null,
    periode_compatible: true,
    langues_requises: [],
    url: 'https://example.test/offre',
    date_publication: '2026-10-10T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

const OFFRES = [
  offre({ titre: 'Stage backend à Tokyo', score: 92, langues_requises: ['ja'] }),
  offre({ titre: 'Stage DevOps à Toronto', pays: 'CA', ville: 'Toronto', score: 71 }),
  offre({ titre: 'Stage hiver à Séoul', pays: 'KR', ville: 'Séoul', periode_compatible: false }),
  offre({
    titre: 'Alternance cybersécurité',
    type: 'alternance',
    pays: 'FR',
    ville: 'Lyon',
    domaines: ['cyber'],
    periode_compatible: null,
    score: 64,
  }),
  offre({ titre: 'Finance Intern', domaines: [], score: 30, exclue_raison: 'Hors domaine' }),
  offre({ titre: 'Lien douteux', score: 10, url: 'javascript:alert(1)' }),
];

test.describe('Lot 3 — fil des offres', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = OFFRES;
    await backend.signInAs(OWNER_EMAIL);
  });

  test('liste les offres dans la cible, la mieux notée en premier', async ({ page }) => {
    await page.goto('/');

    const cartes = page.getByRole('article');
    await expect(cartes).toHaveCount(5);
    await expect(cartes.first()).toContainText('Stage backend à Tokyo');
    await expect(cartes.first()).toContainText('Exemple · Tokyo, Japon');
    await expect(cartes.first().getByLabel('Score 92 sur 100')).toBeVisible();
    await expect(cartes.first()).toContainText('Japonais exigé');
    await expect(page.getByText('Finance Intern')).toHaveCount(0);
  });

  test('filtre par onglet : Stage été ne garde que les stages compatibles', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('tab', { name: /Stage été/ }).click();
    await expect(page.getByRole('article')).toHaveCount(3);
    await expect(page.getByText('Stage DevOps à Toronto')).toBeVisible();
    await expect(page.getByText('Stage hiver à Séoul')).toHaveCount(0);
    await expect(page.getByText('Alternance cybersécurité')).toHaveCount(0);

    await page.getByRole('tab', { name: /Alternance/ }).click();
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText('Lyon, France');
  });

  test('affiche les offres hors cible sur demande, avec leur motif', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Afficher aussi les 1 offres hors cible').check();
    const carte = page.getByRole('article', { name: 'Finance Intern' });
    await expect(carte).toBeVisible();
    await expect(carte).toContainText('Hors domaine');
  });

  test('explique le score et renvoie vers l’annonce d’origine', async ({ page }) => {
    await page.goto('/');

    const carte = page.getByRole('article', { name: 'Stage backend à Tokyo' });
    await carte.getByText('Détail du score').click();
    await expect(carte).toContainText('+30/30');
    await expect(carte).toContainText('-10/10');
    await expect(carte).toContainText('japonais exigé');

    const lien = carte.getByRole('link', { name: /^Voir l.offre$/ });
    await expect(lien).toHaveAttribute('href', 'https://example.test/offre');
    await expect(lien).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('ne rend pas cliquable une adresse qui n’est pas un lien web', async ({ page }) => {
    await page.goto('/');

    const carte = page.getByRole('article', { name: 'Lien douteux' });
    await expect(carte).toBeVisible();
    await expect(carte.getByRole('link')).toHaveCount(0);
  });

  test('dit clairement quand il n’y a encore aucune offre', async ({ page, backend }) => {
    backend.offers = [];
    await page.goto('/');
    await expect(page.getByText('Aucune offre pour le moment.')).toBeVisible();
  });
});
