'use client';

import { useState, useEffect } from 'react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';

export default function NotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          setRegistration(reg);
          reg.pushManager.getSubscription()
            .then(sub => {
              setIsSubscribed(!!sub);
              if (!sub && Notification.permission === 'default') {
                setShowAlert(true);
              }
            });
        });
    }
  }, []);

  const subscribeToNotifications = async () => {
    try {
      if (!registration) return;

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.log('Permission not granted');
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      });

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
      setShowAlert(false);
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
    <>
      {showAlert && (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 border border-blue-100 dark:border-slate-700 animate-fade-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <BellIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                Restez informé !
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Activez les notifications pour ne manquer aucun nouvel article.
              </p>
              <div className="mt-4 flex space-x-3">
                <button
                  type="button"
                  onClick={subscribeToNotifications}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  Activer
                </button>
                <button
                  type="button"
                  onClick={() => setShowAlert(false)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-slate-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Plus tard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={isSubscribed ? undefined : subscribeToNotifications}
        className={`inline-flex items-center px-4 py-2 rounded-full transition-all duration-200 ${
          isSubscribed 
            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 cursor-default'
            : 'bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
        }`}
      >
        {isSubscribed ? (
          <>
            <BellIcon className="h-5 w-5 mr-2" />
            Notifications activées
          </>
        ) : (
          <>
            <BellSlashIcon className="h-5 w-5 mr-2" />
            Activer les notifications
          </>
        )}
      </button>
    </>
  );
} 