import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { getServerSubscriptions, removeServerSubscription } from '@/lib/server-subscriptions';
import { getAllPosts } from '@/lib/api';

interface WebPushError extends Error {
  statusCode?: number;
}

if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.error('VAPID keys must be set');
  process.exit(1);
}

webpush.setVapidDetails(
  'mailto:contact@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export async function GET() {
  try {
    // Récupérer les articles du jour
    const posts = getAllPosts();
    const today = new Date();
    const todayPosts = posts.filter(post => {
      const postDate = new Date(post.date);
      return postDate.toDateString() === today.toDateString();
    });

    if (todayPosts.length === 0) {
      return NextResponse.json({ message: 'No posts today' });
    }

    // Envoyer les notifications
    const subscriptions = getServerSubscriptions();
    const notificationPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: 'Résumé Tennis News',
            body: `${todayPosts.length} article${todayPosts.length > 1 ? 's' : ''} publié${todayPosts.length > 1 ? 's' : ''} aujourd'hui !`,
            icon: '/favicon/favicon-32x32.png',
            badge: '/favicon/favicon-32x32.png',
            data: {
              url: '/'
            }
          })
        );
      } catch (error) {
        console.error('Error sending notification:', error);
        if ((error as WebPushError).statusCode === 410) {
          removeServerSubscription(subscription.endpoint);
        }
      }
    });

    await Promise.all(notificationPromises);

    return NextResponse.json({
      message: 'Daily notifications sent successfully',
      postsCount: todayPosts.length
    });
  } catch (error) {
    console.error('Error sending daily notifications:', error);
    return NextResponse.json(
      { error: 'Failed to send daily notifications' },
      { status: 500 }
    );
  }
} 