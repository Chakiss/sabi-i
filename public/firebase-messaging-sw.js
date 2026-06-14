// Firebase Messaging Service Worker — handles background push notifications
// v2026-04-26
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Force new SW to activate immediately (skip waiting for old tabs to close)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Claim all open tabs so they use the new SW right away
self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

firebase.initializeApp({
    apiKey: "AIzaSyB7XaKhKvofk3oTCIE4zBKCStgixCrvANI",
    authDomain: "saba-i.firebaseapp.com",
    projectId: "saba-i",
    storageBucket: "saba-i.firebasestorage.app",
    messagingSenderId: "971855188313",
    appId: "1:971855188313:web:5b39b48fd55fcdd4effc48"
});

const messaging = firebase.messaging();

// Handle background messages (data-only — we control display)
messaging.onBackgroundMessage((payload) => {
    const data = payload.data || {};
    const title = data.title || 'Saba-i Booking';
    const options = {
        body: data.body || '',
        icon: data.icon || '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || 'saba-i-notification',
        data: { url: data.click_action || '/index.html' }
    };

    return self.registration.showNotification(title, options);
});

// Handle notification click — open/focus the app
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const url = event.notification.data?.url || '/index.html';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // If app is already open, focus it
            for (const client of windowClients) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise open a new window
            return clients.openWindow(url);
        })
    );
});
