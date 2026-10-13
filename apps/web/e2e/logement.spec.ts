import { expect, OWNER_EMAIL, test } from './fixtures';

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

test.describe('Lot 8 — logement et budget', () => {
  test.beforeEach(async ({ backend }) => {
    backend.settings = structuredClone(REGLAGES);
    await backend.signInAs(OWNER_EMAIL);
  });

  test('propose des sites par pays et suit un logement repéré', async ({ page, backend }) => {
    await page.goto('/plus');
    await page.getByRole('link', { name: /Logement et budget/ }).click();

    const sites = page.getByRole('region', { name: 'Où chercher' });
    await expect(sites).toContainText('Pour un séjour de 3 mois');
    await expect(sites.getByRole('link', { name: 'Oakhouse (maisons partagées)' })).toHaveAttribute(
      'href',
      'https://www.oakhouse.jp/eng',
    );

    await page.getByRole('button', { name: 'Ajouter un logement' }).click();
    await page.getByLabel('Nom du logement').fill('Chambre en colocation');
    await page.getByLabel('Quartier').fill('Shibuya');
    await page.getByLabel('Loyer par mois (JPY)').fill('80000');
    await page.getByLabel("Trajet jusqu'au stage (minutes)").fill('25');
    await page.getByRole('button', { name: 'Ajouter le logement' }).click();

    const carte = page.getByRole('article', { name: 'Chambre en colocation' });
    await expect(carte).toContainText('Shibuya');
    await expect(carte).toContainText('25 min de trajet');
    await expect(carte).toContainText(/80\s000\s?(JPY|¥)/);
    expect(backend.housings[0]).toMatchObject({ pays: 'JP', prix_mensuel: 80000, devise: 'JPY' });

    await carte.getByLabel('Statut de « Chambre en colocation »').selectOption('retenu');
    await expect.poll(() => backend.housings[0]!.statut).toBe('retenu');

    // Le Royaume-Uni a ses propres sites, et aucun logement noté.
    await page
      .getByRole('group', { name: 'Pays' })
      .getByRole('button', { name: 'Royaume-Uni' })
      .click();
    await expect(sites.getByRole('link', { name: 'SpareRoom (colocations)' })).toBeVisible();
    await expect(page.getByText('Aucun logement noté pour ce pays.')).toBeVisible();
  });

  test('calcule le coût du séjour à partir des montants saisis', async ({ page, backend }) => {
    await page.goto('/logement?pays=JP');
    const budget = page.getByRole('form', { name: 'Budget' });

    await budget.getByLabel('Montant : Loyer').fill('80000');
    await budget.getByLabel('Montant : Nourriture').fill('40000');
    await budget.getByLabel("Montant : Billet d'avion aller-retour").fill('150000');
    // 120 000 par mois sur trois mois, plus le billet compté une fois.
    await expect(budget).toContainText(/510\s000/);

    await budget.getByRole('button', { name: 'Enregistrer le budget' }).click();
    await expect(budget.getByText('Budget enregistré.')).toBeVisible();
    expect(backend.budgets[0]).toMatchObject({ pays: 'JP', devise: 'JPY' });
    const lignes = backend.budgets[0]!.lignes as { libelle: string; montant: number }[];
    expect(lignes.find((ligne) => ligne.libelle === 'Loyer')).toMatchObject({ montant: 80000 });
  });

  test('propose le logement quand une candidature arrive en entretien', async ({
    page,
    backend,
  }) => {
    backend.offers = [
      {
        id: 'o1',
        titre: 'Stage backend à Tokyo',
        entreprise: 'Exemple',
        pays: 'JP',
        ville: 'Tokyo',
        url: 'https://example.test/offre',
        type: 'stage',
        actif: true,
      },
    ];
    backend.applications = [
      { id: 'c1', offer_id: 'o1', statut: 'entretien', position: 1, date_candidature: null },
    ];
    await page.goto('/suivi?candidature=c1');

    const fenetre = page.getByRole('dialog', { name: 'Stage backend à Tokyo' });
    await expect(
      fenetre.getByRole('link', { name: 'Voir le logement et le budget pour ce pays' }),
    ).toHaveAttribute('href', '/logement?pays=JP');

    await fenetre
      .getByLabel("Préparation et compte rendu d'entretien")
      .fill('Demander la taille de l’équipe.');
    await fenetre.getByLabel('Personne en contact').fill('Aiko Tanaka');
    await fenetre.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(fenetre).toHaveCount(0);
    expect(backend.applications[0]).toMatchObject({
      notes_entretien: 'Demander la taille de l’équipe.',
      contact_nom: 'Aiko Tanaka',
    });
  });
});
