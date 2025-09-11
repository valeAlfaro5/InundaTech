import fs from 'fs';
import path from 'path';
import { Wallets } from 'fabric-network';
import FabricCAServices from 'fabric-ca-client';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  try {
    const username = process.argv[2];
    if (!username) {
      console.log('Debes pasar un nombre de usuario. Ejemplo: node registerUser.js usuario1');
      process.exit(1);
    }

    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const userExists = await wallet.get(username);
    if (userExists) {
      console.log(`El usuario "${username}" ya existe en el wallet`);
      return;
    }

    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.log('Admin no encontrado en el wallet. Primero corre enrollAdmin.js');
      return;
    }

    const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
    const ca = new FabricCAServices(caURL);

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register(
      {
        affiliation: 'org1.department1',
        enrollmentID: username,
        role: 'client',
      },
      adminUser
    );

    const enrollment = await ca.enroll({
      enrollmentID: username,
      enrollmentSecret: secret,
    });

    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };

    await wallet.put(username, x509Identity);
    console.log(`Usuario "${username}" registrado e inscrito exitosamente`);
  } catch (error) {
    console.error(`Error registrando usuario: ${error}`);
    process.exit(1);
  }
}

main();
