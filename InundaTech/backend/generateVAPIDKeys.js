import webPush from 'web-push';

const vapidKeys = webPush.generateVAPIDKeys();

console.log('Clave pública:', vapidKeys.publicKey);
console.log('Clave privada:', vapidKeys.privateKey);
