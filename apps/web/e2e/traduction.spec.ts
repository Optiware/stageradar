import type { Page } from '@playwright/test';
import { expect, OWNER_EMAIL, test } from './fixtures';

const ID = '44444444-4444-4444-8444-444444444444';
const DESCRIPTION =
  '私たちはバックエンドエンジニアのインターンを募集しています。\n\n' +
  '• サーバーサイドの開発とテストを担当します\n' +
  '• Python, Go';

function offre(overrides: Record<string, unknown>) {
  return {
    id: ID,
    source: 'greenhouse:exemple',
    titre: 'バックエンドエンジニア インターン',
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
    langues_requises: ['ja'],
    url: 'https://example.test/offre?id=7',
    date_publication: '2026-10-10T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    masquee: false,
    description: DESCRIPTION,
    ...overrides,
  };
}

/** Remplace le traducteur intégré au navigateur par un faux, ou le retire. */
async function traducteur(page: Page, present: boolean) {
  await page.addInitScript((actif) => {
    const faux = {
      availability: () => Promise.resolve('downloadable'),
      create: ({ monitor }: { monitor?: (cible: EventTarget) => void }) => {
        monitor?.(new EventTarget());
        return Promise.resolve({
          translate: (texte: string) => Promise.resolve(`[fr] ${texte}`),
          destroy() {},
        });
      },
    };
    Object.defineProperty(window, 'Translator', { value: actif ? faux : undefined });
  }, present);
}

async function ouvrir(page: Page, isMobile: boolean) {
  await page.goto('/');
  if (isMobile) await page.locator('li > article').first().click();
  return page.getByRole('article', { name: /^Détail/ });
}

test.describe('Traduction des annonces', () => {
  test.beforeEach(async ({ backend }) => {
    backend.offers = [offre({})];
    await backend.signInAs(OWNER_EMAIL);
  });

  test('traduit une annonce japonaise sur l’appareil, l’enregistre et la réaffiche', async ({
    page,
    backend,
    isMobile,
  }) => {
    await traducteur(page, true);
    const detail = await ouvrir(page, isMobile);
    const bloc = detail.getByRole('group', { name: 'Traduction' });

    await expect(bloc).toContainText('Annonce rédigée en japonais');
    await bloc.getByRole('button', { name: 'Traduire en français' }).click();

    await expect(detail).toContainText('Intitulé : [fr] バックエンドエンジニア インターン');
    await expect(detail).toContainText('• [fr] サーバーサイドの開発とテストを担当します');
    // La ligne déjà lisible (noms de langages) n'est pas passée au traducteur.
    await expect(detail).toContainText('• Python, Go');
    await expect(detail).not.toContainText('[fr] Python');
    await expect
      .poll(() => (backend.offers[0]!.traduction as { langue?: string } | undefined)?.langue)
      .toBe('ja');

    await bloc.getByRole('button', { name: "Voir l'original" }).click();
    await expect(detail).toContainText('• サーバーサイドの開発とテストを担当します');
    await expect(detail).not.toContainText('[fr]');

    // À la prochaine ouverture, sur cet appareil ou un autre, la traduction enregistrée
    // s'affiche d'emblée.
    await page.reload();
    await expect(detail).toContainText('• [fr] サーバーサイドの開発とテストを担当します');
    await expect(bloc).toContainText('Traduite automatiquement en français');
  });

  test('sans traducteur intégré, propose Google Traduction', async ({ page, isMobile }) => {
    await traducteur(page, false);
    const detail = await ouvrir(page, isMobile);
    const bloc = detail.getByRole('group', { name: 'Traduction' });

    await expect(bloc).toContainText('Ce navigateur ne traduit pas sur place');
    await expect(bloc.getByRole('button', { name: 'Traduire en français' })).toHaveCount(0);

    const lienPage = bloc.getByRole('link', { name: "Annonce d'origine dans Google Traduction" });
    const adresse = new URL((await lienPage.getAttribute('href'))!);
    expect(adresse.origin + adresse.pathname).toBe('https://translate.google.com/translate');
    expect(adresse.searchParams.get('u')).toBe('https://example.test/offre?id=7');
    expect(adresse.searchParams.get('tl')).toBe('fr');
    await expect(lienPage).toHaveAttribute('rel', 'noopener noreferrer');

    const lienTexte = bloc.getByRole('link', { name: 'Ce texte dans Google Traduction' });
    const texte = new URL((await lienTexte.getAttribute('href'))!).searchParams.get('text');
    expect(texte).toContain('サーバーサイドの開発');
  });

  test('ne propose rien pour une annonce en anglais', async ({ page, backend, isMobile }) => {
    backend.offers = [
      offre({
        titre: 'Backend Engineer Intern',
        langues_requises: [],
        description:
          'We are looking for an intern to join our backend team. You will work with the API ' +
          'and the data pipeline, and you will write tests for our services with the team.',
      }),
    ];
    await traducteur(page, true);
    const detail = await ouvrir(page, isMobile);

    await expect(detail).toContainText('We are looking for an intern');
    await expect(detail.getByRole('group', { name: 'Traduction' })).toHaveCount(0);
  });
});
