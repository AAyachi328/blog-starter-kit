'use client';

import { useState, useEffect } from 'react';

export default function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          setRegistration(reg);
          reg.pushManager.getSubscription()
            .then(sub => {
              setIsSubscribed(!!sub);
            });
        });
    }
  }, []);

  const subscribeToNotifications = async () => {
    try {
      if (!registration) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

      // Envoyer la souscription au backend
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!response.ok) {
        throw new Error('Failed to save subscription');
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error('Erreur lors de l\'inscription aux notifications:', error);
    }
  };

  if (!isClient) {
    return null;
  }

  if (!('Notification' in window)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={subscribeToNotifications}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      disabled={isSubscribed}
    >
      {isSubscribed ? 'Notifications activées' : 'Activer les notifications'}
    </button>
  );
} 