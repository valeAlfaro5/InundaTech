'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function main() {
  try {
    const ccpPath = path.resolve(__dirname, '..', 'fabric-samples', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    if (!fs.existsSync(ccpPath)) {
      console.error('connection-org1.json not found at', ccpPath);
      process.exit(1);
    }
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
    const caURL = caInfo.url;
    const ca = new FabricCAServices(caURL, { verify: false }, caInfo.caName);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const userIdentity = await wallet.get('appUser');
    if (userIdentity) {
      console.log('✅ appUser ya existe en wallet');
      return;
    }

    const adminIdentity = await wallet.get('admin');
    if (!adminIdentity) {
      console.error('❌ Admin no encontrado en wallet. Ejecutá enrollAdmin.js primero.');
      process.exit(1);
    }

    const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
    const adminUser = await provider.getUserContext(adminIdentity, 'admin');

    const secret = await ca.register({
      affiliation: 'org1.department1',
      enrollmentID: 'appUser',
      role: 'client'
    }, adminUser);

    const enrollment = await ca.enroll({ enrollmentID: 'appUser', enrollmentSecret: secret });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };
    await wallet.put('appUser', x509Identity);
    console.log('✅ appUser registrado y guardado en wallet');
  } catch (error) {
    console.error('❌ Error registrando appUser:', error);
    process.exit(1);
  }
}

main();
