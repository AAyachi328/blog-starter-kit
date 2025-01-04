// Stockage temporaire des souscriptions (à remplacer par une base de données en production)
let subscriptions: PushSubscription[] = [];

export function addSubscription(subscription: PushSubscription) {
  // Éviter les doublons
  const exists = subscriptions.some(
    sub => sub.endpoint === subscription.endpoint
  );
  if (!exists) {
    subscriptions.push(subscription);
  }
}

export function getSubscriptions(): PushSubscription[] {
  return subscriptions;
}

export function removeSubscription(endpoint: string) {
  subscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
} 