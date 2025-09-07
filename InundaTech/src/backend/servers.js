// backend/index.js
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import process from "process";
import dotenv from "dotenv";
import twilio from "twilio";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const alertsFile = path.join(process.cwd(), "alerts.json");

function readAlerts() {
  if (!fs.existsSync(alertsFile)) return [];
  const data = fs.readFileSync(alertsFile, "utf-8");
  return JSON.parse(data || "[]");
}

function saveAlert(alert) {
  const alerts = readAlerts();
  alerts.unshift(alert); 
  fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
}

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
const TWILIO_PHONE = process.env.TWILIO_PHONE;

const users = [
  { id: 1, email: "valeriasalfaro@gmail.com", phone: "+50497919841" },
  { id: 2, email: "valeriaalfaro@unitec.edu", phone: "+50494189011" },
  // { id: 3, email: "miguel.ardon@unitec.edu", phone: "" },
  // {id: 4, email: "jorgefpaz011@gmail.com", phone: ""}
];

app.post("/sendAlert", async (req, res) => {
  const { title, message, method, severity } = req.body;

  if (!title || !message || !method || !severity) {
    return res.status(400).json({ message: "Faltan datos (title, message, method, severity)" });
  }

  try {
    if (method === "email") {
      await Promise.all(users.map(user =>
        transporter.sendMail({
          from: `"InundaTech" <${process.env.EMAIL_USER}>`,
          to: user.email,
          subject: `Alerta: ${title}`,
          text: message
        })
      ));
    } else if (method === "sms") {
      await Promise.all(users.map(user =>
        client.messages.create({
          body: `⚠️ InundaTech - ${title}\n${message}`,
          from: TWILIO_PHONE,
          to: user.phone
        })
      ));
    }

    const alert = {
      id: Date.now().toString(),
      title,
      message,
      severity,
      method,
      recipients: users.length,
      timestamp: new Date().toISOString()
    };

    saveAlert(alert);

    res.json({ message: "Alerta enviada y guardada", alert });
  } catch (err) {
    console.error("Error enviando:", err);
    res.status(500).json({ message: "Error enviando alerta", error: err });
  }
});

app.get("/alerts", (req, res) => {
  const alerts = readAlerts();
  res.json(alerts);
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
