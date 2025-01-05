'use client';

import { useEffect } from 'react';
import Cookies from 'js-cookie';

const NOTIFICATION_COOKIE = 'notifications_enabled';
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export default function DailyNotifications() {
  useEffect(() => {
    const checkDailyNotifications = async () => {
      // Vérifier si les notifications sont activées dans les cookies
      const notificationsEnabled = Cookies.get(NOTIFICATION_COOKIE) === 'true';
      if (!notificationsEnabled) return;

      // Vérifier si le navigateur supporte les notifications
      if (typeof window === 'undefined' || !('Notification' in window)) return;

      // Demander la permission si nécessaire
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }

      try {
        const response = await fetch('/api/notifications/daily');
        const data = await response.json();

        if (data.notification && Notification.permission === 'granted') {
          new Notification(data.notification.title, {
            body: data.notification.body,
            icon: '/favicon/favicon-32x32.png'
          });
        }
      } catch (error) {
        console.error('Error checking daily notifications:', error);
      }
    };

    if (IS_DEVELOPMENT) {
      console.log('Mode développement : vérification toutes les 30 secondes');
      const interval = setInterval(checkDailyNotifications, 30000);
      return () => clearInterval(interval);
    }

    // En production, vérifier à 22h10
    const now = new Date();
    const targetHour = 21;
    const targetMinute = 40;

    // Calculer le délai jusqu'à la prochaine vérification
    const msUntilTarget = new Date().setHours(targetHour, targetMinute, 0, 0) - now.getTime();
    const msUntilNextCheck = msUntilTarget > 0 ? msUntilTarget : msUntilTarget + 24 * 60 * 60 * 1000;

    // Planifier la première vérification
    const timeout = setTimeout(checkDailyNotifications, msUntilNextCheck);
    return () => clearTimeout(timeout);
  }, []);

  // Ce composant ne rend rien visuellement
  return null;
} 
