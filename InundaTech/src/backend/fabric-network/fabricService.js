import { connectToFabric } from "./gateway.js";

export async function getAllAssets() {
    const gateway = await connectToFabric();
    try {
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("basic");

        const result = await contract.evaluateTransaction("GetAllAssets");
        return JSON.parse(result.toString());
    } finally {
        gateway.disconnect();
    }
}

export async function createAsset(asset) {
    const gateway = await connectToFabric();
    try {
        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("basic");

        await contract.submitTransaction(
            "CreateAsset",
            asset.ID,
            asset.Color,
            asset.Size,
            asset.Owner,
            asset.AppraisedValue
        );

        return { message: "Asset creado con éxito", asset };
    } finally {
        gateway.disconnect();
    }
}
