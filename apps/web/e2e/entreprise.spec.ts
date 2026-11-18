import { expect, OWNER_EMAIL, test } from './fixtures';

const ENTREPRISE = {
  id: 'co-1',
  nom: 'Hoshi Labs',
  pays: 'JP',
  ville: 'Tokyo',
  site: 'https://hoshi.example.test',
  contact_nom: 'Aiko T.',
  contact_email: 'aiko@example.test',
  contact_linkedin: null,
  notes: null,
  url_carriere: null,
  ats: null,
  slug: null,
};

test.beforeEach(async ({ backend }) => {
  backend.companies = [ENTREPRISE];
  backend.company_contacts = [
    {
      id: 'ct-1',
      company_id: 'co-1',
      nom: 'Aiko T.',
      role: 'Recrutement',
      email: 'aiko@example.test',
      linkedin: null,
      langue: 'en',
      notes: 'A proposé deux créneaux.',
      principal: true,
      dernier_echange: null,
      created_at: '2026-11-10T09:00:00Z',
    },
  ];
  await backend.signInAs(OWNER_EMAIL);
});

test('ouvre la fiche depuis le démarchage et ajoute un deuxième contact', async ({
  page,
  backend,
}) => {
  await page.goto('/demarchage');
  await page.getByRole('link', { name: 'Hoshi Labs' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Hoshi Labs' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Contacts · 1' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const aiko = page.getByRole('article', { name: 'Aiko T.' });
  await expect(aiko.getByRole('button', { name: 'Contact principal' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  await page.getByRole('button', { name: 'Ajouter un contact' }).click();
  const formulaire = page.getByRole('form', { name: 'Nouveau contact' });
  await formulaire.getByLabel('Nom').fill('Ken S.');
  await formulaire.getByLabel('Rôle').fill('Futur tuteur');
  await formulaire.getByLabel('E-mail').fill('ken@example.test');
  await formulaire.getByRole('button', { name: 'Enregistrer' }).click();

  await expect.poll(() => backend.company_contacts.length).toBe(2);
  expect(backend.company_contacts[1]).toMatchObject({
    company_id: 'co-1',
    nom: 'Ken S.',
    principal: false,
  });
});

test('rendre un contact principal le recopie sur l’entreprise', async ({ page, backend }) => {
  backend.company_contacts.push({
    id: 'ct-2',
    company_id: 'co-1',
    nom: 'Ken S.',
    role: 'Futur tuteur',
    email: 'ken@example.test',
    linkedin: null,
    langue: 'en',
    notes: null,
    principal: false,
    dernier_echange: null,
    created_at: '2026-11-11T09:00:00Z',
  });
  await page.goto('/entreprise?id=co-1');
  await page
    .getByRole('article', { name: 'Ken S.' })
    .getByRole('button', { name: 'Rendre principal' })
    .click();
  await expect.poll(() => backend.companies[0]?.contact_nom).toBe('Ken S.');
  expect(backend.companies[0]?.contact_email).toBe('ken@example.test');
});
