import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const notificationsEnabled = cookieStore.get(NOTIFICATION_COOKIE)?.value === 'true';

    if (!notificationsEnabled) {
      return NextResponse.json({ 
        message: 'Notifications are disabled',
        status: 'disabled'
      });
    }

    const data = await request.json();
    const { title, body } = data;

    // Ici, nous simulons l'envoi d'une notification au navigateur
    // Dans un cas réel, nous utiliserions un service de notification comme Firebase Cloud Messaging
    return NextResponse.json({
      message: 'Notification sent successfully',
      status: 'success',
      notification: {
        title,
        body,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error sending notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
} 