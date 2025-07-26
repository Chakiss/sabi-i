# ✅ Quick Checklist: Enable Google Login

## 🎯 **เป้าหมาย:** แก้ไข `auth/operation-not-allowed` สำหรับ Google Login

## 📋 **Checklist (ทำตามลำดับ):**

### **□ Step 1: เข้า Firebase Console**
- [ ] เปิด https://console.firebase.google.com
- [ ] Login ด้วย Google Account ของคุณ
- [ ] เลือกโปรเจ็กต์ **"saba-i"**

### **□ Step 2: ไปที่ Authentication**
- [ ] คลิก **"Authentication"** ในเมนูซ้าย
- [ ] คลิกแท็บ **"Sign-in method"**

### **□ Step 3: เปิดใช้งาน Google**
- [ ] ค้นหา **"Google"** ในรายการ Sign-in providers
- [ ] คลิกที่ **"Google"**
- [ ] เปลี่ยน toggle เป็น **"Enable"** (สีน้ำเงิน)

### **□ Step 4: เพิ่ม Support Email**
- [ ] ในช่อง **"Project support email"**
- [ ] เลือกอีเมลของคุณจาก dropdown
- [ ] คลิก **"Save"**

### **□ Step 5: ตรวจสอบ**
- [ ] เห็น **Google ✅ Enabled** ในรายการ
- [ ] แสดง Support email ที่เลือก

### **□ Step 6: ทดสอบ**
- [ ] กลับไป http://localhost:3000
- [ ] รีเฟรชหน้าเว็บ (F5)
- [ ] คลิก **"เข้าสู่ระบบ"**
- [ ] คลิก **"เข้าสู่ระบบด้วย Google"**
- [ ] เห็น Google popup เปิดขึ้น ✅

## 🔍 **Visual Confirmation:**

### **ก่อนแก้ไข:**
```
🔍 Google    ❌ Disabled
```

### **หลังแก้ไข:**
```
🔍 Google    ✅ Enabled    📧 your-email@gmail.com
```

## 🚀 **Expected Result:**
- ✅ คลิก Google Login → เปิด popup
- ✅ เลือกบัญชี Google → เข้าสู่ระบบสำเร็จ
- ✅ กลับหน้าหลัก → แสดงชื่อผู้ใช้

## ⏱️ **เวลาที่ใช้:** 2-3 นาที
## 💰 **ค่าใช้จ่าย:** ฟรี 100%

---

**หลังจากทำครบทุกขั้นตอนแล้ว Google Login จะทำงานได้!** 🎉
