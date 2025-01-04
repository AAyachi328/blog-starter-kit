import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSubscriptions, removeSubscription } from '@/lib/subscriptions';

// Configuration de web-push avec les clés VAPID
webpush.setVapidDetails(
  'mailto:e30m52@gmail.com', // Remplacez par votre email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();
    const subscriptions = getSubscriptions();
    const notifications = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title,
            body,
          })
        );
      } catch (error) {
        console.error('Error sending notification:', error);
        // Si l'erreur indique que la souscription n'est plus valide, on la supprime
        if ((error as any).statusCode === 410) {
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