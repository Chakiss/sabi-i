# 🔥 แก้ไข Firebase Security Rules

เจอ Error: `Missing or insufficient permissions` แสดงว่า Firestore Security Rules ยังไม่อนุญาตให้อ่าน/เขียนข้อมูล

## วิธีแก้ไข:

### 1. เข้า Firebase Console
- ไปที่ https://console.firebase.google.com
- เลือกโปรเจ็กต์ `saba-i`

### 2. ตั้งค่า Firestore Rules
1. ไปที่ **Firestore Database** > **Rules**
2. แทนที่ rules เดิมด้วยโค้ดนี้:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // อนุญาตให้อ่าน/เขียนข้อมูลทั้งหมด (สำหรับ Development)
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. กด **Publish**

### 3. รีเฟรชหน้าเว็บ
หลังจากตั้งค่าแล้ว รีเฟรชหน้าเว็บที่ http://localhost:3001

---

## 📋 สำหรับ Production

เมื่อต้องการใช้งานจริง ควรเพิ่ม Authentication:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /services/{serviceId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /therapists/{therapistId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    match /bookings/{bookingId} {
      allow read: if true;
      allow write: if true; // อนุญาตให้ลูกค้าจองได้
    }
    
    match /settings/{settingId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## ⚠️ หมายเหตุ
- กฎปัจจุบันอนุญาตทุกคนอ่าน/เขียนได้ (เหมาะสำหรับ Development เท่านั้น)
- สำหรับ Production ควรเพิ่มระบบ Authentication และจำกัดสิทธิ์
