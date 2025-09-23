Paquete Hyperledger para InundaTech
Contenido:
- chaincode/mycontract/ (contract.js, package.json)
- fabric-client/ (API REST + script push_from_db.js)
- db/schema.sql (esquema ejemplo)
- scripts/db_to_chain.sh (script para ejecutar push_from_db.js)
- README_Hyperledger_instructions.md (instrucciones básicas)

Pasos rápidos:
1) Deploy del chaincode:
   - Copia la carpeta chaincode/mycontract en tu entorno de Fabric (ej: fabric-samples/test-network/chaincode/)
   - Empaqueta e instala el chaincode usando los pasos de lifecycle (o usando network.sh deployCC si tu test-network lo soporta)
   - Nombre sugerido del chaincode: registry

2) Preparar wallet/identity:
   - En fabric-client/ crea la carpeta 'wallet/' y coloca la identidad 'appUser' (enroll/register con fabric-ca-client)

3) Configurar connection:
   - Edita fabric-client/connection-org1.json y coloca las rutas/puertos/certs correctos de tu red

4) Configurar la base de datos:
   - Ejecuta db/schema.sql en tu MySQL/Postgres (ajusta sintaxis si usas Postgres)
   - Inserta datos de prueba en users, measurements, alerts

5) Ejecutar script que empuja datos desde DB hacia Fabric:
   - Ve a /scripts y ejecuta:
       ./db_to_chain.sh
   - Antes de ejecutar exporta variables:
       export DB_HOST=localhost
       export DB_USER=root
       export DB_PASSWORD=tu_pass
       export DB_NAME=inundasys

6) Levantar API REST (opcional):
   cd fabric-client
   npm install
   npm start
   - Usa endpoints POST /registerUser, POST /measurement, POST /alert, GET /measurements/:userId, GET /alerts/:userId

Notas:
- Asegúrate que las versiones de fabric-network y fabric-contract-api coincidan con tu red Fabric (v2.5 si usas esa).
- Este paquete asume Fabric corriendo localmente con discovery asLocalhost=true. Para entornos remotos ajusta discovery y las rutas TLS.

Referencia:
- Sigue la documentación oficial de Hyperledger Fabric v2.5 para lifecycle, CA, y despliegue: https://hyperledger-fabric.readthedocs.io/en/release-2.5/

