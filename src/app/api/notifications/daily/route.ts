import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/api';
import { cookies } from 'next/headers';

const NOTIFICATION_COOKIE = 'notifications_enabled';

export async function GET() {
  try {
    // Vérifier si les notifications sont activées
    const cookieStore = await cookies();
    const notificationsEnabled = cookieStore.get(NOTIFICATION_COOKIE)?.value === 'true';

    if (!notificationsEnabled) {
      return NextResponse.json({ message: 'Notifications are disabled' });
    }

    // Récupérer les articles du jour
    const allPosts = getAllPosts();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // Format YYYY-MM-DD
    
    const todaysPosts = allPosts.filter(post => {
      const postDate = new Date(post.date);
      const postDateStr = postDate.toISOString().split('T')[0];
      return postDateStr === todayStr;
    });

    console.log('Today:', todayStr);
    console.log('Posts found:', todaysPosts.length);
    for (const post of todaysPosts) {
      console.log('Post date:', new Date(post.date).toISOString());
    }

    if (todaysPosts.length === 0) {
      return NextResponse.json({ message: 'No posts today' });
    }

    // Retourner le résultat pour le client
    return NextResponse.json({ 
      message: 'Daily notifications ready',
      postsCount: todaysPosts.length,
      notification: {
        title: `Résumé Tennis du ${today.toLocaleDateString('fr-FR')}`,
        body: `${todaysPosts.length} nouveaux articles aujourd'hui. Cliquez pour les lire !`
      }
    });
  } catch (error) {
    console.error('Error preparing daily notifications:', error);
    return NextResponse.json(
      { error: 'Failed to prepare daily notifications' },
      { status: 500 }
    );
  }
} 