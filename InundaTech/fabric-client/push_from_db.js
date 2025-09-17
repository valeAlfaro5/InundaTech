const mysql = require('mysql2/promise');
const { connectGateway } = require('./fabricNetwork');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inundasys'
};

const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'registry';
const IDENTITY = 'appUser';
const WALLET_PATH = path.resolve(__dirname, 'wallet');
const CONNECTION_PROFILE = path.resolve(__dirname, 'connection-org1.json');

async function main() {
  const db = await mysql.createConnection(DB_CONFIG);
  console.log('Conectado a DB');

  const gateway = await connectGateway(CONNECTION_PROFILE, WALLET_PATH, IDENTITY);
  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);

  // Push users
  const [users] = await db.execute('SELECT id, name, email, role FROM users');
  for (const u of users) {
    try {
      const exists = await contract.evaluateTransaction('userExists', u.id);
      // userExists is not exposed as evaluate by name here, but we attempt register and ignore duplicate
      await contract.submitTransaction('registerUser', String(u.id), u.name, u.email, u.role || 'user');
      console.log('Usuario enviado:', u.id);
    } catch (err) {
      console.log('Usuario ya existente o error:', u.id, err.message);
    }
  }

  // Push measurements
  const [meas] = await db.execute('SELECT id, user_id, metric, value, unit, timestamp FROM measurements ORDER BY timestamp ASC LIMIT 1000');
  for (const m of meas) {
    try {
      const mid = m.id || uuidv4();
      await contract.submitTransaction('addMeasurement', String(mid), String(m.user_id), m.metric, String(m.value), m.unit || '', m.timestamp ? m.timestamp.toISOString ? m.timestamp.toISOString() : String(m.timestamp) : '');
      console.log('Medición enviada:', mid);
    } catch (err) {
      console.error('Error enviando medición', m.id, err.message);
    }
  }

  // Push alerts
  const [alerts] = await db.execute('SELECT id, user_id, level, message, timestamp FROM alerts ORDER BY timestamp ASC LIMIT 1000');
  for (const a of alerts) {
    try {
      const aid = a.id || uuidv4();
      await contract.submitTransaction('addAlert', String(aid), String(a.user_id), a.level || 'info', a.message || '', a.timestamp ? (a.timestamp.toISOString ? a.timestamp.toISOString() : String(a.timestamp)) : '');
      console.log('Alerta enviada:', aid);
    } catch (err) {
      console.error('Error enviando alerta', a.id, err.message);
    }
  }

  await gateway.disconnect();
  await db.end();
  console.log('Push completado');
}

main().catch(err => { console.error('Error principal:', err); process.exit(1); });
