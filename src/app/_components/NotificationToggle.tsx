'use client';

import { useState, useEffect } from 'react';
import { BellIcon, BellSlashIcon } from '@heroicons/react/24/outline';
import Cookies from 'js-cookie';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export default function NotificationToggle() {
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const enabled = Cookies.get(NOTIFICATION_COOKIE) === 'true';
    setIsEnabled(enabled);
  }, []);

  const toggleNotifications = () => {
    const newState = !isEnabled;
    if (newState) {
      Cookies.set(NOTIFICATION_COOKIE, 'true', { expires: 365 });
    } else {
      Cookies.remove(NOTIFICATION_COOKIE);
    }
    setIsEnabled(newState);
  };

  return (
    <button
      type="button"
      onClick={toggleNotifications}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
      aria-label={isEnabled ? 'Désactiver les notifications' : 'Activer les notifications'}
    >
      {isEnabled ? (
        <>
          <BellIcon className="w-5 h-5" />
          Notifications activées
        </>
      ) : (
        <>
          <BellSlashIcon className="w-5 h-5" />
          Notifications désactivées
        </>
      )}
    </button>
  );
} 