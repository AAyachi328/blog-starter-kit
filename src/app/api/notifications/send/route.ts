import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { title, body } = data;

    // Pour les tests, on simule toujours l'envoi d'une notification
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