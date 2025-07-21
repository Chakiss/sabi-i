# 🚀 Deployment Guide - Saba-i Massage Management System

## ✅ Live Application
- **Website:** [https://saba-i.web.app](https://saba-i.web.app)
- **Firebase Console:** [https://console.firebase.google.com/project/saba-i/overview](https://console.firebase.google.com/project/saba-i/overview)

## 📁 Deployment Files
- `firebase.json` - Firebase hosting และ firestore configuration
- `.firebaserc` - Firebase project configuration (project: saba-i)
- `firestore.rules` - Firestore database security rules
- `firestore.indexes.json` - Firestore database indexes
- `next.config.mjs` - Next.js configuration สำหรับ static export

## 🛠️ Deploy Commands

### Build & Deploy ครั้งแรก:
```bash
# Build production
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Deploy ครั้งต่อไป:
```bash
# ใช้ npm script ที่เตรียมไว้
npm run deploy
```

### Deploy เฉพาะส่วนใดส่วนหนึ่ง:
```bash
# Deploy เฉพาะ hosting
firebase deploy --only hosting

# Deploy เฉพาะ firestore rules
firebase deploy --only firestore:rules

# Deploy ทั้งหมด
firebase deploy
```

## 📊 Build Information
- **Static Pages:** 8 pages (/, /booking, /therapists, /dashboard, etc.)
- **Bundle Size:** ~222KB First Load JS
- **Output Directory:** `out/`
- **Build Type:** Static Export (SSG)

## 🔧 Configuration Details

### Firebase Hosting (`firebase.json`):
```json
{
  "hosting": {
    "public": "out",
    "rewrites": [{"source": "**", "destination": "/index.html"}],
    "headers": [...cache configurations...]
  }
}
```

### Next.js Export (`next.config.mjs`):
```js
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true }
};
```

## 🛡️ Security Notes
- Firestore rules ตั้งค่าเป็น `allow read, write: if true` สำหรับการพัฒนา
- ⚠️ **Production:** ควรเพิ่ม Authentication และ proper security rules

## 🔄 Continuous Deployment
สามารถตั้งค่า GitHub Actions หรือ CI/CD pipeline เพื่อ auto-deploy เมื่อมีการ push code ใหม่

## 🆘 Troubleshooting
- หาก deploy failed: ตรวจสอบ Firebase CLI login status
- หาก build failed: ตรวจสอบ dependencies และ environment variables
- หาก app ไม่ work: ตรวจสอบ Firebase configuration และ environment variables

---
**Last Updated:** ${new Date().toLocaleString('th-TH')}
**Deployed By:** Firebase CLI
**Project:** saba-i
