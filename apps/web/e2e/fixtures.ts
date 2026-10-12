import { test as base, expect, type Page } from '@playwright/test';

const SUPABASE = 'https://stageradar-e2e.supabase.co';
// Doit rester identique à AUTH_STORAGE_KEY (src/lib/supabase.ts).
const AUTH_STORAGE_KEY = 'stageradar-auth';

export const OWNER_EMAIL = 'proprietaire@example.test';

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** Session factice, valable une heure, au format attendu par supabase-js. */
function fakeSession(email: string) {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id: '00000000-0000-4000-8000-000000000001',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: {},
    created_at: '2026-10-12T00:00:00Z',
  };
  const accessToken = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: user.id, email, role: 'authenticated', exp: expiresAt }),
    'signature-factice',
  ].join('.');
  return {
    access_token: accessToken,
    refresh_token: 'refresh-factice',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user,
  };
}

export interface Backend {
  /** Requêtes reçues par le faux Supabase : « MÉTHODE chemin ». */
  calls: string[];
  /** Corps JSON de la dernière demande de lien magique. */
  lastOtpBody: unknown;
  /** Ouvre l'application avec une session déjà enregistrée. */
  signInAs(email: string, options?: { isOwner?: boolean }): Promise<void>;
}

/**
 * Remplace Supabase par un faux serveur : aucun test ne sort sur le réseau,
 * et toute requête non prévue échoue bruyamment.
 */
export const test = base.extend<{ backend: Backend }>({
  backend: async ({ page }, use) => {
    let isOwner = true;
    const backend: Backend = {
      calls: [],
      lastOtpBody: null,
      async signInAs(email, options = {}) {
        isOwner = options.isOwner ?? true;
        await seedSession(page, email);
      },
    };

    await page.route(`${SUPABASE}/**`, async (route) => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      backend.calls.push(`${request.method()} ${path}`);

      if (path === '/auth/v1/otp') {
        backend.lastOtpBody = request.postDataJSON();
        return route.fulfill({ json: {} });
      }
      if (path === '/rest/v1/rpc/is_owner') {
        return route.fulfill({ json: isOwner });
      }
      if (path === '/auth/v1/logout') {
        return route.fulfill({ status: 204, body: '' });
      }
      return route.fulfill({ status: 500, json: { message: `Route non simulée : ${path}` } });
    });

    await use(backend);
  },
});

async function seedSession(page: Page, email: string): Promise<void> {
  await page.addInitScript(
    ([key, session]) => {
      // Une seule fois : sinon la session reviendrait après une déconnexion suivie d'un rechargement.
      if (!sessionStorage.getItem('e2e-session-posee')) {
        localStorage.setItem(key, session);
        sessionStorage.setItem('e2e-session-posee', '1');
      }
    },
    [AUTH_STORAGE_KEY, JSON.stringify(fakeSession(email))] as const,
  );
}

export { expect };
