# Clés à créer pour les sources qui en demandent

StageRadar ne crée ni compte ni clé à ta place. Ce document liste, pour chaque service, où t'inscrire et ce qu'on te demande. Tant qu'une clé manque, la source correspondante n'est simplement pas collectée : le reste de l'application fonctionne.

Aucune de ces clés n'est encore utilisée par le code : les connecteurs seront écrits et testés quand la clé existera, car il faut de vraies réponses du service pour les vérifier (cahier des charges, §7).

Une clé ne se met jamais dans le dépôt. Elle ira dans le fichier `.env` à la racine (ignoré par git), sous le nom de variable indiqué, puis sera copiée sur le serveur au déploiement.

## Alternance en France (lot 1)

### La bonne alternance

|               |                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------ |
| Inscription   | <https://api.apprentissage.beta.gouv.fr/fr/compte/profil> (« Obtenir une clé d'API »)                  |
| Documentation | <https://api.apprentissage.beta.gouv.fr/fr/documentation-technique> (recherche d'offres : `jobSearch`) |
| Conditions    | Gratuit, réservé aux usages non lucratifs ; revente interdite ; données sous licence etalab-2.0        |
| Variable      | `LBA_API_KEY`                                                                                          |

Lu le 14 octobre 2026. La recherche se fait par codes ROME ou RNCP, position et rayon : les noms exacts des paramètres sont dans la documentation technique, à relire au moment d'écrire le connecteur.

### France Travail (offres d'emploi)

|                   |                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Inscription       | <https://francetravail.io> (créer un compte, puis une application qui demande l'API « Offres d'emploi ») |
| Ce que tu obtiens | Un identifiant client et une clé secrète                                                                 |
| Variables         | `FRANCE_TRAVAIL_CLIENT_ID`, `FRANCE_TRAVAIL_CLIENT_SECRET`                                               |

À confirmer : la page du catalogue n'a pas pu être lue automatiquement le 14 octobre 2026. Le parcours exact (formulaire, délai de validation, quotas) est à relever toi-même sur le site.

## Agrégateurs internationaux (lot 3)

### Careerjet

|             |                                                           |
| ----------- | --------------------------------------------------------- |
| Inscription | <https://www.careerjet.com/partners/api> (compte éditeur) |
| Variable    | `CAREERJET_API_KEY`                                       |

Point à vérifier dans les conditions du compte avant de s'en servir : l'API demande l'adresse IP et le navigateur de la personne qui cherche, ce qui cadre mal avec une collecte lancée par un serveur.

### Jooble

|             |                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------- |
| Inscription | <https://jooble.org/api/about> : formulaire (nom, fonction, e-mail, site web, téléphone) |
| Conditions  | <https://jooble.org/info/terms>                                                          |
| Variable    | `JOOBLE_API_KEY`                                                                         |

Lu le 14 octobre 2026. La page ne dit pas si la clé est délivrée tout de suite ou après examen.

## Assistance par IA (lot 7, facultatif)

Résumé d'offre, points du CV à mettre en avant, brouillon de lettre. Il faut ta propre clé d'API d'un fournisseur de modèle de langage, facturée à l'usage par ce fournisseur. Elle resterait sur le serveur, jamais dans l'application. Variable prévue : `IA_API_KEY`.

## Ce qui n'a pas besoin de toi

- **Sites carrières des entreprises** (Greenhouse, Lever, Ashby) et **Japan Dev** : accès public, sans clé.
- **Notifications** : la paire de clés « VAPID » est générée une fois sur le serveur par `deploy/serveur/installer.sh`. Elle ne correspond à aucun compte.
- **Traduction** : faite par le navigateur (Chrome sur ordinateur), sans clé.
