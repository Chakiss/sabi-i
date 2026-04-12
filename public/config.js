// Firebase Configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyB7XaKhKvofk3oTCIE4zBKCStgixCrvANI",
    authDomain: "saba-i.firebaseapp.com", 
    projectId: "saba-i",
    storageBucket: "saba-i.firebasestorage.app",
    messagingSenderId: "971855188313",
    appId: "1:971855188313:web:5b39b48fd55fcdd4effc48"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firestore with offline persistence for fast loads on slow networks
const db = firebase.firestore();
db.settings({ cache: { kind: 'persistent', tabManager: { kind: 'persistentMultipleTab' } } });

// Debug mode - set to true to enable console logging
const DEBUG = false;
const log = DEBUG ? console.log.bind(console) : () => {};
window.DEBUG = DEBUG;
window.log = log;

// Configuration Constants
const CONFIG = {
    // Shop Hours (24-hour format)
    SHOP_START_HOUR: 10,
    SHOP_END_HOUR: 22, // เปลี่ยนกลับเป็น 22
    
    // Time slot duration in minutes
    SLOT_DURATION: 30,
    
    // Duration options for bookings (in minutes)
    DURATION_OPTIONS: [30, 60, 90, 120, 150, 180],
    
    // Maximum therapists to display
    MAX_THERAPISTS: 10,
    
    // Date format for Firestore
    DATE_FORMAT: 'YYYY-MM-DD'
};

// FCM Web Push VAPID Key (from Firebase Console > Cloud Messaging > Web Push certificates)
window.FCM_VAPID_KEY = 'BBAX1Uu6K0v92kP1D_Y0yV2lkmCh8U41jHODanYahf3eceEyvbFYUr3BEUIay7UcjSL93tw3rYXTahKbC9l3Fhg';

// Export for use in other files
window.CONFIG = CONFIG;
window.db = db;