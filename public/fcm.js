// FCM Push Notification Manager
class SabaiFCM {
    constructor() {
        this.messaging = null;
        this.currentToken = null;
        this.deviceId = this.getOrCreateDeviceId();
    }

    // Generate a stable device ID (persists across sessions)
    getOrCreateDeviceId() {
        let id = localStorage.getItem('saba_device_id');
        if (!id) {
            id = 'device_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
            localStorage.setItem('saba_device_id', id);
        }
        return id;
    }

    // Check if browser supports push notifications
    isSupported() {
        return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    }

    // Check current permission state
    getPermissionState() {
        if (!this.isSupported()) return 'unsupported';
        return Notification.permission; // 'default', 'granted', 'denied'
    }

    // Initialize FCM messaging
    async init() {
        if (!this.isSupported()) {
            console.warn('Push notifications not supported on this device');
            return false;
        }

        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
            log('Service worker registered:', registration.scope);

            // Initialize Firebase Messaging
            this.messaging = firebase.messaging();

            // Handle foreground messages (when app is visible)
            this.messaging.onMessage((payload) => {
                this.handleForegroundMessage(payload);
            });

            // If already granted, refresh token silently
            if (Notification.permission === 'granted') {
                await this.refreshToken();
            }

            return true;
        } catch (error) {
            console.error('FCM init error:', error);
            return false;
        }
    }

    // Request notification permission and get token (must be called from user action)
    async requestPermission() {
        if (!this.messaging) {
            await this.init();
        }

        try {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Notification permission denied');
                return false;
            }

            await this.refreshToken();
            return true;
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    }

    // Get/refresh FCM token and save to Firestore
    async refreshToken() {
        try {
            // VAPID key — you need to generate this from Firebase Console
            // Project Settings > Cloud Messaging > Web Push certificates > Generate key pair
            const vapidKey = window.FCM_VAPID_KEY || null;

            const token = await this.messaging.getToken({
                vapidKey: vapidKey,
                serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
            });

            if (token) {
                this.currentToken = token;
                await this.saveTokenToFirestore(token);
                log('FCM token refreshed');
                return token;
            } else {
                console.warn('No FCM token available');
                return null;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }

    // Save device token to Firestore — use token hash as doc ID to prevent duplicates
    async saveTokenToFirestore(token) {
        try {
            // Hash token to create a stable, short doc ID
            const docId = await this.hashToken(token);

            // Delete old device doc if it had a different token
            if (this._lastDocId && this._lastDocId !== docId) {
                await db.collection('admin_devices').doc(this._lastDocId).delete().catch(() => {});
            }
            this._lastDocId = docId;

            await db.collection('admin_devices').doc(docId).set({
                token: token,
                platform: this.detectPlatform(),
                lastActive: firebase.firestore.Timestamp.now(),
                createdAt: firebase.firestore.Timestamp.now()
            }, { merge: true });
        } catch (error) {
            console.error('Error saving token:', error);
        }
    }

    // Hash token string to short ID
    async hashToken(token) {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Remove token (unsubscribe)
    async removeToken() {
        try {
            if (this.currentToken) {
                const docId = await this.hashToken(this.currentToken);
                await db.collection('admin_devices').doc(docId).delete();
            }
            if (this.messaging) {
                await this.messaging.deleteToken();
            }
            this.currentToken = null;
        } catch (error) {
            console.error('Error removing token:', error);
        }
    }

    // Handle foreground messages — show in-app toast only
    handleForegroundMessage(payload) {
        const data = payload.data || {};
        const title = data.title || 'Saba-i';
        const body = data.body || '';

        this.showToast(title, body);
    }

    // Simple toast notification for in-app display
    showToast(title, body) {
        // Remove existing toast
        const existing = document.getElementById('fcm-toast');
        if (existing) existing.remove();

        // Pick accent color from title prefix
        const accent =
            title.startsWith('🆕') ? '#16a34a' :
            title.startsWith('✏️') ? '#f59e0b' :
            title.startsWith('🗑️') ? '#ef4444' :
            title.startsWith('📊') ? '#6366f1' :
            title.startsWith('⚠️') ? '#dc2626' :
            '#4c9fff';

        const toast = document.createElement('div');
        toast.id = 'fcm-toast';
        toast.style.cssText = `
            position: fixed; top: 16px; right: 16px; z-index: 10000;
            background: white; border-radius: 12px; padding: 14px 18px;
            box-shadow: 0 8px 30px rgba(0,0,0,0.15); border-left: 4px solid ${accent};
            max-width: 360px; animation: slideIn 0.3s ease;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight:600; font-size:14px; color:#1d1d1f; margin-bottom:6px;';
        titleEl.textContent = title;

        const bodyEl = document.createElement('div');
        bodyEl.style.cssText = 'font-size:13px; color:#444; line-height:1.5; white-space:pre-line;';
        bodyEl.textContent = body;

        toast.appendChild(titleEl);
        toast.appendChild(bodyEl);

        // Add animation
        const style = document.createElement('style');
        style.textContent = '@keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }';
        toast.appendChild(style);

        document.body.appendChild(toast);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    // Detect platform for device info
    detectPlatform() {
        const ua = navigator.userAgent;
        if (/iPad/.test(ua)) return 'ipad';
        if (/iPhone/.test(ua)) return 'iphone';
        if (/Android/.test(ua)) return 'android';
        return 'web';
    }

    // Update notification bell button state
    updateBellButton() {
        const bell = document.getElementById('notifyBtn');
        if (!bell) return;

        const state = this.getPermissionState();
        if (state === 'granted' && this.currentToken) {
            bell.textContent = '🔔';
            bell.title = 'การแจ้งเตือนเปิดอยู่';
            bell.classList.add('active');
        } else if (state === 'denied') {
            bell.textContent = '🔕';
            bell.title = 'การแจ้งเตือนถูกบล็อก — เปิดในการตั้งค่า';
            bell.classList.add('denied');
        } else {
            bell.textContent = '🔔';
            bell.title = 'เปิดการแจ้งเตือน';
            bell.classList.remove('active', 'denied');
        }
    }
}

// Export
window.SabaiFCM = SabaiFCM;
