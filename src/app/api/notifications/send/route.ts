import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getSubscriptions, removeSubscription } from '@/lib/subscriptions';

interface WebPushError extends Error {
  statusCode?: number;
}

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

if (!publicKey || !privateKey) {
  throw new Error('VAPID keys must be set');
}

webpush.setVapidDetails(
  'mailto:e30m52@gmail.com',
  publicKey,
  privateKey
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