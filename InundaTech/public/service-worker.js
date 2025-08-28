self.addEventListener("push", (event) => {
  const data = event.data ? JSON.parse(event.data.text()) : {};
  const title = data.title || "Nueva Alerta";
  const options = {
    body: data.body || "Tienes una nueva notificación",
    icon: "/icon-192x192.png",
    badge: "/badge-72x72.png",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
