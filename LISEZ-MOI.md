## ID-FIX

[Lisez la version en anglais README.md](README.md)

## Description

l'API id-fix est un service qui reçoit des données au format BAL, les traite et les envoie à la plateforme BAN.
En fonction de si la commune utilise ou non les ban-id, id-fix enverra les données à l'api legacy de ban-plateforme ou utilisera l'api ban-id de ban-plateforme. Dans le deuxième cas, id-fix détectera les données à créer, à modifier et à supprimer. Il les formatera également dans la structure correcte pour utiliser l'api ban-id.

## Variables d'environnement

Copiez-collez le fichier `.env.sample` en tant que fichier `.env`.

| Nom de la variable        | Valeur par défaut | Obligatoire | Description |
|---------------------------|------------------|-------------|-------------|
| `IDEFIX_ADMIN_TOKENS`    | `""` (vide)      | ✅ Oui      | Liste de jetons d'authentification administrateur, séparés par des virgules. Chaque jeton doit contenir exactement **36 caractères** et être préfixé par `Token` dans les requêtes API. |
| `BAN_API_URL`            | `""` (vide)      | ✅ Oui      | URL de l'API BAN. |
| `BAN_API_TOKEN`          | `""` (vide)      | ✅ Oui      | Jeton d'accès à l'API BAN. |
| `BAN_LEGACY_API_TOKEN`   | `""` (vide)      | ✅ Oui      | Jeton d'accès à l'ancienne API BAN. |
| `API_DEPOT_URL`          | `""` (vide)      | ✅ Oui      | URL de l'API Dépôt. |
| `STANDALONE_MODE`        | `false`         | ❌ Non      | Indique si le système fonctionne en mode autonome. |
| `PATH_TO_BAL_FILE`       | `./`            | ❌ Non      | Chemin du répertoire où est stocké le fichier BAL. Le fichier doit être nommé **`bal-${cog}.csv`**, où `${cog}` correspond au cog du district. |


## Installation

Choisissez entre une installation avec Docker ou en local :

### Docker

#### Prérequis

- Docker
- Docker-compose

Instructions pour installer l'api (en mode dev) :

1. Clonez ce dépôt
2. Lancez le conteneur Docker :

```bash
docker-compose up --build -d
```

### Local

#### Prérequis

- Node (v18 ou version supérieure)
- NPM

Instructions pour installer l'api (en mode dev) :

1. Installez les dépendances :

```bash
npm install
```

2. Lancez l'api :

```bash
npm run dev
```

## Scripts

I. Initialisez un fichier csv bal dans la plateforme ban en utilisant le traitement bal d'id-fix.

Prérequis : les données de la commune de la bal à importer doivent déjà être présentes dans la base de données ban. Sinon, utilisez l'api POST /district pour la créer.

Voici la commande à utiliser :

```bash
npm run initBALIntoBAN chemin/vers/le/fichier-BAL.csv
```

remplacez "chemin/vers/le/fichier-BAL.csv" par le chemin réel du fichier csv bal à traiter et à insérer dans la ban.

## Logs

Ce projet utilise la bibliothèque de log Winston. La configuration des logs est définie dans le fichier logger.ts.

### Modes de log

En mode développement (lorsque NODE_ENV n'est pas défini sur production), le logger affiche les logs dans la console.

En mode production (lorsque NODE_ENV est défini sur production), le logger écrit les logs dans un fichier à l'aide de la bibliothèque winston-daily-rotate-file. Les fichiers de logs sont créés quotidiennement et sont stockés dans le répertoire logs. Le nom de fichier des logs est au format id-fix-YYYY-MM-DD.log. Pour plus de détails sur les paramètres de rotation (taille maximale du fichier, nombre maximal de fichiers, ...), veuillez vous référer au fichier logger.ts.

### Format des logs

Les logs sont formatés en JSON et chaque entrée de log inclut un timestamp.

## Licence

Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## Crédits

Express
TypeScript
Docker
Docker Compose
ESLint
Prettier
