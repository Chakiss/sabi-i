# 🚀 แผนการ Optimize ระบบ Sabai Massage

## 📈 เป้าหมาย
- ลดเวลาโหลดหน้าเว็บ 50%
- ลดจำนวน API requests 60%
- ปรับปรุง User Experience
- เพิ่ม Performance Score

---

## 🎯 Phase 1: Global State Management & Caching (สัปดาห์ที่ 1)

### 1.1 สร้าง Global Context สำหรับข้อมูลหลัก
```javascript
// src/contexts/AppContext.js
- จัดเก็บ therapists, services, config ใน Context
- Cache ข้อมูลเป็นเวลา 5-10 นาที
- Implement smart refresh logic
```

### 1.2 ปรับปรุง Data Fetching Strategy
```javascript
// ก่อน: แต่ละหน้าเรียก API แยกกัน
HomePage: getTodayBookings(), getTherapists(), getServices(), getConfig()
QueuePage: getTodayBookings(), getTherapists(), getServices()
ReportsPage: getTherapists(), getServices(), getConfig()

// หลัง: ใช้ Global State
HomePage: เอาจาก Context + เพิ่มเติม getTodayBookings() เท่านั้น
QueuePage: เอาจาก Context + เพิ่มเติม getTodayBookings() เท่านั้น
ReportsPage: เอาจาก Context + เพิ่มเติมเฉพาะข้อมูลที่ต้องการ
```

### 1.3 Implement Local Storage Cache
```javascript
// Cache ข้อมูลที่ไม่เปลี่ยนบ่อย
- therapists: Cache 30 นาที
- services: Cache 1 ชั่วโมง  
- config: Cache 24 ชั่วโมง
```

---

## ⚡ Phase 2: Request Optimization (สัปดาห์ที่ 2)

### 2.1 Smart Data Fetching
```javascript
// แทนที่จะเรียก API ทุกครั้ง
// ใช้ Incremental Updates แทน

// ตัวอย่าง: สำหรับ Dashboard
- เรียก Full Data ครั้งแรกเมื่อเข้าเว็บ
- หลังจากนั้นเรียกเฉพาะ Changes/Updates
- ใช้ timestamp เพื่อเช็ค updated data
```

### 2.2 Reduce Auto-Refresh Frequency
```javascript
// ปัจจุบัน: Refresh ทุก 30 วินาที
// เปลี่ยนเป็น: Smart Refresh

- HomePage: Refresh เมื่อมี user action
- QueuePage: Refresh เมื่อมีการอัพเดทสถานะ
- Background: Refresh เฉพาะเมื่อ window focus
```

### 2.3 Implement Request Deduplication
```javascript
// ป้องกันการเรียก API ซ้ำๆ ในเวลาเดียวกัน
- ใช้ Request Cache
- ยกเลิก duplicate requests
```

---

## 🗜️ Phase 3: Bundle Size Optimization (สัปดาห์ที่ 3)

### 3.1 Code Splitting
```javascript
// แบ่ง components ใหญ่ๆ
- Reports page: ใช้ dynamic import
- Dashboard components: Lazy loading
- Modal components: Load เมื่อต้องการใช้เท่านั้น
```

### 3.2 Tree Shaking
```javascript
// ลด import ที่ไม่จำเป็น
// ตัวอย่าง: แทนที่จะ import ทั้งหมด
import * from 'date-fns'
// เปลี่ยนเป็น
import { format, startOfDay } from 'date-fns'
```

### 3.3 Icon Optimization
```javascript
// แทนที่จะ import icon ทั้งหมด
import { CalendarDaysIcon, UserGroupIcon } from '@heroicons/react/24/outline'
// สร้าง icon bundle เฉพาะที่ใช้
```

---

## 💾 Phase 4: Advanced Caching (สัปดาห์ที่ 4)

### 4.1 Service Worker for Offline Support
```javascript
// Cache static assets
// Cache API responses
// Offline-first approach สำหรับข้อมูลพื้นฐาน
```

### 4.2 Implement Background Sync
```javascript
// อัพเดทข้อมูลใน background
// Sync เมื่อกลับมา online
```

---

## 📊 Expected Results

### ก่อน Optimize:
- Initial Load: ~3-5 วินาที
- API Requests: 15-20 ต่อหน้า
- Bundle Size: ~500KB
- Lighthouse Score: 60-70

### หลัง Optimize:
- Initial Load: ~1.5-2.5 วินาที (50% faster)
- API Requests: 6-8 ต่อหน้า (60% less)
- Bundle Size: ~300KB (40% smaller)
- Lighthouse Score: 85-95

---

## 🛠️ Implementation Priority

### สัปดาห์ที่ 1 (High Impact, Low Effort)
1. ✅ สร้าง AppContext สำหรับ shared data
2. ✅ ลด auto-refresh frequency
3. ✅ Implement localStorage cache

### สัปดาห์ที่ 2 (Medium Impact, Medium Effort)
4. ⚡ Smart data fetching
5. ⚡ Request deduplication
6. ⚡ Optimize Firebase queries

### สัปดาห์ที่ 3 (High Impact, High Effort)
7. 🚀 Code splitting
8. 🚀 Tree shaking
9. 🚀 Bundle optimization

### สัปดาห์ที่ 4 (Future Enhancement)
10. 💫 Service Worker
11. 💫 Background sync
12. 💫 Advanced caching

---

## 📝 Next Steps
1. เริ่มจาก Phase 1 - สร้าง Global Context
2. Test performance improvements ทีละ phase
3. Monitor และวัดผล
4. Adjust strategy ตามผลลัพธ์

คุณอยากเริ่มจาก phase ไหนก่อนครับ?
