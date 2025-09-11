import { Gateway, Wallets } from "fabric-network";
import fs from "fs";
import path from "path";

export async function connectToFabric() {
    try {
        const ccpPath = path.resolve(__dirname, 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, "utf8"));

        const walletPath = path.join(__dirname, "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get("admin");
        if (!identity) {
            throw new Error("No se encontró la identidad 'admin' en el wallet");
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "admin",
            discovery: { enabled: true, asLocalhost: true }
        });

        return gateway;
    } catch (err) {
        console.error("Error conectando a Fabric:", err);
        throw err;
    }
}
