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
    const ca = new FabricCAServices(caInfo.url, { trustedRoots: caInfo.tlsCACerts ? caInfo.tlsCACerts.pem : undefined, verify: false }, caInfo.caName);

    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('admin');
    if (identity) {
      console.log('✅ Admin ya existe en wallet');
      return;
    }

    const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
    const x509Identity = {
      credentials: {
        certificate: enrollment.certificate,
        privateKey: enrollment.key.toBytes(),
      },
      mspId: 'Org1MSP',
      type: 'X.509',
    };
    await wallet.put('admin', x509Identity);
    console.log('✅ Admin enrollado y guardado en wallet');
  } catch (error) {
    console.error('❌ Error al registrar admin:', error);
    process.exit(1);
  }
}

main();
