
INSTRUCCIONES COMPLETAS - INUNDATECH + HYPERLEDGER FABRIC (v2.5)
================================================================================
Este paquete contiene todo lo necesario para integrar tu proyecto con Hyperledger Fabric:
- chaincode/mycontract (smart contract)
- fabric-client (API + push from DB script + Postman collection)
- dashboard (HTML estático para visualización rápida)
- documentación en esta misma guía

Resumen de flujo:
1) Tu base de datos (MySQL) contiene tablas users, measurements, alerts.
2) El script push_from_db.js lee esas tablas y empuja registros al chaincode (ledger).
3) La API (fabric-client/app.js) permite crear registros nuevos y consultarlos desde cualquier frontend.
4) El dashboard estático llama a la API para mostrar mediciones y alertas por usuario.

Requisitos previos:
- Docker y docker-compose (recomendado) o un entorno Fabric ya desplegado.
- Fabric samples (test-network) compatible con v2.5 (https://github.com/hyperledger/fabric-samples)
- Node.js 16+ / npm
- MySQL o MariaDB (o ajustar script para Postgres)
- fabric-ca-client / peer CLI para enroll/register identities (parte de fabric-samples bin)

Pasos detallados (test-network de fabric-samples):
1) Clonar fabric-samples y entrar en test-network:
   git clone https://github.com/hyperledger/fabric-samples.git
   cd fabric-samples/test-network
2) Levantar la red y crear canal:
   ./network.sh up createChannel -c mychannel -s couchdb
   # Esto deja peers, orderer y couchdb si lo pides
3) Empaquetar e instalar el chaincode (desde test-network):
   # Copia la carpeta chaincode/mycontract al directorio deseado, por ejemplo ../chaincode/
   # Usando helper network.sh (si tu versión lo tiene):
   ../network.sh deployCC -ccn registry -ccp /ruta/a/chaincode/mycontract -ccl javascript
   # Alternativa: usa peer lifecycle chaincode package/install/approve/commit (ver docs oficiales)
4) Registrar/enroll identities para appUser (Org1):
   export PATH=$PATH:/ruta/a/fabric-samples/bin
   # Enroll admin
   mkdir -p ../../wallet
   export FABRIC_CA_CLIENT_HOME=${PWD}/organizations/peerOrganizations/org1.example.com/ # ajusta según sample
   # Usualmente test-network ya crea identidades; para CA custom, usa fabric-ca-client enroll/register
5) Preparar la wallet en fabric-client:
   - Copia la identidad (cert y key) de appUser a fabric-client/wallet/appUser/*
   - Puedes usar los scripts de test-network para copiar las credenciales
6) Configurar connection-org1.json en fabric-client con rutas correctas (peers, URLs, tls ca paths)
7) Configurar DB: ejecutar db/schema.sql en tu MySQL y poblar datos de prueba
8) Ejecutar push_from_db:
   cd fabric-client
   npm install
   export DB_HOST=localhost DB_USER=root DB_PASSWORD=tu_pass DB_NAME=inundasys
   node push_from_db.js
9) Levantar API:
   npm start
   - Probar endpoints con Postman / collection incluida
10) Dashboard:
   - Abre dashboard/index.html en tu navegador (asegúrate que la API esté accesible en localhost:3000).

Comandos útiles para diagnóstico:
- Verificar chaincode instalado/committed: peer lifecycle chaincode querycommitted -C mychannel
- Consultar ledger desde CLI: peer chaincode query -C mychannel -n registry -c '{"Args":["queryAll"]}'

Seguridad y producción:
- No uses discovery asLocalhost=true en producción.
- Usa TLS, rotación de certificados y políticas de endorsement adecuadas.
- Protege la wallet y el acceso a la API con autenticación (JWT, TLS mTLS, etc.).

Referencias:
- Documentación oficial Fabric v2.5: https://hyperledger-fabric.readthedocs.io/en/release-2.5/

