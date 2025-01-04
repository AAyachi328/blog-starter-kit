import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export async function enableNotifications() {
  const cookieStore = await cookies();
  cookieStore.set(NOTIFICATION_COOKIE, 'true', {
    maxAge: 365 * 24 * 60 * 60, // 1 an
    path: '/',
  });
}

export async function disableNotifications() {
  const cookieStore = await cookies();
  cookieStore.delete(NOTIFICATION_COOKIE);
}

export async function areNotificationsEnabled() {
  const cookieStore = await cookies();
  return cookieStore.get(NOTIFICATION_COOKIE)?.value === 'true';
} 