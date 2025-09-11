// src/firebaseClient.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// Lee variables de entorno de Vite
const ENV = import.meta.env;

// Lista de requeridos (mínimos para RTDB)
const REQUIRED = [
  "VITE_FB_API_KEY",
  "VITE_FB_AUTH_DOMAIN",
  "VITE_FB_DB_URL",
  "VITE_FB_PROJECT_ID",
  "VITE_FB_APP_ID",
];

// Valida que existan
const missing = REQUIRED.filter((k) => !ENV[k] || String(ENV[k]).trim() === "");
if (missing.length) {
  // Mensaje claro en consola
  console.error(
    `[Firebase] Faltan variables en .env: ${missing.join(
      ", "
    )}. Revisa tu archivo .env y reinicia el servidor de Vite.`
  );
  // Lanza un error para que no siga con config incompleta
  throw new Error(
    `Config Firebase incompleta. Faltan: ${missing.join(", ")}`
  );
}

const firebaseConfig = {
  apiKey: ENV.VITE_FB_API_KEY,
  authDomain: ENV.VITE_FB_AUTH_DOMAIN,
  databaseURL: ENV.VITE_FB_DB_URL,                 // <- necesario para RTDB
  projectId: ENV.VITE_FB_PROJECT_ID,
  storageBucket: ENV.VITE_FB_STORAGE_BUCKET || undefined,
  appId: ENV.VITE_FB_APP_ID,
  // opcionales:
  // messagingSenderId: ENV.VITE_FB_MESSAGING_SENDER_ID,
  // measurementId: ENV.VITE_FB_MEASUREMENT_ID,
};

// Evita re-inicializar
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Pasa el URL explícitamente por si options no llega:
const db = getDatabase(app, ENV.VITE_FB_DB_URL);

export { app, db };
