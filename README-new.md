# 🌸 Saba-i Massage Management System

ระบบจัดการร้านนวดไทย พัฒนาด้วย Next.js และ Firebase

## 🎯 ฟีเจอร์หลัก

- ✅ **จองคิวลูกค้า**: ลงคิวและจัดหมอนวดให้ลูกค้า
- ✅ **จัดการหมอนวด**: เพิ่ม/ลบ/แก้ไขข้อมูลพนักงาน
- ✅ **ระบบคำนวณค่าแรง**: คิดค่าคอม 40% + ประกันมือ 500 บาท/วัน
- 🚧 **Dashboard**: รายงานยอดและสรุปรายได้ (Week 4)
- 🚧 **ระบบเวรทำงาน**: จัดตารางเวรหมอนวด (Week 2)

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 + React 19
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS
- **Icons**: Heroicons
- **Notifications**: React Hot Toast

## 🚀 การติดตั้งและเริ่มใช้งาน

### 1. Clone Repository
```bash
git clone <repository-url>
cd sabai-massage
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. Setup Firebase
1. สร้าง Firebase Project ใหม่ที่ [Firebase Console](https://console.firebase.google.com)
2. เปิดใช้งาน Firestore Database
3. เปิดใช้งาน Authentication
4. คัดลอกค่า Config จาก Project Settings

### 4. สร้าง Environment Variables
```bash
cp .env.local.example .env.local
```

แล้วแก้ไขไฟล์ `.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

### 5. เริ่มใช้งาน
```bash
npm run dev
```

เปิดเบราว์เซอร์ไปที่ [http://localhost:3000](http://localhost:3000)

## 📊 Database Schema (Firestore)

### Collections

#### `/therapists/{therapistId}`
```javascript
{
  name: "ชื่อหมอนวด",
  status: "active" | "resigned",
  startDate: Timestamp,
  endDate: Timestamp | null,
  createdAt: Timestamp
}
```

#### `/services/{serviceId}`
```javascript
{
  name: "ชื่อคอร์ส",
  category: "หมวดหมู่",
  priceByDuration: {
    30: 200,
    60: 300,
    90: 450
  },
  createdAt: Timestamp
}
```

#### `/bookings/{bookingId}`
```javascript
{
  customerName: "ชื่อลูกค้า",
  serviceId: "รหัสคอร์ส",
  therapistId: "รหัสหมอนวด",
  startTime: Timestamp,
  duration: 60, // นาที
  status: "pending" | "in_progress" | "done",
  isExtended: false,
  createdAt: Timestamp
}
```

#### `/config/global`
```javascript
{
  commissionRate: 0.4,    // ค่าคอม 40%
  insuranceMin: 500       // ประกันมือขั้นต่ำ
}
```

## 🗓️ Development Roadmap

| สัปดาห์ | งานที่ทำ |
|---------|----------|
| **Week 1** ✅ | สร้างโครงสร้างพื้นฐาน + ระบบจองคิว + จัดการหมอนวด |
| **Week 2** 🚧 | ระบบ Worklog + คำนวณค่าคอม/ประกันมือ |
| **Week 3** 🚧 | ระบบจัดการคอร์ส + Admin UI |
| **Week 4** 🚧 | Dashboards + Export CSV + ระบบลา |

## 🎨 UI/UX Features

- 📱 Responsive Design (Mobile-first)
- 🌍 Thai Language Support
- 🎯 Modern และใช้งานง่าย
- 🔄 Real-time Updates
- 📊 Visual Dashboard
- 🎨 Beautiful Gradient Design

## 🔒 Security Features

- Firebase Authentication
- Role-based Access (เจ้าของร้าน + พนักงาน)
- Secure API calls
- Data validation

## 📞 Support

สำหรับคำถามหรือปัญหาการใช้งาน กรุณาติดต่อทีมพัฒนา

---

Made with ❤️ by Development Team
