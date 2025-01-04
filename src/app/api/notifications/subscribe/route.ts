import { NextResponse } from 'next/server';
import { addServerSubscription } from '@/lib/server-subscriptions';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    addServerSubscription(subscription);
    return NextResponse.json({ message: 'Subscription added successfully' });
  } catch (error) {
    console.error('Error adding subscription:', error);
    return NextResponse.json(
      { error: 'Failed to add subscription' },
      { status: 500 }
    );
  }
} 