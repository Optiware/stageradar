# StageRadar

Agrégateur personnel d'offres d'alternance (France) et de stages d'été à l'étranger (Japon, Corée du Sud, Colombie, Canada), avec suivi de candidatures. Application web installable (PWA) sur Windows et Android, mono-utilisateur, auto-hébergée sur un VPS.

Le besoin complet est décrit dans [CAHIER_DES_CHARGES.md](CAHIER_DES_CHARGES.md).

## État d'avancement

| Lot | Contenu                                                              | État     |
| --- | -------------------------------------------------------------------- | -------- |
| 0   | Socle : monorepo, schéma + RLS, connexion, PWA, CI, mise en ligne    | En ligne |
| 3   | Stages à l'étranger : pipeline de collecte, ATS, Adzuna, fiches pays | À faire  |
| 2   | Fil, détail, suivi Kanban, hors-ligne                                | À faire  |
| 1   | Alternance France : La bonne alternance, France Travail (si accès)   | À faire  |
| 4   | Import manuel : partage Android, URL, bookmarklet                    | À faire  |
| 5   | Notifications, calendrier, relances                                  | À faire  |
| 6   | Statistiques, documents, export, APK                                 | À faire  |

L'ordre est volontaire : les stages d'été 2027 se recrutent dès l'automne 2026, l'alternance surtout à partir de janvier.

## Écarts par rapport au cahier des charges

Le cahier prévoyait Supabase hébergé, Cloudflare et un lien magique. Tout tourne finalement sur le VPS :

| Cahier des charges               | Réalisé                                                              | Pourquoi                                           |
| -------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------- |
| Supabase hébergé                 | Les mêmes briques (Postgres, GoTrue, PostgREST) en Docker sur le VPS | Données chez soi, aucun compte à créer             |
| Cloudflare Pages                 | nginx du VPS, certificat Let's Encrypt                               | Un seul endroit à administrer                      |
| Connexion par lien magique       | Adresse e-mail + mot de passe                                        | Le VPS n'a pas de serveur d'envoi d'e-mails        |
| Collecte par GitHub Actions cron | cron du VPS (à partir du lot 3)                                      | La clé secrète de la base ne quitte pas le serveur |

Le front utilise toujours `supabase-js` et les migrations restent dans `supabase/migrations` : revenir à Supabase hébergé ne demanderait que de changer deux variables.

## Structure

```
apps/web/            Front React + Vite + Tailwind (PWA)
packages/shared/     Types et fonctions communs au front et au collecteur
packages/collector/  Collecte des offres (Node)
supabase/migrations/ Schéma Postgres et règles de sécurité (RLS)
deploy/deployer.mjs  Déploiement vers le VPS (`npm run deploy`)
deploy/serveur/      Ce qui tourne sur le VPS : Docker Compose, nginx, scripts
.github/workflows/   Intégration continue
```

## Prérequis

- Node.js 22.13 ou plus récent (`node --version`)
- Git, et un client SSH avec une clé autorisée sur le VPS
- Docker, uniquement pour la pile locale

## Commandes

| Commande            | Effet                                                        |
| ------------------- | ------------------------------------------------------------ |
| `npm run dev`       | Front en développement (<http://localhost:5173>)             |
| `npm run build`     | Version de production dans `apps/web/dist`                   |
| `npm run lint`      | ESLint + Prettier                                            |
| `npm run typecheck` | Vérification TypeScript de tous les paquets                  |
| `npm test`          | Tests unitaires (Vitest), dont les migrations et la RLS      |
| `npm run e2e`       | Tests de bout en bout (Playwright), sur mobile et sur bureau |
| `npm run collect`   | Lance une collecte (aucun connecteur pour l'instant)         |
| `npm run deploy`    | Met à jour le VPS : base, API, front                         |

Première exécution des tests de bout en bout : `npx playwright install chromium` dans `apps/web`.

Les tests de la base tournent sur un Postgres en mémoire (PGlite) : ils appliquent les vraies migrations et vérifient que seul le propriétaire peut lire et écrire. Aucun compte ni Docker n'est nécessaire.

## Mise en ligne sur le VPS

### Ce qui est installé

```
Internet ──HTTPS──> nginx (déjà présent sur le VPS)
                      ├── /            fichiers du front   /var/www/stageradar
                      ├── /auth/v1/    GoTrue              127.0.0.1:54331  ┐
                      └── /rest/v1/    PostgREST           127.0.0.1:54332  ├ Docker, /opt/stageradar
                                       Postgres            (aucun port)     ┘
```

- Tout est **ajouté à côté** des autres sites du serveur : un fichier `/etc/nginx/sites-available/stageradar` qui ne déclare que son propre nom de domaine, un projet Docker Compose `stageradar`, un fichier `/etc/cron.d/stageradar`.
- Postgres n'écoute sur aucun port de la machine ; l'API n'écoute que sur `127.0.0.1`.
- Les secrets (mot de passe Postgres, secret des jetons, clé secrète) sont générés **sur le serveur**, dans `/opt/stageradar/.env`, et n'en sortent pas.

### Déployer

1. Copier `.env.example` en `.env` et remplir `DEPLOY_SSH`, `DEPLOY_DOMAINE`, `PROPRIETAIRE_EMAIL`.
2. Le nom de domaine doit pointer vers le VPS (le nom fourni par l'hébergeur convient).
3. Lancer :
   ```bash
   npm run deploy
   ```

La commande est rejouable : elle applique les nouvelles migrations, reconstruit le front et le remplace. Elle se termine par des vérifications (le site répond, les données sont refusées sans compte).

### Première connexion

Le compte propriétaire est créé à la première installation, avec un mot de passe provisoire tiré au hasard et rangé sur le serveur :

```bash
ssh root@adresse-du-serveur cat /opt/stageradar/mot-de-passe-provisoire.txt
```

Connecte-toi avec ton adresse et ce mot de passe, puis change-le dans **Plus > Compte**. Les inscriptions sont fermées : personne d'autre ne peut créer de compte.

### Mot de passe oublié

Aucun e-mail n'est envoyé, donc pas de lien de récupération. Depuis ton PC :

```bash
ssh root@adresse-du-serveur /opt/stageradar/reinitialiser-mot-de-passe.sh
```

### Sauvegardes

Chaque nuit à 3 h 15 (UTC), `sauvegarder.sh` écrit une copie complète de la base dans `/opt/stageradar/sauvegardes/` et garde les 14 dernières. Pour en récupérer une sur ton PC :

```bash
scp root@adresse-du-serveur:/opt/stageradar/sauvegardes/stageradar-AAAA-MM-JJ.dump .
```

Restauration, sur le serveur (remplace le contenu actuel) :

```bash
cd /opt/stageradar
docker compose exec -T db pg_restore -h 127.0.0.1 -U supabase_admin -d postgres --clean --if-exists < sauvegardes/stageradar-AAAA-MM-JJ.dump
```

### Désinstaller

```bash
cd /opt/stageradar && docker compose down -v      # supprime aussi les données
rm /etc/nginx/sites-enabled/stageradar /etc/nginx/sites-available/stageradar /etc/cron.d/stageradar
nginx -t && systemctl reload nginx
certbot delete --cert-name ton.domaine
rm -rf /opt/stageradar /var/www/stageradar
```

## Installer l'application

- **Windows** (Chrome ou Edge) : ouvrir l'adresse du site, puis icône d'installation dans la barre d'adresse, ou menu > « Installer StageRadar ».
- **Android** (Chrome) : ouvrir l'adresse, menu ⋮ > « Ajouter à l'écran d'accueil » > « Installer ».

La session est propre à chaque appareil : il faut se connecter une fois sur le PC et une fois sur le téléphone. Les données, elles, sont communes.

## Pile locale (développement)

Pour développer avec une vraie base, la même pile se lance sur ton PC avec Docker (dans Git Bash) :

```bash
cd deploy/serveur
SANS_NGINX=1 DOMAINE=localhost PROPRIETAIRE_EMAIL=moi@exemple.fr bash installer.sh
```

Le script écrit `deploy/serveur/.env` (clés) et `mot-de-passe-provisoire.txt`. Dans le `.env` de la racine, mettre `VITE_SUPABASE_URL=http://localhost:5173` et recopier `ANON_KEY` dans `VITE_SUPABASE_KEY`, puis `npm run dev` : le serveur de développement route `/auth/v1` et `/rest/v1` comme nginx en production.

Arrêt : `docker compose down` dans `deploy/serveur` (ajouter `-v` pour effacer la base).

Sans `.env`, l'application démarre et affiche un écran « Configuration manquante ».

## Variables d'environnement

Un seul fichier `.env` à la racine, décrit dans [.env.example](.env.example).

| Variable                    | Utilisée par     | Secret ?                                |
| --------------------------- | ---------------- | --------------------------------------- |
| `DEPLOY_SSH`                | `npm run deploy` | Non                                     |
| `DEPLOY_DOMAINE`            | `npm run deploy` | Non                                     |
| `PROPRIETAIRE_EMAIL`        | `npm run deploy` | Non                                     |
| `VITE_SUPABASE_URL`         | Front (local)    | Non                                     |
| `VITE_SUPABASE_KEY`         | Front (local)    | Non : clé publique, protégée par la RLS |
| `SUPABASE_URL`              | Collecteur       | Non                                     |
| `SUPABASE_SERVICE_ROLE_KEY` | Collecteur       | **Oui** : contourne la RLS              |

Seules les variables préfixées `VITE_` sont embarquées dans le front. Ne jamais mettre une clé secrète dans une variable `VITE_`.

## GitHub (facultatif : code et intégration continue)

1. Créer un dépôt **privé** vide sur <https://github.com/new> (sans README ni .gitignore).
2. Pousser le code :
   ```bash
   git remote add origin git@github.com:TON_COMPTE/stageradar.git
   git push -u origin main
   ```
3. L'onglet **Actions** doit afficher le workflow « CI » en vert.

## Sécurité

- Toutes les tables ont la Row Level Security activée ; une seule règle, `is_owner()`, compare l'adresse du compte connecté à celle de `app_owner`.
- Le rôle anonyme n'a aucun droit sur les tables, et les inscriptions sont fermées.
- La clé secrète (`SERVICE_ROLE_KEY`) ne sert qu'au collecteur et reste sur le serveur.
- nginx limite les essais de connexion (20 par minute et par adresse) et ne laisse pas passer l'API d'administration des comptes.
- Le front est servi avec une politique de sécurité de contenu stricte : aucun script extérieur ne peut s'exécuter.
