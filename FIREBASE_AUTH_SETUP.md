# 🔐 Firebase Authentication Setup Guide

## ❌ Error: `auth/configuration-not-found`

นี่คือข้อผิดพลาดที่เกิดจาก Firebase Authentication ยังไม่ได้ตั้งค่าครบถ้วนใน Firebase Console

## ✅ วิธีแก้ไข (Step-by-Step)

### 1. เข้า Firebase Console
1. ไปที่ https://console.firebase.google.com
2. เลือกโปรเจ็กต์ **"saba-i"**

### 2. ตั้งค่า Authentication Providers

#### 📧 **Email/Password Authentication**
1. ไปที่ **Authentication** > **Sign-in method**
2. คลิก **Email/Password**
3. เปิดใช้งาน **Enable**
4. คลิก **Save**

#### 🔍 **Google Authentication**  
1. ยังคงอยู่ใน **Sign-in method**
2. คลิก **Google**
3. เปิดใช้งาน **Enable**
4. ใส่ **Support email** (อีเมลของคุณ)
5. คลิก **Save**

#### 📱 **Phone Authentication**
1. ยังคงอยู่ใน **Sign-in method**
2. คลิก **Phone**
3. เปิดใช้งาน **Enable**
4. **เพิ่มโดเมน** ในส่วน **Authorized domains**:
   - `localhost` (สำหรับ development)
   - โดเมนจริงของคุณ (สำหรับ production)
5. คลิก **Save**

### 3. ตั้งค่า reCAPTCHA (สำหรับ Phone Auth)

#### **เพิ่ม reCAPTCHA v2 Site Key**
1. ไปที่ **Authentication** > **Settings** > **App Check**
2. หรือไปที่ **Project Settings** > **App Check**
3. ตั้งค่า **reCAPTCHA Enterprise** หรือใช้ **reCAPTCHA v2**

#### **Alternative: ใช้ Test Phone Numbers**
หากต้องการทดสอบโดยไม่ต้องใช้ reCAPTCHA:
1. ไปที่ **Authentication** > **Settings** > **Phone**
2. เพิ่ม **Test phone numbers**:
   - เบอร์ทดสอบ: `+66123456789`
   - รหัส OTP: `123456`

### 4. ตั้งค่า Authorized Domains
1. ไปที่ **Authentication** > **Settings** > **Authorized domains**
2. เพิ่มโดเมนที่อนุญาต:
   - `localhost` 
   - `127.0.0.1`
   - `sabai-massage.web.app` (หากใช้ Firebase Hosting)

### 5. ตรวจสอบ Firestore Security Rules
1. ไปที่ **Firestore Database** > **Rules**
2. ใช้ Rules นี้สำหรับ Development:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตการอ่านสำหรับทุกคน
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // จัดการข้อมูลผู้ใช้
    match /users/{userId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🧪 ทดสอบการตั้งค่า

### Test Email Login
```javascript
// ลองสร้างบัญชีใหม่ด้วย email
email: test@example.com
password: Test123456
```

### Test Google Login  
```javascript
// คลิกปุ่ม "เข้าสู่ระบบด้วย Google"
// ควรเปิด Google OAuth popup
```

### Test Phone Login
```javascript
// ใส่เบอร์โทรศัพท์ในรูปแบบ: +66812345678
// หรือใช้เบอร์ทดสอบ: +66123456789 (OTP: 123456)
```

## 🚨 หากยังเจอ Error

### ตรวจสอบ Environment Variables
```bash
# ใน .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=saba-i.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=saba-i
# ... etc
```

### รีสตาร์ท Development Server
```bash
# หยุด server (Ctrl+C)
npm run dev
```

### Clear Browser Cache
- เปิด DevTools (F12)
- Right-click refresh button → Empty Cache and Hard Reload

## 📞 Support

หากยังเจอปัญหา ให้ตรวจสอบ:
1. ✅ Email/Password enabled
2. ✅ Google enabled  
3. ✅ Phone enabled (+ domains)
4. ✅ Firestore rules updated
5. ✅ Environment variables correct
6. ✅ Server restarted

---

*หลังจากตั้งค่าครบแล้ว ระบบ Authentication จะใช้งานได้ปกติ* 🎉
