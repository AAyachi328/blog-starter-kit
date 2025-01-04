import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export function enableNotifications() {
  const cookieStore = cookies();
  cookieStore.set(NOTIFICATION_COOKIE, 'true', {
    maxAge: 365 * 24 * 60 * 60, // 1 an
    path: '/',
  });
}

export function disableNotifications() {
  const cookieStore = cookies();
  cookieStore.delete(NOTIFICATION_COOKIE);
}

export function areNotificationsEnabled() {
  const cookieStore = cookies();
  return cookieStore.get(NOTIFICATION_COOKIE)?.value === 'true';
} 