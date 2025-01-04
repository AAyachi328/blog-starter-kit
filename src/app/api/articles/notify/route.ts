import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSubscriptions, removeSubscription } from '@/lib/subscriptions';

interface WebPushError extends Error {
  statusCode?: number;
}

export async function POST(request: Request) {
  try {
    const { title, excerpt } = await request.json();
    const subscriptions = getSubscriptions();
    
    // Préparer le message de notification
    const notificationPayload = JSON.stringify({
      title: `Nouvel Article : ${title}`,
      body: excerpt || 'Un nouvel article vient d\'être publié !',
    });

    // Envoyer la notification à tous les abonnés
    const notifications = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(subscription, notificationPayload);
      } catch (error) {
        console.error('Error sending notification:', error);
        if ((error as WebPushError).statusCode === 410) {
          removeSubscription(subscription.endpoint);
        }
      }
    });

    await Promise.all(notifications);
    
    return NextResponse.json({ message: 'Notifications sent successfully' });
  } catch (error) {
    console.error('Error sending notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send notifications' },
      { status: 500 }
    );
  }
} 