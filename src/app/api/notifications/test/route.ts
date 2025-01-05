import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const notificationsEnabled = cookieStore.get(NOTIFICATION_COOKIE)?.value === 'true';

    if (!notificationsEnabled) {
      return NextResponse.json({ 
        message: 'Notifications are disabled',
        status: 'disabled'
      });
    }

    // Simuler l'envoi d'une notification test
    return NextResponse.json({
      message: 'Test notification ready',
      status: 'enabled',
      notification: {
        title: 'Test de Notification',
        body: 'Ceci est une notification de test depuis Vercel',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
} 