
import express from "express";
import { getContract } from "./gateway.js"; 

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({ error: "Faltan campos requeridos" });
    }

    const contract = await getContract();

    // Guardar usuario en la blockchain
    await contract.submitTransaction(
      "CreateUser", 
      email,         
      name,
      phone,
      password
    );

    res.json({ message: "Usuario registrado en blockchain con éxito" });
  } catch (error) {
    console.error("Error registrando usuario:", error);
    res.status(500).json({ error: "Error registrando usuario" });
  }
});

export default router;
