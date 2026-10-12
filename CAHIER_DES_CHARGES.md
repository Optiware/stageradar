# Cahier des charges — « StageRadar » : agrégateur personnel d'offres d'alternance et de stages à l'étranger

> Document destiné à **Claude Code**. À placer à la racine du dépôt (ou à copier dans `CLAUDE.md`).
> Les passages entre `⟨ ⟩` sont à compléter par moi avant de lancer.

---

## 0. Prompt de lancement (à coller dans Claude Code)

```
Lis intégralement CAHIER_DES_CHARGES.md. Passe d'abord en mode plan : propose l'architecture,
l'arborescence, le schéma de base de données et le découpage en lots, puis attends ma validation.
Ensuite, réalise les lots un par un, dans l'ordre, en respectant leurs critères d'acceptation.
Ne suppose jamais qu'un endpoint, un paramètre ou un code de référentiel existe : vérifie-le dans
la documentation officielle (WebFetch) avant de coder le connecteur, et note la source en commentaire.
Quand tu as besoin d'une clé API ou d'un compte, arrête-toi et dis-moi précisément quoi créer et où.
À la fin de chaque lot : tests verts, commit, et un résumé de 5 lignes max de ce qui marche / ce qui manque.
```

---

## 1. Contexte et objectif

Je suis étudiant en **1ʳᵉ année d'école d'ingénieur**. Je cherche deux choses en parallèle :

| Recherche | Détails |
|---|---|
| **A. Alternance** (rentrée ⟨septembre 2027⟩) | Domaines : **développement logiciel**, **cybersécurité**, **DevOps / SRE / cloud**. En France, zone ⟨ville(s) + rayon en km⟩, rythme ⟨ex. 1 sem / 1 sem, 3 sem / 1 sem — à confirmer avec l'école⟩. Contrat d'apprentissage en priorité, contrat de professionnalisation accepté. |
| **B. Stage d'été à l'étranger** | **Juin → août ⟨2027⟩** (8 à 12 semaines). Pays par ordre de priorité : **1. Japon, 2. Corée du Sud, 3. Colombie, 4. Canada**. Mêmes domaines (dev, cyber, DevOps), ouvert aux stages « généralistes IT » accessibles à un Bac+1/Bac+2. |

**Objectif** : une seule application, que j'ouvre sur mon **PC Windows** et sur mon **téléphone Android**, qui :
1. **collecte automatiquement** les offres pertinentes depuis un maximum de sources légales ;
2. les **dédoublonne, classe et note** selon mon profil ;
3. me **notifie** des nouvelles offres intéressantes ;
4. me sert de **tableau de suivi de candidatures** (relances, entretiens, documents envoyés) ;
5. me rappelle les **contraintes de visa et les échéances** propres à chaque pays.

Utilisateur unique (moi). Budget : **0 €** (offres gratuites uniquement). Interface en **français**.

---

## 2. Choix technique imposé (et pourquoi)

**Application web progressive (PWA) + petit backend serverless.** Une seule base de code, installable sur Windows (Chrome/Edge → « Installer l'application ») et sur Android (Chrome → « Ajouter à l'écran d'accueil »), avec en option un vrai fichier **APK** généré via PWABuilder / Bubblewrap (Trusted Web Activity).

Pourquoi pas une appli native (Flutter, Tauri, React Native + Electron) : deux chaînes de build, signature, et surtout **la collecte doit tourner même quand mes appareils sont éteints**, et les deux appareils doivent voir les mêmes données. Un backend planifié + une PWA résout les deux problèmes.

| Couche | Techno | Rôle |
|---|---|---|
| Front | **React + Vite + TypeScript**, Tailwind, TanStack Query, `vite-plugin-pwa` (Workbox) | UI, mode hors-ligne (cache IndexedDB), installation, Web Share Target |
| Base de données / auth | **Supabase** (Postgres + Auth par lien magique + Row Level Security) | Stockage des offres et du suivi, synchro PC ↔ téléphone |
| Collecte | **Node 20 + TypeScript**, exécutée par **GitHub Actions** (cron toutes les 6 h + déclenchement manuel) | Connecteurs → normalisation → dédoublonnage → scoring → upsert Supabase |
| Notifications | **Web Push** (VAPID) envoyées par le job de collecte ; option : bot **Telegram** | Alertes nouvelles offres, relances |
| Hébergement front | **Cloudflare Pages** ou **Vercel** (offre gratuite) | HTTPS obligatoire pour PWA/push |
| Tests | **Vitest** (unitaires, connecteurs sur fixtures), **Playwright** (E2E mobile + desktop) | |

Si Claude Code identifie une alternative **strictement meilleure** sur ces critères (gratuit, Windows + Android, collecte autonome, synchro), il peut la proposer en mode plan, avec justification — mais pas l'adopter sans mon accord.

---

## 3. Sources de données

### Règles absolues
- **Uniquement des sources autorisées** : API officielles, flux RSS/JSON publics, pages publiques dont les CGU et le `robots.txt` le permettent. User-Agent identifiable, limitation de débit, cache.
- **Pas de scraping de LinkedIn, Indeed, Glassdoor, Welcome to the Jungle** ni d'aucun site dont les CGU l'interdisent. Pour ces sites : **liens de recherche pré-remplis** + **import manuel** (§3.4).
- Respecter les obligations d'attribution (ex. France Travail : citer la source, date de mise à jour, lien vers l'offre d'origine).
- Chaque connecteur vérifie la doc officielle **avant** d'être codé. Aucun endpoint « de mémoire ».

### 3.1 Niveau 1 — API officielles (à implémenter en premier)

| Source | Couverture | Notes pour l'implémentation |
|---|---|---|
| **La bonne alternance** — API « recherche d'offres » (`api.apprentissage.beta.gouv.fr`) | Alternance France (offres LBA + France Travail + partenaires) | Jeton gratuit via l'espace développeurs. Recherche par codes ROME / RNCP, géolocalisation, rayon, niveau de diplôme. Usage non commercial uniquement (OK). Limite de résultats par source → multiplier les requêtes (par code ROME × zone). |
| **France Travail — API Offres d'emploi v2** (`francetravail.io`) | Alternance France | OAuth2 client credentials, compte gratuit. Filtrer sur la nature de contrat apprentissage / professionnalisation (récupérer les codes exacts via les endpoints de référentiels). Fenêtre de pagination limitée → découper les requêtes (par département, par code ROME). Dédoublonner avec LBA, qui agrège déjà une partie de ces offres. |
| **Adzuna API** (`developer.adzuna.com`) | **France** et **Canada** | Clé gratuite, quota limité → peu de requêtes bien ciblées, mises en cache. Requêtes type : `alternance développeur`, `apprenti cybersécurité` (FR) ; `summer intern software`, `co-op developer`, `stage été informatique` (CA). |

**Codes ROME** : ne pas les coder en dur. Les récupérer via le référentiel (API ROME de France Travail ou référentiel exposé par l'API) et retenir ceux correspondant à : études et développement informatique, administration / sécurité des systèmes, production et exploitation des SI. Stocker la liste retenue dans `config/rome.json` avec la date de vérification.

### 3.2 Niveau 2 — ATS publics d'entreprises cibles

Beaucoup d'entreprises tech publient leurs offres via des ATS qui exposent un **JSON public** (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee…). Implémenter :
- un connecteur générique par ATS (vérifier le format exact de chaque API publique) ;
- un fichier `config/watchlist.yaml` d'entreprises cibles par pays (`nom`, `pays`, `ats`, `slug`, `url carrière`) ;
- un outil `npm run detect-ats <url-carrière>` qui devine l'ATS utilisé et propose l'entrée YAML.

Pré-remplir la watchlist avec ~10 entreprises par pays **dont tu as vérifié qu'elles recrutent des profils tech et utilisent un ATS public** (filiales françaises à l'étranger, entreprises tech recrutant en anglais). Ne pas inventer d'entrées : chaque entrée doit avoir été testée.

### 3.3 Niveau 3 — Job boards et réseaux par pays (selon CGU)

Pour chaque site ci-dessous : vérifier l'existence d'un flux RSS/JSON ou d'une API et les CGU. **Si l'accès automatisé est autorisé → connecteur. Sinon → lien de recherche pré-rempli dans l'onglet « Sources ».**

| Pays | Pistes à évaluer |
|---|---|
| Japon | Job boards anglophones pour développeurs étrangers (TokyoDev, Japan Dev, GaijinPot…), CCI France Japon |
| Corée du Sud | Saramin (API officielle sur validation), Wanted, JobKorea, CCI France-Corée (FKCCI) |
| Colombie | Computrabajo, elempleo, Magneto, rubrique « prácticas » des agrégateurs, CCI France-Colombie |
| Canada | Guichet-Emplois / Job Bank (vérifier les données ouvertes), sites carrière d'entreprises, offres co-op |
| Transverse | Réseau des CCI françaises à l'international, offres de stage relayées par l'école, AIESEC / IAESTE (programmes de stage), sites d'ambassades |

### 3.4 Import manuel (indispensable)

- **Web Share Target** : depuis n'importe quelle appli Android (LinkedIn, navigateur…), « Partager → StageRadar » crée une offre à partir de l'URL.
- **Champ « Coller une URL »** + **bookmarklet** pour Windows.
- À l'import, une fonction serveur récupère la page et extrait les données structurées **schema.org `JobPosting` (JSON-LD)** si présentes ; sinon titre + meta-description, et je complète à la main.
- **Saisie libre** (offre vue sur un salon, un contact…).

### 3.5 Candidatures spontanées
Onglet « Entreprises cibles » : entreprises susceptibles de recruter en alternance (si l'API La bonne alternance expose ce type de résultat, l'utiliser) + entreprises de la watchlist. Même suivi Kanban que les offres.

---

## 4. Traitement des offres

### 4.1 Modèle normalisé (`offers`)
`id`, `source`, `source_id`, `url`, `url_canonique`, `titre`, `entreprise`, `pays` (ISO), `ville`, `teletravail` (sur site / hybride / remote), `type` (`alternance` | `stage` | `autre`), `contrat` (apprentissage / pro / stage / co-op…), `domaines[]` (`dev` | `cyber` | `devops`), `date_debut`, `duree_semaines`, `remuneration` (texte + montant normalisé si possible), `langues_requises[]`, `niveau_etudes`, `description` (texte nettoyé), `competences[]`, `date_publication`, `date_collecte`, `date_expiration`, `score`, `score_details` (JSON), `hash_dedup`, `actif`.

Tables annexes : `applications` (suivi), `companies`, `documents` (CV/lettres), `events` (historique), `sources_status` (santé des connecteurs), `settings` (profil, poids du scoring), `push_subscriptions`.

### 4.2 Classification
- **Domaine** : règles par mots-clés pondérés FR/EN/ES/JA/KO (ex. dev : développeur, software engineer, full-stack, backend… ; cyber : SOC, pentest, sécurité, GRC, IAM… ; devops : CI/CD, Kubernetes, SRE, cloud, infra as code…), dans `config/keywords.yaml`, modifiable dans l'UI.
- **Type** et **période** : détecter alternance/apprentissage, stage/intern/co-op/prácticas/인턴/インターン, et extraire les dates. Une offre de stage est « compatible été » si elle chevauche ⟨juin–août 2027⟩ ou ne précise pas de dates.
- **Exclusions** : offres réservées aux Bac+5 / fin d'études / « 3+ years experience », hors domaines (commercial, RH…) — masquées par défaut, visibles via un filtre.

### 4.3 Score de pertinence (0–100, explicable)
Pondérations modifiables dans les réglages. Valeurs par défaut :

| Critère | Poids |
|---|---|
| Domaine (dev / cyber / devops) | 30 |
| Période compatible (rentrée alternance ou été) | 20 |
| Pays (Japon > Corée > Colombie > Canada pour les stages ; zone choisie pour l'alternance) | 15 |
| Niveau accessible à un Bac+1/Bac+2 | 15 |
| Langue (FR/EN = plein score, ES = partiel, JA/KO exigé = pénalité) | 10 |
| Fraîcheur de l'offre | 10 |

Chaque carte affiche le score **et** son détail (« +30 domaine DevOps, −10 japonais N2 exigé… »).

### 4.4 Dédoublonnage
URL canonique, puis empreinte `entreprise normalisée + titre normalisé + ville`, puis similarité (trigrammes Postgres `pg_trgm`) au-dessus d'un seuil. Les doublons sont **fusionnés** (une offre, plusieurs liens sources).

### 4.5 Cycle de vie
Une offre absente de sa source pendant 3 collectes consécutives passe `actif = false` (conservée si elle est dans mon suivi).

---

## 5. Fonctionnalités de l'application

### 5.1 Écrans
1. **Fil** (accueil) : offres triées par score, onglets **Alternance / Stage été / Tout**, badge « nouveau ». Filtres : domaine, pays, ville/rayon, type de contrat, période, remote, langue, source, score minimum, masquées. Recherche plein texte. Actions rapides par balayage sur mobile (garder / masquer).
2. **Détail offre** : infos normalisées, description, détail du score, lien vers l'original, **fiche pays** associée, boutons « Ajouter au suivi », « Masquer », notes.
3. **Suivi (Kanban)** : colonnes `À étudier → À postuler → Postulé → Relance → Entretien → Offre → Refus/Abandon`. Date de candidature, version de CV/lettre envoyée, contact, notes d'entretien. **Relances automatiques** proposées à J+7 et J+14.
4. **Calendrier / échéances** : dates limites des offres, entretiens, relances, et échéances administratives par pays (§5.2).
5. **Fiches pays** (Japon, Corée du Sud, Colombie, Canada) : résumé visa/stage, liens **officiels**, échéances, liens de recherche pré-remplis, conseils. Chaque fiche porte une date « dernière vérification » et est éditable par moi.
6. **Sources** : état de chaque connecteur (dernière exécution, nb d'offres, erreurs), liens de recherche manuels (LinkedIn, Indeed, WTTJ… pré-remplis avec mes mots-clés), bouton « Lancer une collecte ».
7. **Documents** : CV FR / EN / ES, modèles de lettre, avec versions.
8. **Statistiques** : candidatures par semaine, taux de réponse, répartition par pays/domaine, entonnoir.
9. **Réglages** : profil (ville, rayon, dates, langues + niveaux), mots-clés, poids du scoring, notifications, export/import JSON + CSV.

### 5.2 Contenu initial des fiches pays (à vérifier sur sources officielles avant publication)
Points de départ que j'ai relevés — **Claude Code doit les revérifier sur les sites officiels (ambassades, Cancillería, IRCC) et citer le lien** :
- **Canada** : un stage, même non rémunéré, exige un permis de travail ; le permis « Stage coop international » (Expérience internationale Canada) concerne les étudiants inscrits dont le stage fait partie du cursus. La saison EIC ouvre généralement en janvier avec une pause d'octobre à décembre → **échéance clé à mettre dans le calendrier**.
- **Japon** : séjour sans visa ≤ 90 jours pour les Français, mais sans activité rémunérée ; un stage rémunéré nécessite un statut spécifique (« activités culturelles »). Distinguer indemnité et rémunération → à confirmer auprès de l'ambassade/immigration.
- **Corée du Sud** : visa de stage difficile à obtenir pour un étudiant non diplômé selon de nombreux témoignages ; existence d'un programme vacances-travail France–Corée → statut « à vérifier ».
- **Colombie** : stages (rémunérés ou non) via un visa de visiteur (V) avec lettre de l'établissement d'enseignement ; exemption possible selon nationalité et durée → à confirmer sur cancilleria.gov.co.

### 5.3 Notifications
- Push immédiat pour toute nouvelle offre au score ≥ ⟨75⟩.
- Résumé quotidien à ⟨19 h⟩ (heure de Paris) : nouvelles offres du jour, relances dues, échéances à J-7.
- Réglables par type ; heures calmes.

### 5.4 Exigences non fonctionnelles
- **Mobile-first**, utilisable d'une main ; desktop en 2–3 colonnes. Mode sombre automatique.
- **Hors-ligne** : fil, détails et suivi consultables sans réseau ; modifications synchronisées au retour.
- Performance : premier affichage < 2 s en 4G ; score Lighthouse PWA/Accessibilité ≥ 90.
- **Sécurité** : aucune clé API dans le front ; secrets dans GitHub Secrets / variables Supabase ; RLS activée (seul mon compte lit/écrit) ; `.env.example` documenté.
- **Robustesse** : un connecteur qui échoue n'interrompt pas les autres ; retries avec backoff ; journal dans `sources_status`.
- Code : TypeScript strict, ESLint + Prettier, interface commune `Connector { id; fetch(params): Promise<RawOffer[]>; normalize(raw): Offer }`.

---

## 6. Lots de réalisation et critères d'acceptation

**Lot 0 — Socle**
Monorepo (`apps/web`, `packages/collector`, `packages/shared`), Supabase (schéma + migrations + RLS), auth par lien magique, PWA installable vide, CI GitHub Actions (lint + tests).
✅ L'app s'installe sur Windows et Android, je me connecte, la CI est verte.

**Lot 1 — Collecte France (alternance)**
Connecteurs La bonne alternance + France Travail, normalisation, classification, dédoublonnage, scoring, cron 6 h.
✅ Une exécution manuelle remplit la base avec des offres d'alternance dev/cyber/devops dans ma zone ; zéro doublon visible entre LBA et France Travail ; tests sur fixtures pour chaque connecteur.

**Lot 2 — Fil + détail + suivi**
Écrans Fil, Détail, Kanban, filtres, recherche, hors-ligne.
✅ Je peux filtrer, ouvrir une offre, l'ajouter au suivi sur le téléphone et la retrouver sur le PC.

**Lot 3 — Stages à l'étranger**
Adzuna (FR + CA), connecteurs ATS génériques + watchlist vérifiée, connecteurs niveau 3 autorisés, liens de recherche pré-remplis, fiches pays.
✅ Le filtre « Stage été » affiche des offres pour au moins le Canada et le Japon ; chaque fiche pays a ses liens officiels et une date de vérification.

**Lot 4 — Import manuel**
Web Share Target Android, champ URL, bookmarklet, extraction JSON-LD `JobPosting`.
✅ Depuis l'appli LinkedIn sur Android, « Partager → StageRadar » crée une offre pré-remplie.

**Lot 5 — Notifications + calendrier + relances**
Web Push, résumé quotidien, échéances, relances J+7/J+14.
✅ Je reçois une notification sur Android et sur Windows lors d'une collecte de test.

**Lot 6 — Statistiques, documents, export, APK**
Stats, gestion des CV/lettres, export JSON/CSV, génération d'un APK via PWABuilder/Bubblewrap avec instructions pas à pas dans le README.
✅ J'installe l'APK sur mon téléphone ; l'export JSON se réimporte sans perte.

**Lot 7 (optionnel) — Assistance IA**
Avec ma propre clé API (stockée côté serveur) : résumé d'offre en 3 lignes, points du CV à mettre en avant, brouillon de lettre FR/EN/ES. Désactivé par défaut.

---

## 7. Règles de travail pour Claude Code

1. **Mode plan d'abord**, validation de ma part avant tout code.
2. **Vérifier avant de coder** : chaque endpoint, paramètre, code de référentiel et règle de visa est vérifié sur la source officielle ; l'URL de la doc est mise en commentaire.
3. **Ne jamais inventer de données** (entreprises, offres, règles de visa). En cas de doute : marquer `à vérifier` dans l'UI.
4. **Tests** : fixtures JSON réelles (anonymisées) pour chaque connecteur ; tests de scoring et de dédoublonnage ; un test E2E Playwright par lot sur viewport mobile et desktop.
5. **Petits commits** par lot, messages clairs ; README tenu à jour (installation, variables d'environnement, création des comptes API, installation Windows/Android).
6. **Me demander** quand il faut créer un compte ou une clé (La bonne alternance, francetravail.io, Adzuna, Supabase, Cloudflare/Vercel, VAPID) — avec le lien exact et les champs à remplir.
7. À la fin : une checklist « ce qui reste manuel » (sources non automatisables, vérifications visa à refaire).

---

## 8. Hors périmètre
Candidature automatique sur les sites, scraping de sites l'interdisant, multi-utilisateurs, monétisation.
