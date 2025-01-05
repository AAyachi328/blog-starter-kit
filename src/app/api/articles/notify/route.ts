import { NextResponse } from 'next/server';
import { getAllPosts } from '@/lib/api';

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
      return NextResponse.json({ 
        message: 'No new articles today',
        status: 'no_content'
      });
    }

    // Préparer la notification
    const notification = {
      title: `${todaysPosts.length} Nouveaux Articles Tennis`,
      body: todaysPosts.map(post => post.title).join(', '),
      timestamp: new Date().toISOString(),
      data: {
        url: '/',
        posts: todaysPosts.map(post => ({
          title: post.title,
          slug: post.slug
        }))
      }
    };

    // Envoyer la notification
    const response = await fetch('http://localhost:3000/api/notifications/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification)
    });

    const result = await response.json();
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error notifying about articles:', error);
    return NextResponse.json(
      { error: 'Failed to notify about articles' },
      { status: 500 }
    );
  }
} 