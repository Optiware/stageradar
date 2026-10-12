# StageRadar

Agrégateur personnel d'offres d'alternance (France) et de stages d'été à l'étranger (Japon, Corée du Sud, Colombie, Canada), avec suivi de candidatures. Application web installable (PWA) sur Windows et Android, mono-utilisateur, gratuite.

Le besoin complet est décrit dans [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

## État d'avancement

| Lot | Contenu                                                              | État                                             |
| --- | -------------------------------------------------------------------- | ------------------------------------------------ |
| 0   | Socle : monorepo, schéma + RLS, connexion par lien magique, PWA, CI  | Code terminé, mise en ligne à faire (ci-dessous) |
| 3   | Stages à l'étranger : pipeline de collecte, ATS, Adzuna, fiches pays | À faire                                          |
| 2   | Fil, détail, suivi Kanban, hors-ligne                                | À faire                                          |
| 1   | Alternance France : La bonne alternance, France Travail (si accès)   | À faire                                          |
| 4   | Import manuel : partage Android, URL, bookmarklet                    | À faire                                          |
| 5   | Notifications, calendrier, relances                                  | À faire                                          |
| 6   | Statistiques, documents, export, APK                                 | À faire                                          |

L'ordre est volontaire : les stages d'été 2027 se recrutent dès l'automne 2026, l'alternance surtout à partir de janvier.

## Structure

```
apps/web/            Front React + Vite + Tailwind (PWA)
packages/shared/     Types et fonctions communs au front et au collecteur
packages/collector/  Collecte des offres (Node), lancée par GitHub Actions
supabase/migrations/ Schéma Postgres et règles de sécurité (RLS)
.github/workflows/   Intégration continue
```

## Prérequis

- Node.js 22.13 ou plus récent (`node --version`)
- Git

## Installation locale

```bash
npm install
cp .env.example .env        # puis remplir les valeurs (voir « Mise en ligne »)
npm run dev                 # http://localhost:5173
```

Sans `.env`, l'application démarre et affiche un écran « Configuration manquante ».

## Commandes

| Commande            | Effet                                                        |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Front en développement                                       |
| `npm run build`     | Version de production dans `apps/web/dist`                   |
| `npm run lint`      | ESLint + Prettier                                            |
| `npm run typecheck` | Vérification TypeScript de tous les paquets                  |
| `npm test`          | Tests unitaires (Vitest), dont les migrations et la RLS      |
| `npm run e2e`       | Tests de bout en bout (Playwright), sur mobile et sur bureau |
| `npm run collect`   | Lance une collecte (aucun connecteur pour l'instant)         |

Première exécution des tests de bout en bout : `npx playwright install chromium` dans `apps/web`.

Les tests de la base tournent sur un Postgres en mémoire (PGlite) : ils appliquent les vraies migrations et vérifient que seul le propriétaire peut lire et écrire. Aucun compte ni Docker n'est nécessaire.

## Variables d'environnement

Un seul fichier `.env` à la racine, décrit dans [.env.example](.env.example).

| Variable                    | Utilisée par | Secret ?                                |
| --------------------------- | ------------ | --------------------------------------- |
| `VITE_SUPABASE_URL`         | Front        | Non                                     |
| `VITE_SUPABASE_KEY`         | Front        | Non : clé publique, protégée par la RLS |
| `SUPABASE_URL`              | Collecteur   | Non                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Collecteur   | **Oui** : contourne la RLS              |

Seules les variables préfixées `VITE_` sont embarquées dans le front. Ne jamais mettre une clé secrète dans une variable `VITE_`.

## Mise en ligne

### 1. Supabase (base de données et connexion)

1. Créer un compte sur <https://supabase.com/dashboard> puis un projet (offre gratuite, région Europe).
2. **SQL Editor** : coller le contenu de `supabase/migrations/20261012000000_init.sql` et l'exécuter.
3. Toujours dans le SQL Editor, déclarer ton adresse comme propriétaire :
   ```sql
   insert into public.app_owner (email) values ('ton.adresse@exemple.fr');
   ```
4. **Project Settings > API** : copier l'URL du projet et la clé publique dans `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_KEY`, `SUPABASE_URL`). Copier la clé secrète dans `SUPABASE_SERVICE_ROLE_KEY`.
5. **Authentication > URL Configuration** : mettre l'adresse de production dans « Site URL », et ajouter `http://localhost:5173` aux « Redirect URLs ». Un lien magique ne peut rediriger que vers ces adresses.
6. Après ta première connexion réussie, désactiver les nouvelles inscriptions dans les réglages d'authentification. Même sans cela, un autre compte ne verrait aucune donnée : la RLS n'autorise que l'adresse inscrite dans `app_owner`.

Le lien magique expire au bout d'une heure et ne peut être redemandé qu'une fois par minute.

### 2. GitHub (code et intégration continue)

1. Créer un dépôt **privé** vide sur <https://github.com/new> (sans README ni .gitignore).
2. Pousser le code :
   ```bash
   git remote add origin git@github.com:TON_COMPTE/stageradar.git
   git push -u origin main
   ```
3. L'onglet **Actions** doit afficher le workflow « CI » en vert.

### 3. Cloudflare (hébergement du front)

Le front est servi comme site statique par Cloudflare Workers, configuré dans `wrangler.jsonc`.

1. Créer un compte sur <https://dash.cloudflare.com/sign-up>.
2. **Workers & Pages > Create** : importer le dépôt GitHub.
3. Commande de build : `npm run build`. Commande de déploiement : `npx wrangler deploy`.
4. Dans **Settings > Build > Build variables and secrets**, ajouter `VITE_SUPABASE_URL` et `VITE_SUPABASE_KEY`.
5. Reporter l'adresse obtenue (`https://stageradar.<compte>.workers.dev`) dans « Site URL » côté Supabase.

## Installer l'application

- **Windows** (Chrome ou Edge) : ouvrir l'adresse de production, puis icône d'installation dans la barre d'adresse, ou menu > « Installer StageRadar ».
- **Android** (Chrome) : ouvrir l'adresse, menu ⋮ > « Ajouter à l'écran d'accueil » > « Installer ».

Clique sur le lien magique depuis l'appareil où tu veux te connecter : la session est propre à chaque navigateur.

## Sécurité

- Toutes les tables ont la Row Level Security activée ; une seule règle, `is_owner()`, compare l'adresse du compte connecté à celle de `app_owner`.
- Le rôle anonyme n'a aucun droit sur les tables.
- La clé secrète Supabase n'est utilisée que par le collecteur (fichier `.env` local et secrets GitHub).
