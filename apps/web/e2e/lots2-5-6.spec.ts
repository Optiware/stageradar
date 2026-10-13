import { readFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';
import { expect, OWNER_EMAIL, test } from './fixtures';

const TOKYO = '11111111-1111-4111-8111-111111111111';
const LYON = '22222222-2222-4222-8222-222222222222';
const SEOUL = '55555555-5555-4555-8555-555555555555';

function jour(decalage = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + decalage);
  const deux = (nombre: number) => String(nombre).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}`;
}

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
    notes: null,
    description: 'We are hiring an intern for our backend team. You will work with the API.',
    ...overrides,
  };
}

function offres() {
  return [
    offre({ id: TOKYO, titre: 'Stage backend à Tokyo', score: 92, langues_requises: ['ja'] }),
    offre({
      id: SEOUL,
      titre: 'Stage DevOps à Séoul',
      entreprise: 'Orbitane',
      pays: 'KR',
      ville: 'Séoul',
      domaines: ['devops'],
      teletravail: 'hybride',
      score: 78,
    }),
    offre({
      id: LYON,
      titre: 'Alternance cybersécurité',
      entreprise: 'Autre société',
      type: 'alternance',
      pays: 'FR',
      ville: 'Lyon',
      domaines: ['cyber'],
      score: 45,
    }),
  ];
}

function candidature(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    offer_id: TOKYO,
    company_id: null,
    statut: 'a_etudier',
    position: 1,
    date_candidature: null,
    prochaine_relance: null,
    notes: null,
    cv_document_id: null,
    lettre_document_id: null,
    contact_nom: null,
    contact_email: null,
    notes_entretien: null,
    created_at: '2026-10-01T00:00:00Z',
    ...overrides,
  };
}

const REGLAGES = {
  profil: {
    alternance: { rentree: '2027-09-01', villes: [], rayon_km: 30, rythme: null },
    stage: { debut: '2027-06-01', fin: '2027-08-31', pays: ['JP', 'KR', 'CO', 'CA', 'GB'] },
    langues: [],
  },
  poids: { domaine: 30, periode: 20, pays: 15, niveau: 15, langue: 10, fraicheur: 10 },
  notifications: { seuil_push: 75 },
  objectif_hebdo: 5,
  presentation: '',
};

async function ouvrirDetail(page: Page, isMobile: boolean, titre: string) {
  await page.goto('/');
  if (isMobile) await page.getByRole('article', { name: titre, exact: true }).click();
  return page.getByRole('article', { name: `Détail : ${titre}` });
}

test.describe('Fil : filtres, notes, candidature', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = offres();
    await backend.signInAs(OWNER_EMAIL);
  });

  test('filtre par domaine, organisation, score et langue', async ({ page }) => {
    await page.goto('/');
    const cartes = page.locator('li > article');
    await expect(cartes).toHaveCount(3);

    await page.getByRole('button', { name: 'Filtres' }).click();
    const filtres = page.getByRole('group', { name: 'Filtres', exact: true });

    await filtres.getByRole('button', { name: 'Cyber' }).click();
    await expect(cartes).toHaveCount(1);
    await expect(cartes).toContainText('Alternance cybersécurité');
    await expect(page.getByRole('button', { name: 'Filtres (1)' })).toBeVisible();

    await filtres.getByRole('button', { name: 'Effacer les filtres' }).click();
    await expect(cartes).toHaveCount(3);

    await filtres.getByLabel('Score minimum').selectOption('75');
    await expect(cartes).toHaveCount(2);
    await filtres.getByLabel('Sans japonais, coréen ni espagnol exigé').check();
    await expect(cartes).toHaveCount(1);
    await expect(cartes).toContainText('Stage DevOps à Séoul');
    await filtres.getByRole('button', { name: 'Hybride' }).click();
    await expect(cartes).toHaveCount(1);
    await filtres.getByRole('button', { name: 'Hybride' }).click();
    await filtres.getByRole('button', { name: 'Télétravail' }).click();
    await expect(page.getByText('Aucune offre ne correspond à ces filtres.')).toBeVisible();
  });

  test('garde une note sur une offre', async ({ page, backend, isMobile }) => {
    const detail = await ouvrirDetail(page, isMobile, 'Stage backend à Tokyo');

    await detail.getByLabel('Mes notes sur cette offre').fill('Demander la durée exacte.');
    await detail.getByRole('button', { name: 'Enregistrer la note' }).click();
    await expect(detail.getByText('Note enregistrée.')).toBeVisible();
    expect(backend.offers.find((autre) => autre.id === TOKYO)).toMatchObject({
      notes: 'Demander la durée exacte.',
    });
  });

  test('demande « As-tu postulé ? » après un clic sur Postuler', async ({
    page,
    backend,
    isMobile,
  }) => {
    const detail = await ouvrirDetail(page, isMobile, 'Stage backend à Tokyo');

    // L'annonce s'ouvre dans un autre onglet : on le referme pour revenir à l'application.
    const [onglet] = await Promise.all([
      page.waitForEvent('popup'),
      detail.getByRole('link', { name: 'Postuler' }).click(),
    ]);
    await onglet.close();

    const question = detail.getByRole('group', { name: 'As-tu postulé ?' });
    await question.getByRole('button', { name: "Oui, c'est envoyé" }).click();
    await expect(question).toHaveCount(0);
    await expect(detail).toContainText('Statut dans ton suivi : Postulé');
    expect(backend.applications[0]).toMatchObject({
      offer_id: TOKYO,
      statut: 'postule',
      date_candidature: jour(),
      prochaine_relance: jour(7),
    });
  });

  test('reste consultable hors ligne après une première visite', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.locator('li > article')).toHaveCount(3);
    // Le temps que les données lues soient gardées sur l'appareil et que l'application
    // elle-même soit installée par le service worker.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForTimeout(1500);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('li > article')).toHaveCount(3);
    await expect(page.getByRole('status').filter({ hasText: 'Hors ligne' })).toBeVisible();
  });
});

test.describe('Suivi en liste, calendrier, statistiques', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = offres();
    backend.settings = structuredClone(REGLAGES);
    const entretien = new Date();
    entretien.setDate(entretien.getDate() + 2);
    entretien.setHours(10, 30, 0, 0);
    backend.applications = [
      candidature({
        id: 'c-tokyo',
        statut: 'entretien',
        date_candidature: jour(-10),
        position: 1,
      }),
      candidature({
        id: 'c-seoul',
        offer_id: SEOUL,
        statut: 'postule',
        date_candidature: jour(),
        prochaine_relance: jour(7),
        position: 2,
      }),
      candidature({ id: 'c-lyon', offer_id: LYON, statut: 'refus', date_candidature: jour(-20) }),
    ];
    backend.events = [
      {
        id: 'e-1',
        application_id: 'c-tokyo',
        type: 'entretien',
        titre: 'Entretien',
        date: entretien.toISOString(),
        details: { lien: 'https://visio.example.test/salle' },
        fait: false,
      },
    ];
    backend.country_sheets = [
      {
        pays: 'CA',
        nom: 'Canada',
        contenu_md: '',
        liens: [],
        echeances: [{ libelle: 'Ouverture de la saison', date: jour(30) }],
        statut: 'a_verifier',
        derniere_verification: null,
      },
    ];
    await backend.signInAs(OWNER_EMAIL);
  });

  test('liste les candidatures et les filtre par étape', async ({ page }) => {
    await page.goto('/suivi');
    await page
      .getByRole('group', { name: 'Affichage' })
      .getByRole('button', { name: 'Liste' })
      .click();

    const liste = page.getByRole('list', { name: 'Mes candidatures' });
    await expect(liste.getByRole('listitem')).toHaveCount(3);
    await expect(liste.getByRole('listitem').first()).toContainText('Orbitane');
    await expect(liste.getByRole('listitem').first()).toContainText('Relance le');

    await page
      .getByRole('group', { name: 'Étape' })
      .getByRole('button', { name: /Entretien/ })
      .click();
    await expect(liste.getByRole('listitem')).toHaveCount(1);
    await expect(liste).toContainText('Entretien');
    await liste.getByRole('button').click();
    await expect(page.getByRole('dialog', { name: 'Stage backend à Tokyo' })).toBeVisible();
  });

  test('rassemble les dates et les exporte vers l’agenda', async ({ page }) => {
    await page.goto('/calendrier');

    await expect(page.getByText('Entretien : Exemple')).toBeVisible();
    await expect(page.getByText('Relancer Orbitane')).toBeVisible();
    await expect(page.getByText('Canada : Ouverture de la saison')).toBeVisible();
    await expect(page.getByText('Début du stage visé')).toBeVisible();

    const [fichier] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exporter vers mon agenda (.ics)' }).click(),
    ]);
    expect(fichier.suggestedFilename()).toBe('stageradar.ics');
    const ics = await readFile(await fichier.path(), 'utf8');
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('SUMMARY:Entretien : Exemple');
    expect(ics).toContain('URL:https://visio.example.test/salle');
    expect(ics).toContain('SUMMARY:Relancer Orbitane');
    expect(ics).toContain('TRIGGER:-PT1H');
  });

  test('calcule les envois et le taux de réponse', async ({ page }) => {
    await page.goto('/statistiques');

    const chiffre = (nom: string) =>
      page.locator('dl > div').filter({ has: page.getByText(nom, { exact: true }) });
    await expect(chiffre('Envoyées')).toContainText('3');
    await expect(chiffre('Réponses')).toContainText('2');
    await expect(chiffre('Taux de réponse')).toContainText('67 %');

    const tableau = page.getByRole('region', { name: 'Ce qui fonctionne' });
    await expect(tableau.getByRole('row', { name: /Japon/ })).toContainText('100 %');
    await expect(tableau.getByRole('row', { name: /Corée du Sud/ })).toContainText('0 %');
  });
});

test.describe('Documents et données', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = offres();
    backend.settings = structuredClone(REGLAGES);
    backend.applications = [candidature({ id: 'c-tokyo', statut: 'postule' })];
    await backend.signInAs(OWNER_EMAIL);
  });

  test('enregistre une version de CV et la rattache à une candidature', async ({
    page,
    backend,
  }) => {
    await page.goto('/documents');
    await page.getByLabel('Titre').fill('Développeur backend');
    await page.getByLabel('Version').fill('2');
    await page.getByRole('button', { name: 'Ajouter le document' }).click();
    await expect(page.getByText('CV anglais v2 : Développeur backend')).toBeVisible();

    await page.goto('/suivi?candidature=c-tokyo');
    const fenetre = page.getByRole('dialog', { name: 'Stage backend à Tokyo' });
    await fenetre
      .getByLabel('CV envoyé')
      .selectOption({ label: 'CV anglais v2 : Développeur backend' });
    await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(fenetre).toHaveCount(0);
    expect(backend.applications[0]).toMatchObject({ cv_document_id: backend.documents[0]!.id });
  });

  test('exporte une sauvegarde qui se réimporte sans perte', async ({ page, backend }) => {
    backend.companies = [{ id: 'soc-1', nom: 'Kumo Labs', pays: 'JP', ville: 'Tokyo' }];
    await page.goto('/donnees');

    const [json] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Télécharger la sauvegarde (.json)' }).click(),
    ]);
    const chemin = await json.path();
    const sauvegarde = JSON.parse(await readFile(chemin, 'utf8'));
    expect(sauvegarde).toMatchObject({ format: 'stageradar', version: 1 });
    expect(sauvegarde.applications).toHaveLength(1);
    expect(sauvegarde.companies).toEqual(backend.companies);

    const [csv] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Télécharger les candidatures (.csv)' }).click(),
    ]);
    const tableur = await readFile(await csv.path(), 'utf8');
    expect(tableur).toContain('"Exemple";"Stage backend à Tokyo";"JP";"Tokyo";"Postulé"');

    // La base est vidée, puis la sauvegarde est réimportée.
    const avant = structuredClone(backend.applications);
    backend.applications = [];
    backend.companies = [];
    await page.getByLabel('Fichier de sauvegarde').setInputFiles(chemin);
    await expect(page.getByText('Sauvegarde réimportée.')).toBeVisible();
    expect(backend.applications).toEqual(avant);
    expect(backend.companies).toHaveLength(1);
    expect(backend.companies[0]).toMatchObject({ id: 'soc-1', nom: 'Kumo Labs', pays: 'JP' });
  });

  test('refuse un fichier qui n’est pas une sauvegarde', async ({ page }) => {
    await page.goto('/donnees');
    await page.getByLabel('Fichier de sauvegarde').setInputFiles({
      name: 'autre.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"format":"autre"}'),
    });
    await expect(page.getByRole('alert')).toHaveText(
      "Ce fichier n'est pas une sauvegarde de StageRadar.",
    );
  });
});
