#!/bin/bash
#Lancer l'environnement de dev en local avec docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d

#Lancer l'environnement de dev en local avec npm
#npm run dev $NODE_OPTIONS
