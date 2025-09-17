const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');

async function connectGateway(connectionProfilePath, walletPath, identity) {
  const ccp = JSON.parse(fs.readFileSync(connectionProfilePath, 'utf8'));
  const wallet = await Wallets.newFileSystemWallet(walletPath);
  const gateway = new Gateway();
  await gateway.connect(ccp, { wallet, identity, discovery: { enabled: true, asLocalhost: true } });
  return gateway;
}

module.exports = { connectGateway };