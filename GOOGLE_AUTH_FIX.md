# 🚨 แก้ไข Google Login Error: `auth/operation-not-allowed`

## ❌ **ปัญหา**
```
FirebaseError: Firebase: Error (auth/operation-not-allowed)
```

ข้อผิดพลาดนี้เกิดจาก **Google Sign-In ยังไม่ได้เปิดใช้งาน** ใน Firebase Console

## ✅ **วิธีแก้ไข (Step-by-Step)**

### 1. เข้า Firebase Console
1. ไปที่ **https://console.firebase.google.com**
2. เลือกโปรเจ็กต์ **"saba-i"**

### 2. เปิดใช้งาน Google Authentication
1. ไปที่ **Authentication** (ดูที่เมนูซ้าย)
2. คลิกแท็บ **Sign-in method**
3. ในส่วน **Sign-in providers** หา **Google**
4. คลิกที่ **Google**

### 3. กำหนดค่า Google OAuth
1. เปิดใช้งาน **Enable** (สลับ toggle ให้เป็นสีน้ำเงิน)
2. ในส่วน **Project support email**:
   - เลือกอีเมลของคุณจาก dropdown
   - หรือใส่อีเมลที่เป็น owner ของโปรเจ็กต์

### 4. บันทึกการตั้งค่า
1. คลิก **Save** (ปุ่มสีน้ำเงิน)
2. รอสักครู่ให้ Firebase ประมวลผล

### 5. ตรวจสอบการตั้งค่า
หลังจากบันทึกแล้ว คุณจะเห็น:
- ✅ **Google** มีสถานะ **Enabled**
- 📧 **Support email** แสดงอีเมลที่เลือก

## 🧪 **ทดสอบการแก้ไข**

### ขั้นตอนทดสอบ:
1. **รีเฟรชหน้าเว็บ** - F5 หรือ Cmd+R
2. **คลิก "เข้าสู่ระบบ"**
3. **คลิก "เข้าสู่ระบบด้วย Google"**
4. **ควรเปิด Google OAuth popup** ✅

### หากยังเจอปัญหา:
```bash
# Clear browser cache และ restart server
npm run dev
```

## 📸 **หน้าตา Firebase Console ที่ถูกต้อง**

ใน **Authentication > Sign-in method** คุณจะเห็น:

```
📧 Email/Password    ✅ Enabled
🔍 Google           ✅ Enabled    📧 your-email@gmail.com
📱 Phone            ⚠️ Not set up (optional)
```

## 🚀 **ขั้นตอนถัดไป**

หลังจากเปิดใช้งาน Google Authentication แล้ว:

1. ✅ **Email Login** - พร้อมใช้งาน
2. ✅ **Google Login** - พร้อมใช้งาน
3. ⚠️ **Phone Login** - ต้องตั้งค่าเพิ่มเติม (ดู FIREBASE_AUTH_SETUP.md)

## 💡 **หมายเหตุ**

- การเปิดใช้งาน Google Authentication **ฟรี** ไม่มีค่าใช้จ่าย
- Support email จำเป็นสำหรับ Google OAuth compliance
- การตั้งค่านี้จะใช้งานได้ทั้ง development และ production

---

**หลังจากทำตามขั้นตอนแล้ว Google Login จะทำงานได้ปกติ** 🎉
