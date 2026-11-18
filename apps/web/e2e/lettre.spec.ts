import { expect, OWNER_EMAIL, test } from './fixtures';

const OFFRE = {
  id: 'offre-1',
  source: 'japan-dev',
  titre: 'Backend internship (Go)',
  entreprise: 'Hoshi Labs',
  pays: 'JP',
  ville: 'Tokyo',
  teletravail: null,
  type: 'stage',
  contrat: null,
  domaines: ['dev'],
  date_debut: '2027-06-01',
  duree_semaines: 12,
  remuneration_texte: null,
  score: 94,
  score_details: [],
  exclue_raison: null,
  periode_compatible: true,
  langues_requises: [],
  url: 'https://example.test/offre',
  date_publication: new Date().toISOString(),
  masquee: false,
  actif: true,
  created_at: new Date().toISOString(),
  description: 'Go, PostgreSQL and Docker.',
};

test.beforeEach(async ({ backend }) => {
  backend.offers = [OFFRE];
  backend.settings.cv = { prenom: 'Camille', nom: 'Martin' };
  backend.projects = [
    {
      id: 'p-1',
      titre: 'StageRadar',
      description: '',
      technologies: ['React', 'PostgreSQL', 'Docker'],
      statut: 'en_cours',
      url_code: null,
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
  await backend.signInAs(OWNER_EMAIL);
});

test('« Préparer ma candidature » ouvre un e-mail prérempli à personnaliser', async ({
  page,
  backend,
}) => {
  await page.goto('/?offre=offre-1');
  await page.getByRole('button', { name: 'Préparer ma candidature' }).click();
  await expect(page).toHaveURL(/\/lettre\?offre=offre-1/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Préparer ta candidature' }),
  ).toBeVisible();
  expect(backend.applications[0]).toMatchObject({ offer_id: 'offre-1', statut: 'a_postuler' });

  const texte = page.getByRole('group', { name: 'Texte du message' });
  await expect(texte).toContainText(
    "I'm applying for the Backend internship (Go) position at Hoshi Labs, from June 2027 (12 weeks).",
  );
  await expect(texte).toContainText('Recently I built StageRadar (PostgreSQL, Docker).');
  await expect(texte).toContainText('Camille Martin');
  await expect(page.getByRole('status').filter({ hasText: 'à personnaliser' })).toContainText(
    'Encore 3 parties',
  );
  await expect(page.getByRole('button', { name: 'Copier' })).toBeDisabled();

  const passages = texte.getByRole('textbox');
  await passages.nth(0).fill('I study engineering in France.');
  await passages.nth(1).fill('Your platform team ships fast.');
  await passages.nth(2).fill('I want to learn Go in production.');
  await expect(page.getByRole('status').filter({ hasText: 'Prêt' })).toBeVisible();

  await page.getByLabel('Destinataire').fill('aiko@example.test');
  const lien = page.getByRole('link', { name: 'Ouvrir dans ma messagerie' });
  await expect(lien).toHaveAttribute('href', /^mailto:aiko@example\.test\?subject=Application/);
});

test('passe en français et en message LinkedIn', async ({ page }) => {
  await page.goto('/lettre?offre=offre-1');
  await page.getByRole('radio', { name: 'Français' }).click();
  await page.getByLabel(/Message LinkedIn/).check();
  const texte = page.getByRole('group', { name: 'Texte du message' });
  await expect(texte).toContainText('Auriez-vous quelques minutes pour en parler ?');
  await expect(page.getByText('Objet', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Ouvrir dans ma messagerie' })).toHaveCount(0);
});
