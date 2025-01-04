self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/favicon/favicon.ico',
    badge: '/favicon/favicon.ico'
  };

  event.waitUntil(
    self.registration.showNotification('Nouvel Article Tennis', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
}); 