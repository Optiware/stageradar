import { expect, OWNER_EMAIL, test } from './fixtures';

const OFFRE = {
  id: 'offre-1',
  source: 'japan-dev',
  titre: 'Stage développeur backend (Go)',
  entreprise: 'Hoshi Labs',
  pays: 'JP',
  ville: 'Tokyo',
  url: 'https://example.test/offre',
  type: 'stage',
  actif: true,
};

const CANDIDATURE = {
  id: 'cand-1',
  offer_id: 'offre-1',
  company_id: null,
  statut: 'entretien',
  position: 1,
  date_candidature: '2026-11-09',
  prochaine_relance: null,
  notes: null,
  cv_document_id: null,
  lettre_document_id: null,
  contact_nom: 'Aiko T.',
  contact_email: null,
  notes_entretien: null,
  created_at: '2026-11-09T09:00:00Z',
};

test.beforeEach(async ({ backend }) => {
  backend.offers = [OFFRE];
  backend.applications = [CANDIDATURE];
  backend.events = [
    {
      id: 'ev-1',
      application_id: 'cand-1',
      type: 'entretien',
      titre: 'Entretien',
      date: '2027-01-20T07:00:00.000Z',
      details: { lien: 'https://meet.example.test/abc' },
      fait: false,
    },
  ];
  await backend.signInAs(OWNER_EMAIL);
});

test('montre l’heure chez moi et chez eux, et les questions de pages citées', async ({ page }) => {
  await page.goto('/entretien?candidature=cand-1');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Stage développeur backend (Go)' }),
  ).toBeVisible();
  await expect(page.getByText('Chez toi · Paris')).toBeVisible();
  await expect(page.getByText('Mer. 20 janv. · 08:00')).toBeVisible();
  await expect(page.getByText('Mer. 20 janv. · 16:00')).toBeVisible();
  await expect(page.getByLabel('Why did you choose to work in Japan?')).toBeVisible();
  await expect(page.getByRole('link', { name: /Japan Dev/ })).toHaveAttribute(
    'href',
    'https://japan-dev.com/blog/japan-job-interview-questions',
  );
});

test('enregistre la check-list, une réponse, une question et l’impression', async ({
  page,
  backend,
}) => {
  await page.goto('/entretien?candidature=cand-1');
  await page.getByLabel('Micro et caméra testés').check();
  await expect.poll(() => backend.interview_preps[0]?.checklist).toEqual({ micro: true });

  const reponse = page.getByLabel('Tell me about yourself.');
  await reponse.fill('I study engineering in France.');
  await reponse.blur();
  await expect
    .poll(() => (backend.interview_preps[0]?.reponses as Record<string, string>)['umbc-1'])
    .toBe('I study engineering in France.');

  await page.getByLabel('Nouvelle question').fill('How is code review organized?');
  await page.getByRole('button', { name: 'Ajouter une question' }).click();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'How is code review organized?' }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Bien', exact: true }).click();
  await expect.poll(() => backend.interview_preps[0]?.impression).toBe('bien');

  await page.getByLabel('Prochaine étape').selectOption('Offre');
  await expect.poll(() => backend.applications[0]?.statut).toBe('offre');
});

test('« Important » mène à la préparation de l’entretien', async ({ page }) => {
  await page.goto('/important');
  await page
    .getByRole('link', { name: /Hoshi Labs/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/entretien\?candidature=cand-1/);
});
