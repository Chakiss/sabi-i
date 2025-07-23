# 📅 Date Time Format Standards

## การใช้งาน dateTimeUtils ให้เป็นมาตรฐานเดียวกัน

เพื่อให้การแสดงวันที่และเวลาในระบบมีความสอดคล้องกัน ระบบได้สร้าง utility function สำหรับจัดการ date time format

### ✅ ไฟล์ที่แก้ไขแล้ว:

1. **src/lib/dateTimeUtils.js** - ไฟล์หลักสำหรับ utility functions
2. **src/components/BookingModal.js** - หน้าจองคิวใหม่
3. **src/components/EditBookingModal.js** - หน้าแก้ไขคิว
4. **src/app/booking/page.js** - หน้าจองคิวหลัก
5. **src/app/queue/page.js** - หน้าคิวรายวัน
6. **src/app/schedule/page.js** - หน้าตารางเวลา
7. **src/app/reports/page-new.js** - หน้ารายงาน (บางส่วน)

### 🔧 ฟังก์ชันที่มีให้ใช้งาน:

#### วันที่ (Date)
- `formatDate(date, options)` - แสดงวันที่แบบไทย เช่น "23 กรกฎาคม 2025"
- `formatShortDate(date)` - แสดงวันที่แบบสั้น เช่น "23/07/2025" 
- `formatWeekdayDate(date)` - แสดงวันและวันที่ เช่น "วันอังคาร 23 กรกฎาคม 2025"
- `formatMonthYear(date)` - แสดงเดือนปี เช่น "กรกฎาคม 2025"

#### เวลา (Time)
- `formatTime(date)` - แสดงเวลา 24 ชั่วโมง เช่น "14:30"
- `formatDateTime(date)` - แสดงวันที่และเวลา เช่น "23 ก.ค. 2025 เวลา 14:30"

#### สำหรับ Input Fields
- `formatDateForInput(date)` - รูปแบบ YYYY-MM-DD สำหรับ input type="date"
- `formatTimeForInput(date)` - รูปแบบ HH:mm สำหรับ input type="time"
- `getTodayForInput()` - วันที่วันนี้สำหรับ input
- `getCurrentTimeForInput()` - เวลาปัจจุบันสำหรับ input

#### สกุลเงิน (Currency)
- `formatCurrency(amount)` - แสดงเงินบาท เช่น "฿1,500"

### 📋 วิธีการใช้งาน:

```javascript
import { dateTimeUtils } from '@/lib/dateTimeUtils';

// แสดงวันที่
const dateStr = dateTimeUtils.formatDate(new Date());
// ผลลัพธ์: "23 กรกฎาคม 2025"

// แสดงเวลา
const timeStr = dateTimeUtils.formatTime(new Date());
// ผลลัพธ์: "14:30"

// แสดงเงิน
const price = dateTimeUtils.formatCurrency(1500);
// ผลลัพธ์: "฿1,500"

// สำหรับ input field
const inputDate = dateTimeUtils.getTodayForInput();
// ผลลัพธ์: "2025-07-23"
```

### 🎯 ประโยชน์:

1. **ความสอดคล้อง** - รูปแบบเดียวกันทั้งระบบ
2. **ภาษาไทย** - ใช้ locale 'th-TH' ตลอด
3. **ง่ายต่อการบำรุงรักษา** - แก้ที่เดียวใช้ได้ทั้งระบบ
4. **ลดข้อผิดพลาด** - ไม่ต้องเขียนโค้ด format ซ้ำ
5. **อ่านง่าย** - ชื่อ function สื่อความหมาย

### ⚡ การปรับปรุงที่ทำ:

- ✅ แทนที่ `toLocaleString()` ด้วย `formatCurrency()`
- ✅ แทนที่ `toLocaleTimeString('th-TH', {...})` ด้วย `formatTime()`
- ✅ แทนที่ `toLocaleDateString('th-TH', {...})` ด้วย `formatDate()`
- ✅ แทนที่ `new Date().toISOString().split('T')[0]` ด้วย `getTodayForInput()`
- ✅ ใช้ format เดียวกันสำหรับการแสดงเวลา (24 ชั่วโมง, 2 หลัก)
- ✅ ใช้ format เดียวกันสำหรับการแสดงสกุลเงิน (฿ + เลขคั่น)

### 📝 หมายเหตุ:

- ระบบใช้ locale 'th-TH' (ไทย) เป็นหลัก
- เวลาแสดงแบบ 24 ชั่วโมง (ไม่มี AM/PM)
- เงินแสดงด้วยสัญลักษณ์บาท (฿) และคั่นหลักด้วยเครื่องหมายจุลภาค
- วันที่แสดงเป็นภาษาไทย เช่น "กรกฎาคม" แทน "July"
