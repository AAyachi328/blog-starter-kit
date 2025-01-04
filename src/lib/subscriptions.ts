// Stockage des souscriptions dans le localStorage
const STORAGE_KEY = 'push_subscriptions';

// Obtenir toutes les souscriptions
export function getSubscriptions(): PushSubscription[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading subscriptions:', error);
    return [];
  }
}

// Ajouter une nouvelle souscription
export function addSubscription(subscription: PushSubscription) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const subscriptions = getSubscriptions();
    const exists = subscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );
    if (!exists) {
      subscriptions.push(subscription);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
  }
}

// Supprimer une souscription
export function removeSubscription(endpoint: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const subscriptions = getSubscriptions();
    const filteredSubscriptions = subscriptions.filter(sub => sub.endpoint !== endpoint);
    if (filteredSubscriptions.length !== subscriptions.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSubscriptions));
    }
  } catch (error) {
    console.error('Error removing subscription:', error);
  }
} 