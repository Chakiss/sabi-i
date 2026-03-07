# สบาย Saba-i Booking Board

A lightweight massage therapy booking system optimized for iPad devices and slow networks.

## Features

- 📱 **iPad Optimized**: Touch-friendly interface designed for old iPad devices
- ⚡ **Fast Loading**: Minimal JavaScript, optimized for slow networks
- 📅 **Daily Calendar View**: Easy therapist availability visualization
- 🔄 **Real-time Updates**: Firebase Firestore integration
- ✨ **Simple Booking**: Quick 30-minute time slot booking system

## System Requirements

- iPad with Safari browser (iOS 12+)
- Internet connection for Firebase sync
- Firebase project with Firestore enabled

## Quick Start

### 1. Firebase Setup

1. Create a new Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Firestore Database
3. Enable Firebase Hosting
4. Copy your Firebase configuration

### 2. Configuration

1. Open `public/config.js`
2. Replace the placeholder values with your Firebase configuration:

```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 3. Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 4. Initialize and Deploy

```bash
# Initialize Firebase in your project directory
firebase init

# Select:
# - Firestore (configure Firestore rules)
# - Hosting (configure static hosting)

# Deploy your project
firebase deploy
```

### 5. Create Sample Data

After deployment, visit your hosted app and use the browser console to create sample therapists:

```javascript
// Create sample therapists
const therapists = [
    { name: 'May', status: 'active', displayOrder: 1 },
    { name: 'Ann', status: 'active', displayOrder: 2 },
    { name: 'Bee', status: 'active', displayOrder: 3 },
    { name: 'Fon', status: 'active', displayOrder: 4 }
];

therapists.forEach(async (therapist) => {
    await db.collection('therapists').add({
        ...therapist,
        createdAt: firebase.firestore.Timestamp.now()
    });
});
```

## File Structure

```
├── public/
│   ├── index.html          # Main application HTML
│   ├── styles.css          # iPad-optimized CSS
│   ├── config.js           # Firebase configuration
│   └── app.js              # Main application logic
├── firebase.json           # Firebase hosting configuration
├── firestore.rules         # Firestore security rules
└── README.md              # This file
```

## Usage Guide

### Daily Operations

1. **View Availability**: The calendar shows all therapists and their availability for the current day
2. **Create Booking**: Tap any empty (white) slot to create a new booking
3. **Edit Booking**: Tap any booked (blue) slot to edit or delete the booking
4. **Navigate Dates**: Use the arrow buttons to move between dates

### Booking Process

1. Tap an empty time slot
2. Select therapist (if different from the column)
3. Choose start time
4. Select duration (30, 60, 90, or 120 minutes)
5. Add optional notes
6. Tap "บันทึก" (Save) to confirm

### Time Slots

- **Shop Hours**: 10:00 AM - 10:00 PM
- **Slot Duration**: 30-minute intervals
- **Booking Duration**: 30, 60, 90, or 120 minutes

## Data Model

### Therapists Collection
```javascript
{
  name: string,           // "May"
  status: "active",       // "active" | "inactive"
  displayOrder: number,   // 1, 2, 3...
  createdAt: timestamp
}
```

### Bookings Collection
```javascript
{
  therapistId: string,    // Reference to therapist
  startTime: timestamp,   // Start time of booking
  endTime: timestamp,     // End time of booking
  dateKey: string,        // "2026-03-07" for efficient querying
  note: string,           // Optional note
  createdAt: timestamp
}
```

## Performance Optimization

- **Bundle Size**: < 150KB JavaScript
- **Touch Targets**: Minimum 44px for iPad compatibility
- **Grid Rendering**: Limited to 10 therapists × 24 hours maximuum
- **Real-time Sync**: Only subscribes to current day's bookings

## Security Notes

⚠️ **Important**: The current security rules allow open read/write access for MVP development. 

For production deployment:
1. Implement Firebase Authentication
2. Update `firestore.rules` with proper access controls
3. Add user role management (admin, receptionist)

## Browser Support

- ✅ Safari on iPad (iOS 12+)
- ✅ Chrome on iPad
- ✅ Modern mobile browsers
- ⚠️ Optimized for touch interfaces

## Troubleshooting

### Common Issues

1. **Bookings not loading**
   - Check Firebase configuration in `config.js`
   - Verify Firestore rules allow read access
   - Check browser console for errors

2. **Cannot create bookings**
   - Verify Firestore rules allow write access
   - Check if therapists collection exists and has active therapists
   - Ensure internet connectivity

3. **Touch interactions not working**
   - Ensure you're using a touch device or mobile browser
   - Try refreshing the page
   - Check for JavaScript errors in console

### Firebase Console Checks

1. **Firestore Database**: Verify collections `therapists` and `bookings` exist
2. **Hosting**: Check that the site is deployed and accessible
3. **Usage**: Monitor read/write quotas

## Future Enhancements

### Phase 2
- Customer information storage
- Service type selection
- Booking source tracking

### Phase 3
- Online customer booking portal
- LINE messenger integration
- Payment processing
- SMS/Email notifications

## Development

### Local Development

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Serve locally
firebase serve --only hosting

# Open in browser
open http://localhost:5000
```

### Testing on iPad

1. Deploy to Firebase Hosting
2. Access via iPad Safari
3. Add to home screen for app-like experience
4. Test touch interactions and scrolling

## Support

For technical issues or feature requests, please check the troubleshooting section above or contact your development team.

---

**Saba-i Booking Board** - Simple, fast, and reliable therapist scheduling for massage shops.