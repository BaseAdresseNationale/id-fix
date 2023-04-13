## ID-FIX

## Description
Id-fix API est un service qui reçoit des données au format BAL, les traite et les envoie à la plateforme BAN.
En fonction de si la 'commune' utilise ou non BAN-ID, Id-fix enverra les données à l'API héritée ou utilisera l'API BAN-ID. Dans le deuxième cas, Id-fix détectera les données à créer, à modifier et à supprimer. Il les formatera également dans la structure correcte pour utiliser l'API BAN-ID.

## Prérequis
Docker
Docker-compose

## Installation
Instructions sur la façon d'installer l'API :

1. Clonez ce dépôt
2. Démarrez le conteneur Docker :

```bash
docker-compose up --build -d
```

## Licence
Ce projet est sous licence MIT - voir le fichier LICENSE pour plus de détails.

## Crédits
Express
TypeScript
Docker
Docker Compose
ESLint
Prettier