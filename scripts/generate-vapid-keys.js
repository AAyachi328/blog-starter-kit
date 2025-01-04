const webpush = require('web-push');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('Clés VAPID générées :');
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
console.log('\nAjoutez ces lignes à votre fichier .env.local :');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`); 