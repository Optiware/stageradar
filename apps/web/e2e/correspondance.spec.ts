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
  description: 'Golang, PostgreSQL, Docker, Kubernetes and REST APIs.',
};

test.beforeEach(async ({ backend }) => {
  backend.offers = [OFFRE];
  await backend.signInAs(OWNER_EMAIL);
});

test('montre la correspondance entre l’offre et le profil du CV', async ({ page, backend }) => {
  backend.settings.cv = { competences: ['PostgreSQL', 'Docker'], resume: { en: 'REST APIs' } };
  await page.goto('/?offre=offre-1');
  const bloc = page.getByRole('region', { name: 'Correspondance avec ton CV' });
  await expect(bloc).toContainText('60 %');
  await expect(bloc.getByRole('listitem')).toHaveText([
    'PostgreSQL',
    'API REST',
    'Docker',
    'Go',
    'Kubernetes',
  ]);
  await bloc.getByRole('link', { name: 'Créer le CV pour cette offre' }).click();
  await expect(page).toHaveURL(/\/cv\?offre=offre-1/);
});

test('invite à remplir le profil quand il est vide', async ({ page }) => {
  await page.goto('/?offre=offre-1');
  const bloc = page.getByRole('region', { name: 'Correspondance avec ton CV' });
  await expect(bloc).toContainText('Remplis ton profil pour comparer');
  await expect(bloc.getByRole('link', { name: 'Ouvrir mon profil' })).toHaveAttribute(
    'href',
    '/cv?onglet=profil',
  );
});

test('ne conclut pas sur une annonce trop vague', async ({ page, backend }) => {
  backend.settings.cv = { competences: ['Python'] };
  backend.offers = [{ ...OFFRE, description: 'Stage en équipe, bonne humeur.' }];
  await page.goto('/?offre=offre-1');
  await expect(page.getByRole('region', { name: 'Correspondance avec ton CV' })).toContainText(
    'L’annonce ne donne pas assez de détails',
  );
});
