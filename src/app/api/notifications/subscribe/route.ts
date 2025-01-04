import { NextResponse } from 'next/server';
import { addSubscription } from '@/lib/subscriptions';

export async function POST(request: Request) {
  try {
    const subscription = await request.json();
    addSubscription(subscription);
    
    return NextResponse.json({ message: 'Subscription saved successfully' });
  } catch (error) {
    console.error('Error saving subscription:', error);
    return NextResponse.json(
      { error: 'Failed to save subscription' },
      { status: 500 }
    );
  }
} 