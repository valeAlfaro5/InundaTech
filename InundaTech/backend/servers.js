import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";
import twilio from "twilio";  // 👈 importar twilio

// Cargar variables de entorno desde .env
dotenv.config();

const app = express();
const port = 3000;

console.log("Iniciando backend...");

app.use(cors());
app.use(express.json()); 

// Array simulado de usuarios con email y teléfono
const users = [
  { id: 1, email: "valeriasalfaro@gmail.com", phone: "+50497919841" },
  { id: 2, email: "valeriaalfaro@unitec.edu.com", phone: "+50494189011" }
];

console.log("EMAIL_USER:", process.env.EMAIL_USER ? "CARGADO" : "NO DEFINIDO");
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "CARGADO" : "NO DEFINIDO");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE = process.env.TWILIO_PHONE; // número de Twilio (ej: +123456789)

// Endpoint para enviar alerta (correo o SMS, según selección)
app.post("/sendAlert", async (req, res) => {
  const { title, message, method } = req.body || {}; 

  if (!title || !message || !method) {
    console.log("Faltan datos de la alerta:", req.body);
    return res.status(400).json({ message: "Faltan datos de la alerta (title, message, method)" });
  }

  console.log(`📩 Método: ${method} | Enviando alerta: ${title} - ${message}`);

  try {
    let results = [];

    if (method === "email") {
      // --- Enviar correos ---
      results = await Promise.all(users.map(user => {
        return transporter.sendMail({
          from: `"InundaTech" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `Alerta de InundaTech: ${title}`,
          text: message,
        });
      }));
    } 
    
    else if (method === "sms") {
      // --- Enviar SMS ---
      results = await Promise.all(users.map(user => {
        if (!user.phone) return null; // si no tiene teléfono, saltar
        return client.messages.create({
          body: `⚠️ InundaTech - ${title}\n${message}`,
          from: TWILIO_PHONE,
          to: user.phone
        });
      }).filter(Boolean));
    } 
    
    else {
      return res.status(400).json({ message: "Método inválido. Use 'email' o 'sms'." });
    }

    console.log("✅ Alertas enviadas correctamente:", results);
    res.json({ message: `Alertas enviadas correctamente vía ${method}` });

  } catch (err) {
    console.error("❌ Error enviando alertas:", err);
    res.status(500).json({ message: "Error enviando alertas", error: err });
  }
});

// Manejo de errores global
process.on("uncaughtException", (err) => {
  console.error("❌ Error no capturado:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("❌ Promesa rechazada:", reason);
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
