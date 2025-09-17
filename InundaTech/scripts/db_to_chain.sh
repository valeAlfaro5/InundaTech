#!/bin/bash
# Ejecutar push desde la DB a la blockchain
# Ajusta variables de entorno DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
cd "$(dirname "$0")/.."
cd fabric-client
npm install
# export DB_HOST=... etc
node push_from_db.js
