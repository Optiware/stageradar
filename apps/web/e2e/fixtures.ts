import { test as base, expect, type Page } from '@playwright/test';

const SUPABASE = 'https://stageradar-e2e.supabase.co';
// Doit rester identique à AUTH_STORAGE_KEY (src/lib/supabase.ts).
const AUTH_STORAGE_KEY = 'stageradar-auth';

export const OWNER_EMAIL = 'proprietaire@example.test';
export const OWNER_PASSWORD = 'mot-de-passe-de-test';

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

type Ligne = Record<string, unknown>;

const TABLES = [
  'offers',
  'applications',
  'events',
  'companies',
  'country_sheets',
  'sources_status',
  'documents',
  'push_subscriptions',
] as const;
type NomTable = (typeof TABLES)[number];

export interface Backend {
  /** Requêtes reçues par le faux Supabase : « MÉTHODE chemin ». */
  calls: string[];
  /** Corps JSON de la dernière demande de connexion par mot de passe. */
  lastTokenBody: unknown;
  /** Corps JSON de la dernière modification du compte (changement de mot de passe). */
  lastUserBody: unknown;
  /** Offres renvoyées par le faux serveur (vide par défaut). */
  offers: Ligne[];
  /** Candidatures du suivi (table `applications`). */
  applications: Ligne[];
  /** Événements du suivi (table `events`) : entretiens, changements de colonne. */
  events: Ligne[];
  /** Entreprises cibles du démarchage (table `companies`). */
  companies: Ligne[];
  /** Fiches pays (table `country_sheets`, identifiées par `pays`). */
  country_sheets: Ligne[];
  /** Passages de la collecte (table `sources_status`). */
  sources_status: Ligne[];
  /** CV et lettres (table `documents`). */
  documents: Ligne[];
  /** Appareils abonnés aux notifications (table `push_subscriptions`, identifiés par `endpoint`). */
  push_subscriptions: Ligne[];
  /** Ligne unique des réglages. */
  settings: Ligne;
  /** Demandes reçues par le service de l'application (/api/…), avec leur corps. */
  api: { chemin: string; corps: unknown }[];
  /** Réponses du service de l'application, par chemin (« /importer »). */
  apiReponses: Record<string, { statut?: number; corps: unknown }>;
  /** Ouvre l'application avec une session déjà enregistrée. */
  signInAs(email: string, options?: { isOwner?: boolean }): Promise<void>;
}

/**
 * Remplace Supabase par un faux serveur : aucun test ne sort sur le réseau,
 * et toute requête non prévue échoue bruyamment.
 */
export const test = base.extend<{ backend: Backend }>({
  backend: [
    async ({ page }, use) => {
      let isOwner = true;
      const backend: Backend = {
        calls: [],
        lastTokenBody: null,
        lastUserBody: null,
        offers: [],
        applications: [],
        events: [],
        companies: [],
        country_sheets: [],
        sources_status: [],
        documents: [],
        push_subscriptions: [],
        api: [],
        apiReponses: {},
        settings: { objectif_hebdo: 5, presentation: '' },
        async signInAs(email, options = {}) {
          isOwner = options.isOwner ?? true;
          await seedSession(page, email);
        },
      };

      await page.route(`${SUPABASE}/**`, async (route) => {
        const request = route.request();
        const path = new URL(request.url()).pathname;
        backend.calls.push(`${request.method()} ${path}`);

        if (path === '/auth/v1/token') {
          const body = request.postDataJSON() as { email: string; password: string };
          backend.lastTokenBody = body;
          if (body.email !== OWNER_EMAIL || body.password !== OWNER_PASSWORD) {
            // Réponse de GoTrue pour un mauvais couple adresse / mot de passe.
            return route.fulfill({
              status: 400,
              json: {
                code: 400,
                error_code: 'invalid_credentials',
                msg: 'Invalid login credentials',
              },
            });
          }
          return route.fulfill({ json: fakeSession(body.email) });
        }
        if (path === '/auth/v1/user' && request.method() === 'PUT') {
          backend.lastUserBody = request.postDataJSON();
          return route.fulfill({ json: fakeSession(OWNER_EMAIL).user });
        }
        if (path === '/rest/v1/offers' && request.method() === 'GET') {
          // Lecture de la description d'une seule offre (filtre PostgREST `id=eq.…`).
          const id = new URL(request.url()).searchParams.get('id')?.replace(/^eq\./, '');
          if (id) {
            return route.fulfill({
              json: backend.offers
                .filter((offre) => offre.id === id)
                .map((offre) => ({
                  description: offre.description ?? null,
                  traduction: offre.traduction ?? null,
                  notes: offre.notes ?? null,
                })),
            });
          }
          return route.fulfill({ json: backend.offers });
        }
        if (
          path === '/rest/v1/applications' &&
          request.method() === 'GET' &&
          // Une lecture brute (export) ne demande ni l'offre ni les événements.
          new URL(request.url()).searchParams.get('select')?.includes('offre:')
        ) {
          // Chaque candidature est renvoyée avec son offre et ses événements, comme le fait
          // PostgREST pour `select=…,offre:offers(…),evenements:events(…)`.
          return route.fulfill({
            json: [...backend.applications]
              .sort((a, b) => Number(a.position) - Number(b.position))
              .map((candidature) => ({
                ...candidature,
                offre: backend.offers.find((offre) => offre.id === candidature.offer_id) ?? null,
                societe:
                  backend.companies.find((societe) => societe.id === candidature.company_id) ??
                  null,
                evenements: backend.events.filter(
                  (evenement) => evenement.application_id === candidature.id,
                ),
              })),
          });
        }
        if (path === '/rest/v1/settings' && request.method() === 'GET') {
          return route.fulfill({ json: [backend.settings] });
        }
        if (path === '/rest/v1/settings' && request.method() === 'PATCH') {
          Object.assign(backend.settings, request.postDataJSON());
          return route.fulfill({ status: 204, body: '' });
        }
        // Les autres tables se lisent et s'écrivent ligne par ligne, par leur clé (`id=eq.…`).
        const nom = path.replace('/rest/v1/', '') as NomTable;
        const cle =
          nom === 'country_sheets' ? 'pays' : nom === 'push_subscriptions' ? 'endpoint' : 'id';

        if ((TABLES as readonly string[]).includes(nom)) {
          const table = backend[nom];
          const valeur = new URL(request.url()).searchParams.get(cle)?.replace(/^eq\./, '');
          if (request.method() === 'GET') {
            return route.fulfill({ json: table });
          }
          if (request.method() === 'POST') {
            // Une ligne ou plusieurs ; une ligne dont la clé existe déjà est remplacée (upsert).
            const corps = request.postDataJSON() as Ligne | Ligne[];
            for (const ligne of Array.isArray(corps) ? corps : [corps]) {
              const existante = table.findIndex(
                (autre) => ligne[cle] !== undefined && autre[cle] === ligne[cle],
              );
              if (existante >= 0) {
                table[existante] = { ...table[existante], ...ligne };
                continue;
              }
              table.push({
                id: crypto.randomUUID(),
                // Valeurs par défaut des colonnes, comme en base.
                ...(nom === 'applications'
                  ? {
                      offer_id: null,
                      company_id: null,
                      date_candidature: null,
                      prochaine_relance: null,
                      notes: null,
                      cv_document_id: null,
                      lettre_document_id: null,
                    }
                  : {}),
                ...(nom === 'events'
                  ? { details: {}, fait: false, date: new Date().toISOString() }
                  : {}),
                created_at: new Date().toISOString(),
                ...ligne,
              });
            }
            return route.fulfill({ status: 201, body: '' });
          }
          const index = table.findIndex((ligne) => ligne[cle] === valeur);
          if (index >= 0 && request.method() === 'PATCH') {
            table[index] = { ...table[index], ...(request.postDataJSON() as Ligne) };
            return route.fulfill({ status: 204, body: '' });
          }
          if (index >= 0 && request.method() === 'DELETE') {
            table.splice(index, 1);
            // Les événements d'une candidature partent avec elle (`on delete cascade`).
            if (nom === 'applications') {
              backend.events = backend.events.filter((ligne) => ligne.application_id !== valeur);
            }
            return route.fulfill({ status: 204, body: '' });
          }
        }
        if (path.startsWith('/api/')) {
          const chemin = path.slice('/api'.length);
          backend.api.push({ chemin, corps: request.postDataJSON() });
          const prevue = backend.apiReponses[chemin];
          if (!request.headers().authorization?.startsWith('Bearer ')) {
            return route.fulfill({ status: 401, json: { message: 'Réservé au propriétaire.' } });
          }
          if (prevue) return route.fulfill({ status: prevue.statut ?? 200, json: prevue.corps });
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
    // Actif même pour un test qui ne le demande pas : sinon ses requêtes partiraient sur Internet.
    { auto: true },
  ],
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
