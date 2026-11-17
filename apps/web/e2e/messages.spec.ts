import { expect, OWNER_EMAIL, test } from './fixtures';

const OFFRE = {
  id: 'offre-1',
  source: 'japan-dev',
  titre: 'Stage développeur backend (Go)',
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
};

const CANDIDATURE = {
  id: 'cand-1',
  offer_id: 'offre-1',
  company_id: null,
  statut: 'postule',
  position: 1,
  date_candidature: '2026-11-09',
  prochaine_relance: '2026-11-16',
  notes: null,
  cv_document_id: null,
  lettre_document_id: null,
  contact_nom: 'Aiko T.',
  contact_email: null,
  notes_entretien: null,
  created_at: '2026-11-09T09:00:00Z',
};

const CONVERSATION = {
  id: 'conv-1',
  application_id: 'cand-1',
  contact_nom: 'Aiko T.',
  contact_role: 'Recrutement',
  contact_email: null,
  entreprise: 'Hoshi Labs',
  pays: 'JP',
  non_lu: true,
  created_at: '2026-11-09T09:00:00Z',
};

test.beforeEach(async ({ backend }) => {
  backend.offers = [OFFRE];
  backend.applications = [CANDIDATURE];
  backend.conversations = [CONVERSATION];
  backend.messages = [
    {
      id: 'm-1',
      conversation_id: 'conv-1',
      sens: 'envoye',
      corps: 'Hello Aiko, I would like to apply.',
      pieces: ['CV_EN_Japon.pdf'],
      date: '2026-11-09T09:12:00Z',
    },
    {
      id: 'm-2',
      conversation_id: 'conv-1',
      sens: 'recu',
      corps:
        'Hi! Could you do a call next week? Tuesday 17 Nov at 10:00 JST or Wednesday 18 Nov at 16:00 JST.',
      pieces: [],
      date: '2026-11-11T13:20:00Z',
    },
  ];
  await backend.signInAs(OWNER_EMAIL);
});

test('la navigation montre les réponses non lues et ouvre la conversation', async ({
  page,
  backend,
}) => {
  await page.goto('/');
  const onglet = page
    .getByRole('navigation', { name: 'Navigation principale' })
    .filter({ visible: true })
    .getByRole('link', { name: /Messages/ });
  await expect(onglet).toContainText('1');
  await onglet.click();

  await page.getByRole('link', { name: /Aiko T\./ }).click();
  await expect(page.getByRole('heading', { name: 'Aiko T.' })).toBeVisible();
  // Ouvrir la conversation la marque comme lue.
  await expect.poll(() => backend.conversations[0]?.non_lu).toBe(false);
});

test('les créneaux sont ramenés à l’heure de Paris et vont au calendrier', async ({
  page,
  backend,
}) => {
  await page.goto('/messages?c=conv-1');
  const creneaux = page.getByRole('group', { name: 'Créneaux à l’heure de Paris' });
  await expect(creneaux.getByText('02:00')).toBeVisible();
  await expect(creneaux.getByText('En pleine nuit chez toi')).toBeVisible();
  await expect(creneaux.getByText('08:00')).toBeVisible();
  await expect(creneaux.getByText('Libre dans ton agenda')).toBeVisible();

  await creneaux.getByRole('button', { name: 'Passer en « Entretien »' }).click();
  await expect.poll(() => backend.applications[0]?.statut).toBe('entretien');
  await expect
    .poll(() => backend.events.find((evenement) => evenement.type === 'entretien')?.date)
    .toBe('2026-11-18T07:00:00.000Z');
});

test('une réponse rapide se note dans le fil, une réponse collée annule la relance', async ({
  page,
  backend,
}) => {
  await page.goto('/messages?c=conv-1');
  await page.getByRole('button', { name: 'Accepter le créneau' }).click();
  await expect(page.getByLabel('Ta réponse')).toHaveValue(/18 Nov at 16:00 JST works well/);
  await page.getByRole('button', { name: 'Envoyer' }).click();
  await expect.poll(() => backend.messages.length).toBe(3);
  expect(backend.messages[2]).toMatchObject({ sens: 'envoye', conversation_id: 'conv-1' });

  await page.getByRole('button', { name: /Coller sa réponse/ }).click();
  await page.getByLabel('Réponse reçue').fill('Great, see you then!');
  await page.getByRole('button', { name: 'Ajouter la réponse' }).click();
  await expect.poll(() => backend.messages.length).toBe(4);
  await expect.poll(() => backend.applications[0]?.prochaine_relance).toBeNull();
});

test('« Écrire au recruteur » depuis une offre prépare une conversation', async ({
  page,
  backend,
}) => {
  backend.applications = [];
  backend.conversations = [];
  backend.messages = [];
  await page.goto('/?offre=offre-1');
  await page.getByRole('button', { name: 'Écrire au recruteur' }).click();

  await expect(page.getByRole('heading', { name: 'Nouvelle conversation' })).toBeVisible();
  await expect(page.getByLabel('Entreprise')).toHaveValue('Hoshi Labs');
  await page.getByLabel('Nom du contact').fill('Aiko T.');
  await page.getByRole('button', { name: 'Créer la conversation' }).click();
  await expect(page.getByRole('heading', { name: 'Aiko T.' })).toBeVisible();
  expect(backend.conversations[0]).toMatchObject({ contact_nom: 'Aiko T.', pays: 'JP' });
});
