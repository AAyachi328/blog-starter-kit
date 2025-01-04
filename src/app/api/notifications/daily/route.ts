import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/api';
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

export async function GET() {
  try {
    // Récupérer les articles du jour
    const allPosts = getAllPosts();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysPosts = allPosts.filter(post => {
      const postDate = new Date(post.date);
      postDate.setHours(0, 0, 0, 0);
      return postDate.getTime() === today.getTime();
    });

    if (todaysPosts.length === 0) {
      return NextResponse.json({ message: 'No posts today' });
    }

    // Préparer le message de notification
    const notificationPayload = JSON.stringify({
      title: `Résumé Tennis du ${today.toLocaleDateString('fr-FR')}`,
      body: `${todaysPosts.length} nouveaux articles aujourd'hui. Cliquez pour les lire !`
    });

    // Envoyer la notification à tous les abonnés
    const subscriptions = getSubscriptions();
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
    
    return NextResponse.json({ 
      message: 'Daily notifications sent successfully',
      postsCount: todaysPosts.length
    });
  } catch (error) {
    console.error('Error sending daily notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send daily notifications' },
      { status: 500 }
    );
  }
} 