import { expect, OWNER_EMAIL, test } from './fixtures';

function fiche(overrides: Record<string, unknown>) {
  return {
    pays: 'JP',
    nom: 'Japon',
    contenu_md: "Points relevés avant vérification. Rien ci-dessous n'est confirmé.",
    liens: [
      {
        libelle: "Agence des services d'immigration du Japon",
        url: 'https://www.moj.go.jp/isa/index.html',
        officiel: true,
      },
    ],
    echeances: [],
    statut: 'a_verifier',
    derniere_verification: null,
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
  notifications: {
    seuil_push: 75,
    resume_quotidien: { actif: true, heure: '19:00', fuseau: 'Europe/Paris' },
    heures_calmes: { debut: '22:00', fin: '08:00' },
  },
  objectif_hebdo: 5,
  presentation: '',
};

test.describe('Fiches pays', () => {
  test.beforeEach(async ({ backend }) => {
    backend.country_sheets = [
      fiche({}),
      fiche({ pays: 'GB', nom: 'Royaume-Uni (Londres)', liens: [] }),
    ];
    await backend.signInAs(OWNER_EMAIL);
  });

  test('affiche la fiche à vérifier, ses liens officiels et les pistes du pays', async ({
    page,
  }) => {
    await page.goto('/pays');

    const article = page.getByRole('article', { name: 'Fiche : Japon' });
    await expect(article).toContainText('À vérifier');
    await expect(article).toContainText("Rien ci-dessous n'est confirmé");
    await expect(
      article.getByRole('link', { name: "Agence des services d'immigration du Japon" }),
    ).toHaveAttribute('href', 'https://www.moj.go.jp/isa/index.html');

    const pistes = page.getByRole('region', { name: 'Pistes pour trouver un stage' });
    await expect(pistes).toContainText('Programme Vulcanus in Japan');
    await expect(pistes).toContainText('Source : eu-japan.eu, lu le 13 octobre 2026.');
    await expect(pistes.getByRole('link', { name: 'Vulcanus in Japan' })).toHaveAttribute(
      'href',
      'https://www.eu-japan.eu/events/vulcanus-japan',
    );
    await expect(pistes.getByRole('link', { name: 'TokyoDev' })).toHaveAttribute(
      'rel',
      'noopener noreferrer',
    );
    await expect(pistes.getByRole('link', { name: 'Ouvrir le démarchage' })).toHaveAttribute(
      'href',
      '/demarchage',
    );

    // Londres fait partie des destinations.
    await page
      .getByRole('group', { name: 'Pays' })
      .getByRole('button', { name: 'Royaume-Uni' })
      .click();
    await expect(
      page.getByRole('article', { name: 'Fiche : Royaume-Uni (Londres)' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'LinkedIn : stages à Londres' })).toBeVisible();
  });

  test('corrige une fiche, ajoute une échéance et la marque comme vérifiée', async ({
    page,
    backend,
  }) => {
    await page.goto('/pays?pays=JP');
    const article = page.getByRole('article', { name: 'Fiche : Japon' });

    await article.getByRole('button', { name: 'Modifier la fiche' }).click();
    await article.getByLabel('Notes').fill('Réponse de l’ambassade reçue : voir le courriel.');
    await article.getByRole('button', { name: 'Ajouter une échéance' }).click();
    await article.getByLabel("Libellé de l'échéance 1").fill('Dépôt du dossier');
    await article.getByLabel("Date de l'échéance 1").fill('2027-03-15');
    await article.getByLabel("J'ai vérifié cette fiche aujourd'hui").check();
    await article.getByRole('button', { name: 'Enregistrer' }).click();

    await expect(article).toContainText('Vérifiée le');
    await expect(article).toContainText('15 mars 2027');
    await expect(article).toContainText('Dépôt du dossier');
    expect(backend.country_sheets[0]).toMatchObject({
      statut: 'verifie',
      contenu_md: 'Réponse de l’ambassade reçue : voir le courriel.',
      echeances: [{ libelle: 'Dépôt du dossier', date: '2027-03-15' }],
    });
    expect(backend.country_sheets[0]!.derniere_verification).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

test.describe('Démarchage', () => {
  test.beforeEach(async ({ backend }) => {
    backend.settings = structuredClone(REGLAGES);
    await backend.signInAs(OWNER_EMAIL);
  });

  test('ajoute une startup, prépare le message et note l’envoi dans le suivi', async ({
    page,
    backend,
  }) => {
    await page.goto('/demarchage');

    await expect(
      page
        .getByRole('region', { name: 'Où trouver des startups' })
        .getByRole('link', { name: 'Japan Dev : entreprises' }),
    ).toHaveAttribute('href', 'https://japan-dev.com/companies');

    await page
      .getByRole('textbox', { name: 'Ma présentation' })
      .fill('I am a computer science student in Lyon.');
    await page.getByRole('button', { name: 'Enregistrer la présentation' }).click();
    await expect(page.getByText('Enregistrée.')).toBeVisible();

    await page.getByRole('button', { name: 'Ajouter une entreprise' }).click();
    await page.getByLabel("Nom de l'entreprise").fill('Kumo Labs');
    await page.getByLabel('Pays').selectOption('JP');
    await page.getByLabel('Ville').fill('Tokyo');
    await page.getByLabel('Personne à contacter').fill('Aiko Tanaka');
    await page.getByLabel('Son adresse e-mail').fill('aiko@kumo.example.test');
    await page.getByRole('button', { name: "Ajouter l'entreprise" }).click();

    const carte = page.getByRole('article', { name: 'Kumo Labs' });
    await expect(carte).toContainText('Tokyo, Japon');
    await expect(carte).toContainText('Pas encore contactée');
    expect(backend.companies[0]).toMatchObject({ nom: 'Kumo Labs', nom_norm: 'kumo labs' });

    await carte.getByRole('button', { name: 'Préparer un message' }).click();
    const message = carte.getByLabel('Message', { exact: true });
    await expect(message).toHaveValue(/Hello Aiko,/);
    await expect(message).toHaveValue(/I am a computer science student in Lyon\./);
    await expect(message).toHaveValue(/Kumo Labs/);
    await expect(message).toHaveValue(/from June to August 2027/);
    await expect(carte).toContainText('Il reste des passages entre crochets');
    const messagerie = await carte
      .getByRole('link', { name: 'Ouvrir ma messagerie' })
      .getAttribute('href');
    expect(messagerie).toMatch(/^mailto:aiko@kumo\.example\.test\?subject=Software%20engineering/);

    await carte.getByLabel('Langue du message').selectOption('fr');
    await expect(message).toHaveValue(/Bonjour Aiko,/);

    await carte.getByRole('button', { name: "J'ai envoyé ce message" }).click();
    await expect(carte.getByRole('link', { name: 'Suivi : Postulé' })).toBeVisible();
    expect(backend.applications[0]).toMatchObject({
      company_id: backend.companies[0]!.id,
      statut: 'postule',
    });
    expect(backend.applications[0]!.prochaine_relance).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    await carte.getByRole('link', { name: 'Suivi : Postulé' }).click();
    const fenetre = page.getByRole('dialog', { name: 'Candidature spontanée' });
    await expect(fenetre).toContainText('Kumo Labs · Tokyo, Japon');
  });

  test('propose les entreprises déjà vues dans le fil', async ({ page, backend }) => {
    backend.offers = [
      {
        id: crypto.randomUUID(),
        source: 'greenhouse:exemple',
        titre: 'Software Engineer Intern',
        entreprise: 'Orbitane',
        pays: 'KR',
        ville: 'Séoul',
        type: 'stage',
        domaines: [],
        langues_requises: [],
        score: 80,
        score_details: [],
        exclue_raison: null,
        url: 'https://example.test/offre',
        created_at: '2026-01-01T00:00:00Z',
      },
    ];
    await page.goto('/demarchage');

    await page.getByRole('button', { name: 'Orbitane', exact: true }).click();
    await expect(page.getByRole('article', { name: 'Orbitane' })).toContainText('Corée du Sud');
    await expect(page.getByRole('button', { name: 'Orbitane', exact: true })).toHaveCount(0);
  });
});

test.describe('Réglages et sources', () => {
  test.beforeEach(async ({ backend }) => {
    backend.settings = structuredClone(REGLAGES);
    await backend.signInAs(OWNER_EMAIL);
  });

  test('change l’ordre des pays et refuse des poids dont le total ne fait pas 100', async ({
    page,
    backend,
  }) => {
    await page.goto('/reglages');

    await page.getByRole('button', { name: 'Monter Royaume-Uni' }).click();
    await page.getByLabel('Japonais').check();
    await page.getByLabel('Pays', { exact: true }).fill('25');
    await expect(page.getByText('Total : 110 / 100')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enregistrer les réglages' })).toBeDisabled();

    await page
      .getByLabel('Fraîcheur de l’annonce')
      .or(page.getByLabel("Fraîcheur de l'annonce"))
      .fill('0');
    await expect(page.getByText('Total : 100 / 100')).toBeVisible();
    await page.getByRole('button', { name: 'Enregistrer les réglages' }).click();

    await expect(page.getByRole('status')).toContainText('Réglages enregistrés');
    expect(backend.settings).toMatchObject({
      profil: { stage: { pays: ['JP', 'KR', 'CO', 'GB', 'CA'] }, langues: ['ja'] },
      poids: { pays: 25, fraicheur: 0 },
    });
  });

  test('montre l’état de chaque source et les sites à consulter à la main', async ({
    page,
    backend,
  }) => {
    backend.sources_status = [
      {
        source: 'greenhouse:moloco',
        debut: '2026-10-13T12:07:00Z',
        statut: 'ok',
        nb_offres: 4,
        nb_nouvelles: 1,
        erreurs: [],
      },
      {
        source: 'lever:waabi',
        debut: '2026-10-13T12:07:00Z',
        statut: 'erreur',
        nb_offres: 0,
        nb_nouvelles: 0,
        erreurs: ['HTTP 503'],
      },
      {
        source: 'greenhouse:moloco',
        debut: '2026-10-13T06:07:00Z',
        statut: 'erreur',
        nb_offres: 0,
        nb_nouvelles: 0,
        erreurs: ['ancienne erreur'],
      },
    ];
    await page.goto('/plus');
    await page.getByRole('link', { name: /Sources/ }).click();

    const collecte = page.getByRole('region', { name: 'Collecte automatique' });
    await expect(collecte).toContainText('2 sources, dont 1 à regarder');
    await expect(collecte).toContainText('4 annonces lues, 1 nouvelles offres gardées');
    await expect(collecte).toContainText('HTTP 503');
    await expect(collecte).not.toContainText('ancienne erreur');

    const manuel = page.getByRole('region', { name: 'Sites à consulter à la main' });
    await expect(manuel.getByRole('link', { name: 'Japan Dev' })).toBeVisible();
    await expect(manuel.getByRole('link', { name: 'LinkedIn : stages à Londres' })).toBeVisible();
  });
});
