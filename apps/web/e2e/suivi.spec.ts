import type { Page } from '@playwright/test';
import { expect, OWNER_EMAIL, test } from './fixtures';

const TOKYO = '11111111-1111-4111-8111-111111111111';
const LYON = '22222222-2222-4222-8222-222222222222';
const CANDIDATURE = '33333333-3333-4333-8333-333333333333';

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
    score_details: [],
    exclue_raison: null,
    periode_compatible: true,
    langues_requises: [],
    url: 'https://example.test/offre',
    date_publication: '2026-10-10T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    masquee: false,
    actif: true,
    description: 'We are hiring an intern for our backend team. You will work with the API.',
    ...overrides,
  };
}

function offres() {
  return [
    offre({ id: TOKYO, titre: 'Stage backend à Tokyo', score: 92 }),
    offre({
      id: LYON,
      titre: 'Alternance cybersécurité',
      entreprise: 'Autre société',
      type: 'alternance',
      pays: 'FR',
      ville: 'Lyon',
      score: 64,
    }),
  ];
}

function candidature(overrides: Record<string, unknown>) {
  return {
    id: CANDIDATURE,
    offer_id: TOKYO,
    statut: 'a_etudier',
    position: 1,
    date_candidature: null,
    prochaine_relance: null,
    notes: null,
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

/** Jour au format AAAA-MM-JJ, dans le fuseau de la machine (le même que celui du navigateur). */
function jour(decalage = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + decalage);
  const deux = (nombre: number) => String(nombre).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

function colonne(page: Page, nom: string) {
  return page.getByRole('region', { name: nom, exact: true });
}

test.describe('Suivi des candidatures', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = offres();
    await backend.signInAs(OWNER_EMAIL);
  });

  test('sauve une offre depuis le fil et la retrouve dans le suivi', async ({ page, backend }) => {
    await page.goto('/');
    const carte = page.getByRole('article', { name: 'Stage backend à Tokyo', exact: true });

    await carte.getByRole('button', { name: 'Sauver' }).click();
    await expect(carte.getByRole('link', { name: 'Dans le suivi' })).toBeVisible();
    expect(backend.applications).toHaveLength(1);
    expect(backend.applications[0]).toMatchObject({ offer_id: TOKYO, statut: 'a_etudier' });

    await page.getByRole('navigation').getByRole('link', { name: 'Suivi' }).click();
    await expect(colonne(page, 'À étudier').getByRole('article')).toHaveAccessibleName(
      'Stage backend à Tokyo',
    );
    await expect(colonne(page, 'Postulé').getByRole('article')).toHaveCount(0);
  });

  test('masque une offre, annule, puis la retrouve parmi les offres masquées', async ({
    page,
    backend,
  }) => {
    await page.goto('/');
    const cartes = page.locator('li > article');
    const carte = page.getByRole('article', { name: 'Alternance cybersécurité', exact: true });
    await expect(cartes).toHaveCount(2);

    await carte.getByRole('button', { name: 'Masquer' }).click();
    await expect(cartes).toHaveCount(1);
    expect(backend.offers.find((offre) => offre.id === LYON)).toMatchObject({ masquee: true });

    const message = page.getByRole('status').filter({ hasText: 'est masquée' });
    await message.getByRole('button', { name: 'Annuler' }).click();
    await expect(cartes).toHaveCount(2);
    await expect(message).toHaveCount(0);

    await carte.getByRole('button', { name: 'Masquer' }).click();
    await expect(cartes).toHaveCount(1);
    await page.getByLabel("Afficher aussi les 1 offres que j'ai masquées").check();
    await expect(carte).toContainText('Masquée');
    await carte.getByRole('button', { name: 'Réafficher' }).click();
    expect(backend.offers.find((offre) => offre.id === LYON)).toMatchObject({ masquee: false });
  });

  test('passer en « Postulé » date la candidature et propose une relance à J+7', async ({
    page,
    backend,
  }) => {
    backend.applications = [candidature({})];
    await page.goto('/suivi');

    await colonne(page, 'À étudier')
      .getByLabel('Colonne de « Stage backend à Tokyo »')
      .selectOption({ label: 'Postulé' });

    const carte = colonne(page, 'Postulé').getByRole('article');
    await expect(carte).toHaveAccessibleName('Stage backend à Tokyo');
    await expect(carte).toContainText('Relance le');
    expect(backend.applications[0]).toMatchObject({
      statut: 'postule',
      date_candidature: jour(),
      prochaine_relance: jour(7),
    });
    expect(backend.events).toHaveLength(1);
    expect(backend.events[0]).toMatchObject({
      type: 'statut',
      application_id: CANDIDATURE,
      details: { de: 'a_etudier', vers: 'postule' },
    });
  });

  test('glisse une carte vers une autre colonne', async ({ page, backend, isMobile }) => {
    test.skip(
      isMobile,
      'Le glisser-déposer se fait à la souris ; au doigt, on passe par la liste.',
    );
    backend.applications = [candidature({})];
    await page.goto('/suivi');

    await colonne(page, 'À étudier').getByRole('listitem').dragTo(colonne(page, 'À postuler'));
    await expect(colonne(page, 'À postuler').getByRole('article')).toHaveCount(1);
    expect(backend.applications[0]).toMatchObject({ statut: 'a_postuler' });
  });

  test('fixe un entretien : la carte change de colonne et l’entretien apparaît dans Important', async ({
    page,
    backend,
  }) => {
    backend.applications = [
      candidature({ statut: 'postule', date_candidature: jour(-2), prochaine_relance: jour(5) }),
    ];
    await page.goto('/suivi');

    await colonne(page, 'Postulé')
      .getByRole('button', { name: /Stage backend à Tokyo/ })
      .click();
    const fenetre = page.getByRole('dialog', { name: 'Stage backend à Tokyo' });
    await fenetre.getByLabel('Entretien (date et heure)').fill(`${jour(1)}T14:00`);
    await expect(fenetre.getByLabel('Colonne')).toHaveValue('entretien');
    await expect(fenetre.getByLabel('Prochaine relance')).toHaveValue('');
    await fenetre.getByLabel('Lien de la visio').fill('https://visio.example.test/salle');
    await fenetre.getByLabel('Notes').fill('Préparer une présentation de cinq minutes.');
    await fenetre.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(fenetre).toHaveCount(0);
    await expect(colonne(page, 'Entretien').getByRole('article')).toContainText(
      'Entretien demain à 14:00',
    );
    expect(backend.applications[0]).toMatchObject({
      statut: 'entretien',
      date_candidature: jour(-2),
      prochaine_relance: null,
      notes: 'Préparer une présentation de cinq minutes.',
    });
    expect(backend.events.find((evenement) => evenement.type === 'entretien')).toMatchObject({
      application_id: CANDIDATURE,
      details: { lien: 'https://visio.example.test/salle' },
    });

    await page.getByRole('navigation').getByRole('link', { name: 'Important' }).click();
    const entretiens = page.getByRole('region', { name: 'Entretiens à venir' });
    await expect(entretiens).toContainText('Exemple');
    await expect(entretiens).toContainText('demain à 14:00');
    await expect(entretiens.getByRole('link', { name: 'Rejoindre' })).toHaveAttribute(
      'href',
      'https://visio.example.test/salle',
    );
  });

  test('fait défiler les colonnes sans élargir la page', async ({ page, backend }) => {
    backend.applications = [candidature({ statut: 'refus' })];
    await page.goto('/suivi');

    await expect(colonne(page, 'Refus / Abandon').getByRole('article')).toHaveCount(1);
    const deborde = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(deborde).toBe(false);
  });

  test('retire une candidature du suivi après confirmation', async ({ page, backend }) => {
    backend.applications = [candidature({})];
    await page.goto(`/suivi?candidature=${CANDIDATURE}`);

    const fenetre = page.getByRole('dialog', { name: 'Stage backend à Tokyo' });
    await fenetre.getByRole('button', { name: 'Retirer du suivi' }).click();
    expect(backend.applications).toHaveLength(1);
    await fenetre.getByRole('button', { name: 'Confirmer le retrait' }).click();

    await expect(fenetre).toHaveCount(0);
    await expect(page.getByText('Aucune offre dans le suivi pour le moment.')).toBeVisible();
    expect(backend.applications).toHaveLength(0);
  });
});

test.describe('Important', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = [
      ...offres(),
      offre({ titre: 'Stage tout neuf', score: 88, created_at: new Date().toISOString() }),
      offre({ titre: 'Stage neuf mal noté', score: 40, created_at: new Date().toISOString() }),
    ];
    await backend.signInAs(OWNER_EMAIL);
  });

  test('affiche l’objectif de la semaine, les relances dues et les nouvelles offres', async ({
    page,
    backend,
  }) => {
    backend.applications = [
      candidature({ statut: 'postule', date_candidature: jour(), prochaine_relance: jour(-3) }),
      candidature({ id: crypto.randomUUID(), offer_id: LYON, statut: 'a_postuler', position: 2 }),
    ];
    await page.goto('/important');

    const objectif = page.getByRole('region', { name: 'Objectif de la semaine' });
    await expect(objectif).toContainText('1 / 5');
    await objectif.getByRole('button', { name: "Augmenter l'objectif" }).click();
    await expect(objectif).toContainText('1 / 6');
    expect(backend.settings).toMatchObject({ objectif_hebdo: 6 });

    const actions = page.getByRole('region', { name: 'Actions à faire' });
    await expect(actions.getByRole('link', { name: /Relancer Exemple/ })).toContainText(
      'Relance en retard de 3 j',
    );
    await expect(actions.getByRole('link', { name: /Postuler chez Autre société/ })).toBeVisible();

    const nouvelles = page.getByRole('region', { name: 'Nouvelles offres bien notées' });
    await expect(nouvelles.getByRole('link')).toHaveCount(1);
    await expect(nouvelles.getByRole('link')).toContainText('Stage tout neuf');

    await actions.getByRole('link', { name: /Relancer Exemple/ }).click();
    await expect(page.getByRole('dialog', { name: 'Stage backend à Tokyo' })).toBeVisible();
  });

  test('dit quand il n’y a rien à faire', async ({ page }) => {
    await page.goto('/important');

    await expect(page.getByRole('region', { name: 'Objectif de la semaine' })).toContainText(
      '0 / 5',
    );
    await expect(page.getByText('Aucun entretien prévu.')).toBeVisible();
    await expect(page.getByText("Rien à faire pour l'instant.")).toBeVisible();
  });
});
