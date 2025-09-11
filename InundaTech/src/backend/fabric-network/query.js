import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function queryTransaction(functionName, args) {
  let gateway;
  try {
    const ccpPath = path.resolve(__dirname, 'connection-org1.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    const identity = await wallet.get('appUser');
    if (!identity) {
      throw new Error('No se encontró la identidad "appUser" en el wallet');
    }

    gateway = new Gateway();
    await gateway.connect(ccp, {
      wallet,
      identity: 'appUser',
      discovery: { enabled: true, asLocalhost: true },
    });

    const network = await gateway.getNetwork('mychannel');
    const contract = network.getContract('basic');

    console.log(`Consultando ${functionName} con args:`, args);
    const result = await contract.evaluateTransaction(functionName, ...args);
    
    console.log(`Consulta exitosa: ${functionName}`);
    return result.toString();
    
  } catch (error) {
    console.error(`Error en queryTransaction (${functionName}):`, error);
    throw error;
  } finally {
    if (gateway) {
      await gateway.disconnect();
    }
  }
}