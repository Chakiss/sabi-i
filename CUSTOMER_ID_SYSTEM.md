# ระบบ Customer ID ใหม่

## การเปลี่ยนแปลง

เดิม: ใช้เบอร์โทรเป็น Customer ID
ใหม่: ใช้รูปแบบ `YYMMDDXXX` เช่น `250801001`

## รูปแบบ Customer ID ใหม่

```
YYMMDDXXX
│││││││││
│││││└┴┴─ Counter (001-999) - ลำดับลูกค้าในแต่ละวัน
│││└┴──── Day (01-31) - วันที่
││└────── Month (01-12) - เดือน
└┴─────── Year (25 = 2025) - ปี
```

## ตัวอย่างการใช้งาน

**วันที่ 1 สิงหาคม 2025:**
- ลูกค้าคนแรก: `250801001`
- ลูกค้าคนที่ 2: `250801002`
- ลูกค้าคนที่ 15: `250801015`
- ลูกค้าคนที่ 50: `250801050`

**วันที่ 2 สิงหาคม 2025:**
- ลูกค้าคนแรก: `250802001` ← counter รีเซ็ตเป็น 001
- ลูกค้าคนที่ 2: `250802002`

## ข้อดีของระบบใหม่

1. **ไม่ขึ้นกับข้อมูลลูกค้า** - ไม่ต้องกังวลว่าลูกค้าไม่มีเบอร์โทร
2. **อ่านวันที่ได้ทันที** - เห็นว่าลูกค้าสมัครวันไหน
3. **เรียงตามวันที่อัตโนมัติ** - ID ที่มากกว่าคือลูกค้าใหม่กว่า
4. **รองรับลูกค้า 999 คนต่อวัน** - เพียงพอสำหรับธุรกิจ
5. **ไม่ซ้ำแน่นอน** - มี unique constraint

## โครงสร้างการจัดเก็บใน Database

### ก่อนหน้า:
```
customers/
  └── {phoneNumber}/     ← ใช้เบอร์โทรเป็น document ID
      ├── name
      ├── phone
      └── ...
```

### ปัจจุบัน:
```
customers/
  └── {customerID}/      ← ใช้ Customer ID เป็น document ID
      ├── id: "250801001"
      ├── name
      ├── phone
      └── ...

counters/
  └── customer_{YYMMDD}/ ← เก็บ counter สำหรับแต่ละวัน
      ├── count: 15
      ├── datePrefix: "250801"
      └── updatedAt
```

## Booking Data Changes

ข้อมูล Booking จะมีฟิลด์เพิ่มขึ้น:

```javascript
{
  customerId: "250801001",    // ← ใหม่: Customer ID
  customerName: "นาย A",
  customerPhone: "0812345678",
  serviceId: "...",
  // ... ฟิลด์อื่น ๆ
}
```

## การย้อนหลังรองรับ (Backward Compatibility)

ระบบยังคงรองรับลูกค้าเก่าที่ใช้เบอร์โทรเป็น ID:
- ค้นหาจาก document ID ก่อน (ลูกค้าเก่า)
- ถ้าไม่เจอ ค้นหาจากฟิลด์ `phone` (ลูกค้าใหม่)

## API Functions

### `generateCustomerId()`
สร้าง Customer ID ใหม่
```javascript
const id = await generateCustomerId(); // "250801001"
```

### `parseCustomerId(id)`
แยกข้อมูลจาก Customer ID
```javascript
const parsed = parseCustomerId("250801001");
// {
//   isValid: true,
//   year: 2025,
//   month: 8,
//   day: 1,
//   counter: 1,
//   date: Date object,
//   formattedDate: "01/08/2025"
// }
```

### `isValidCustomerId(id)`
ตรวจสอบว่า Customer ID ถูกต้องหรือไม่
```javascript
isValidCustomerId("250801001"); // true
isValidCustomerId("12345");     // false
```

## การทดสอบ

รันไฟล์ทดสอบ:
```bash
node test-customer-id.js
```

## การย้ายข้อมูล (Migration)

ลูกค้าเก่าที่มีเบอร์โทรเป็น ID จะได้รับ ID ใหม่เมื่อ:
1. มีการอัพเดทข้อมูล
2. ทำการจองใหม่

ไม่จำเป็นต้องทำ migration ทันที เพราะระบบรองรับทั้งสองแบบ
