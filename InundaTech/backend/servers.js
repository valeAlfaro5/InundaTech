import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";

// Cargar variables de entorno desde .env
dotenv.config();

const app = express();
const port = 3000;

console.log("Iniciando backend...");

app.use(cors());
app.use(express.json()); 

// Array simulado de usuarios con email
const users = [
  { id: 1, email: "valeriasalfaro@gmail.com" },
  { id: 2, email: "valeriaalfaro@unitec.edu.com" }
  // {id: 3, email: "fabriziojramos20@unitec.edu"}
];

console.log("EMAIL_USER:", process.env.EMAIL_USER ? "CARGADO" : "NO DEFINIDO");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "CARGADO" : "NO DEFINIDO");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // true para 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Endpoint para enviar alerta
app.post("/sendAlert", async (req, res) => {
  const { title, message } = req.body || {}; 

  if (!title || !message) {
    console.log("Faltan datos de la alerta:", req.body);
    return res.status(400).json({ message: "Faltan datos de la alerta" });
  }

  console.log(`Enviando alerta: ${title} - ${message}`);

  try {
    const sendPromises = users.map(user => {
      return transporter.sendMail({
        from: `"InundaTech" <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: `Alerta de InundaTech: ${title}`,
        text: message,
      });
    });

    const results = await Promise.all(sendPromises);
    console.log("Alertas enviadas correctamente:", results);

    res.json({ message: "Alertas enviadas correctamente" });
  } catch (err) {
    console.error("Error enviando alertas:", err);
    res.status(500).json({ message: "Error enviando alertas", error: err });
  }
});

process.on("uncaughtException", (err) => {
  console.error("❌ Error no capturado:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Promesa rechazada:", reason);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor Nodemailer corriendo en http://localhost:${port}`);
});
