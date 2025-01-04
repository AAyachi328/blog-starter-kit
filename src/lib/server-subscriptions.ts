// Stockage temporaire des souscriptions côté serveur
let subscriptions: PushSubscription[] = [];

export function getServerSubscriptions(): PushSubscription[] {
  return subscriptions;
}

export function addServerSubscription(subscription: PushSubscription) {
  const exists = subscriptions.some(
    sub => sub.endpoint === subscription.endpoint
  );
  if (!exists) {
    subscriptions.push(subscription);
  }
}

export function removeServerSubscription(endpoint: string) {
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
} 