import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { Gateway, Wallets } from "fabric-network";
import path from "path";
import fs from "fs";

const app = express();
const port = 4000; 

app.use(cors());
app.use(bodyParser.json());

const ccpPath = path.resolve("..", "fabric-samples", "test-network", "organizations", "peerOrganizations", "org1.example.com", "connection-org1.json");
const walletPath = path.join(process.cwd(), "wallet");


async function getContract() {
  const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));
  const wallet = await Wallets.newFileSystemWallet(walletPath);

  const gateway = new Gateway();
  await gateway.connect(ccp, {
    wallet,
    identity: "appUser", 
    discovery: { enabled: true, asLocalhost: true }
  });

  const network = await gateway.getNetwork("inundatechchannel"); 
  const contract = network.getContract("registry"); 
  return { contract, gateway };
}

app.post("/alert", async (req, res) => {
  const { userId, level, message } = req.body;

  if (!userId || !level || !message) {
    return res.status(400).json({ error: "Faltan datos: userId, level, message" });
  }

  try {
    const { contract, gateway } = await getContract();
    await contract.submitTransaction("createAlert", userId, level, message);
    await gateway.disconnect();

    res.json({ message: "Alerta guardada en blockchain" });
  } catch (err) {
    console.error("Error guardando en blockchain:", err);
    res.status(500).json({ error: "Error en blockchain", details: err.message });
  }
});

app.get("/alerts/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const { contract, gateway } = await getContract();
    const result = await contract.evaluateTransaction("getAlertsByUser", userId);
    await gateway.disconnect();

    res.json(JSON.parse(result.toString()));
  } catch (err) {
    console.error("Error consultando alertas:", err);
    res.status(500).json({ error: "Error consultando blockchain", details: err.message });
  }
});

app.listen(port, () => {
  console.log(`🚀 API Fabric corriendo en http://localhost:${port}`);
});
