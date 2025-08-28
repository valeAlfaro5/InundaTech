// import express from "express";
// import webPush from "web-push";
// import dotenv from "dotenv";

// dotenv.config();
// const app = express();
// app.use(express.json());

// const vapidKeys = {
//   publicKey: process.env.VAPID_PUBLIC_KEY,
//   privateKey: process.env.VAPID_PRIVATE_KEY,
// };

// webPush.setVapidDetails(
//   "mailto:valeriasalfaro@gmail.com",
//   vapidKeys.publicKey,
//   vapidKeys.privateKey
// );

// let subscriptions = [];

// app.post("/subscribe", (req, res) => {
//   const subscription = req.body;
//   subscriptions.push(subscription);
//   console.log("Suscripción registrada:", subscription);
//   res.status(201).json({ message: "Suscripción registrada" });
// });

// app.post("/sendNotification", async (req, res) => {
//   const { title, body, severity } = req.body;
//   const payload = JSON.stringify({ title, body, severity });

//   const promises = subscriptions.map((sub) =>
//     webPush.sendNotification(sub, payload).catch(console.error)
//   );

//   await Promise.all(promises);
//   res.json({ success: true });
// });

// app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));


import fs from "fs";
import path from "path";

import express from "express";
import admin from "firebase-admin";

const serviceAccount = JSON.parse(
  fs.readFileSync(path.resolve("./inundatech-firebase-adminsdk-fbsvc-da9ac9118a.json"), "utf-8")
);


const app = express();
const port = 3000;

const tokenArray =[];

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
     
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, PATCH, DELETE, GET");
        return res.status(200).json({});
    }
    next();
});

app.get("/", (req, res) => {
    if(!tokenArray.length){
        return res.status(400).json({
            message: "No hay tokens registrados"
        });
    }

    const message = {
        notification: {
            title: "Alerta de Inundación",
            body: "Se ha detectado una posible inundación en tu área. Por favor, toma precauciones.",
            sound: "default",
            badge: "1"
        },
        token : tokenArray[0],
    };
    admin.messaging().send(message)
    .then((response) => {
        console.log("Mensaje enviado exitosamente:", response);
        return res.status(200).json({
            message: "Notificación enviada exitosamente",
            response
        });
    })
    .catch((error) => {
        console.log("Error al enviar el mensaje:", error);
        return res.status(500).json({
            message: "Error al enviar la notificación",
            error
        });
    }); 
});

app.post("/subscribe", (req, res) => { 

    //access the token from the request body
    const token = req.body.token;

    //check token
    if(!token){
        return res.status(400).json({
            message: "Token inválido"
        });
    }
    tokenArray.push(token);
    
    console.log(tokenArray);
    return res.status(201).json({
        message: "Token registrado exitosamente"
    });
});

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.status || 500;
    const message = error.message || "Ocurrió un error en el servidor";
    res.status(status).json({
        message
    });
}); 

app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});