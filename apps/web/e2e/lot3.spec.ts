import { expect, OWNER_EMAIL, test } from './fixtures';

function offre(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    source: 'greenhouse:exemple',
    titre: 'Software Engineer Intern',
    entreprise: 'Exemple',
    pays: 'JP',
    ville: 'Tokyo',
    teletravail: null,
    type: 'stage',
    contrat: 'stage',
    domaines: ['dev'],
    date_debut: null,
    duree_semaines: null,
    remuneration_texte: null,
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
    description: 'Tu rejoindras une équipe de trois personnes.\n\nMissions : API et tests.',
    ...overrides,
  };
}

const OFFRES = [
  offre({
    titre: 'Stage backend à Tokyo',
    score: 92,
    langues_requises: ['ja'],
    teletravail: 'hybride',
    remuneration_texte: '250 000 JPY par mois',
  }),
  offre({ titre: 'Stage DevOps à Toronto', pays: 'CA', ville: 'Toronto', score: 71 }),
  offre({ titre: 'Stage hiver à Séoul', pays: 'KR', ville: 'Séoul', periode_compatible: false }),
  offre({
    titre: 'Alternance cybersécurité',
    entreprise: 'Autre société',
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

    const cartes = page.locator('li > article');
    await expect(cartes).toHaveCount(5);
    await expect(cartes.first()).toContainText('Stage backend à Tokyo');
    await expect(cartes.first()).toContainText('Exemple');
    await expect(cartes.first()).toContainText('Tokyo, Japon');
    await expect(cartes.first().getByLabel('Score 92 sur 100')).toBeVisible();
    await expect(cartes.first()).toContainText('Japonais exigé');
    await expect(cartes.first()).toContainText('Hybride');
    await expect(cartes.first()).toContainText('250 000 JPY par mois');
    await expect(page.getByRole('article', { name: 'Finance Intern', exact: true })).toHaveCount(0);
  });

  test('filtre par onglet : Stage été ne garde que les stages compatibles', async ({ page }) => {
    await page.goto('/');
    const cartes = page.locator('li > article');

    await page.getByRole('tab', { name: /Stage été/ }).click();
    await expect(cartes).toHaveCount(3);
    await expect(
      page.getByRole('article', { name: 'Stage DevOps à Toronto', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('article', { name: 'Stage hiver à Séoul', exact: true }),
    ).toHaveCount(0);

    await page.getByRole('tab', { name: /Alternance/ }).click();
    await expect(cartes).toHaveCount(1);
    await expect(cartes).toContainText('Lyon, France');
  });

  test('filtre par pays, plusieurs à la fois, avec le nombre d’offres', async ({ page }) => {
    await page.goto('/');
    const cartes = page.locator('li > article');
    const pays = page.getByRole('group', { name: 'Pays' });

    await pays.getByRole('button', { name: 'Canada 1' }).click();
    await expect(cartes).toHaveCount(1);
    await expect(cartes).toContainText('Stage DevOps à Toronto');

    await pays.getByRole('button', { name: 'Japon 2' }).click();
    await expect(cartes).toHaveCount(3);
    await expect(pays.getByRole('button', { name: 'Japon 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(pays.getByRole('button', { name: 'Colombie 0' })).toBeVisible();
  });

  test('cherche dans l’intitulé, l’entreprise et la ville, sans tenir compte des accents', async ({
    page,
  }) => {
    await page.goto('/');
    const cartes = page.locator('li > article');

    await page.getByLabel('Rechercher une offre').fill('seoul');
    await expect(cartes).toHaveCount(1);
    await expect(cartes).toContainText('Stage hiver à Séoul');

    await page.getByLabel('Rechercher une offre').fill('rien de tel');
    await expect(page.getByText('Aucune offre ne correspond à ces filtres.')).toBeVisible();
  });

  test('affiche les offres hors cible sur demande, avec leur motif', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Afficher aussi les 1 offres hors cible').check();
    const carte = page.getByRole('article', { name: 'Finance Intern', exact: true });
    await expect(carte).toBeVisible();
    await expect(carte).toContainText('Hors domaine');
  });

  test('ouvre le détail : résumé, score expliqué, description et bouton pour postuler', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/');
    const detail = page.getByRole('article', { name: 'Détail : Stage backend à Tokyo' });

    if (isMobile) {
      // Sur téléphone, la liste d'abord ; le détail remplace la liste.
      await expect(detail).toHaveCount(0);
      await page.getByRole('article', { name: 'Stage backend à Tokyo', exact: true }).click();
      await expect(page.locator('li > article').first()).toBeHidden();
    }
    // Sur grand écran, la première offre est déjà ouverte à droite de la liste.
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('+30/30');
    await expect(detail).toContainText('-10/10');
    await expect(detail).toContainText('japonais exigé');
    await expect(detail).toContainText('Missions : API et tests.');
    await expect(detail).toContainText('Greenhouse');
    await expect(detail.getByRole('link', { name: 'Stage DevOps à Toronto' })).toBeVisible();

    const postuler = detail.getByRole('link', { name: 'Postuler' });
    await expect(postuler).toHaveAttribute('href', 'https://example.test/offre');
    await expect(postuler).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(postuler).toHaveAttribute('target', '_blank');

    if (isMobile) {
      await page.getByRole('link', { name: 'Retour aux offres' }).click();
      await expect(page.locator('li > article')).toHaveCount(5);
      await expect(detail).toHaveCount(0);
    } else {
      await page.getByRole('article', { name: 'Stage DevOps à Toronto', exact: true }).click();
      await expect(
        page.getByRole('article', { name: 'Détail : Stage DevOps à Toronto' }),
      ).toBeVisible();
      // La liste reste affichée à côté du détail.
      await expect(page.locator('li > article')).toHaveCount(5);
    }
  });

  test('ne rend pas cliquable une adresse qui n’est pas un lien web', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('article', { name: 'Lien douteux', exact: true }).click();
    const detail = page.getByRole('article', { name: 'Détail : Lien douteux' });
    await expect(detail).toContainText("n'est pas une adresse web valide");
    await expect(detail.getByRole('link', { name: 'Postuler' })).toHaveCount(0);
  });

  test('propose Welcome to the Jungle en recherche pré-remplie dans l’onglet Alternance', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Alternance/ }).click();

    const bloc = page.getByRole('region', { name: 'Recherches sur Welcome to the Jungle' });
    await expect(bloc.getByRole('link')).toHaveCount(3);
    const lien = bloc.getByRole('link', { name: 'Cybersécurité' });
    const adresse = new URL((await lien.getAttribute('href'))!);
    expect(adresse.origin + adresse.pathname).toBe('https://www.welcometothejungle.com/fr/jobs');
    expect(adresse.searchParams.get('query')).toBe('cybersécurité');
    expect(adresse.searchParams.get('refinementList[contract_type][]')).toBe('apprenticeship');
    await expect(lien).toHaveAttribute('rel', 'noopener noreferrer');

    await page.getByRole('tab', { name: /Stage été/ }).click();
    await expect(bloc).toHaveCount(0);
  });

  test('dit clairement quand il n’y a encore aucune offre', async ({ page, backend }) => {
    backend.offers = [];
    await page.goto('/');
    await expect(page.getByText('Aucune offre pour le moment.')).toBeVisible();
  });
});
