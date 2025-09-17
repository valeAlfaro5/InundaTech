const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const { connectGateway } = require('./fabricNetwork');
const path = require('path');

const app = express();
app.use(morgan('dev'));
app.use(bodyParser.json());

const CONNECTION_PROFILE = path.resolve(__dirname, 'connection-org1.json');
const WALLET_PATH = path.resolve(__dirname, 'wallet');
const IDENTITY = 'appUser';
const CHANNEL_NAME = 'mychannel';
const CHAINCODE_NAME = 'registry';

async function getContract() {
  const gateway = await connectGateway(CONNECTION_PROFILE, WALLET_PATH, IDENTITY);
  const network = await gateway.getNetwork(CHANNEL_NAME);
  const contract = network.getContract(CHAINCODE_NAME);
  return { gateway, contract };
}

app.post('/registerUser', async (req, res) => {
  try {
    const { userId, name, email, role } = req.body;
    if (!userId || !name || !email) return res.status(400).send({ error: 'Faltan campos' });
    const { gateway, contract } = await getContract();
    const result = await contract.submitTransaction('registerUser', userId, name, email, role || 'user');
    await gateway.disconnect();
    res.json({ success: true, result: JSON.parse(result.toString()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/measurement', async (req, res) => {
  try {
    const { userId, metric, value, unit, timestamp } = req.body;
    const measurementId = uuidv4();
    const { gateway, contract } = await getContract();
    const result = await contract.submitTransaction('addMeasurement', measurementId, userId, metric, value.toString(), unit || '', timestamp || '');
    await gateway.disconnect();
    res.json({ success: true, result: JSON.parse(result.toString()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/alert', async (req, res) => {
  try {
    const { userId, level, message, timestamp } = req.body;
    const alertId = uuidv4();
    const { gateway, contract } = await getContract();
    const result = await contract.submitTransaction('addAlert', alertId, userId, level || 'info', message || '', timestamp || '');
    await gateway.disconnect();
    res.json({ success: true, result: JSON.parse(result.toString()) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/measurements/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { gateway, contract } = await getContract();
    const result = await contract.evaluateTransaction('queryMeasurementsByUser', userId);
    await gateway.disconnect();
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/alerts/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const { gateway, contract } = await getContract();
    const result = await contract.evaluateTransaction('queryAlertsByUser', userId);
    await gateway.disconnect();
    res.json(JSON.parse(result.toString()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`API escuchando en http://localhost:${PORT}`));