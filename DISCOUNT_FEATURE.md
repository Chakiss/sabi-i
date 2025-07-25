# ฟีเจอร์ส่วนลดและการคำนวณรายได้

## สิ่งที่เพิ่มเข้ามา

### 1. DiscountModal Component (/src/components/DiscountModal.js)
- Modal สำหรับใส่ส่วนลดเมื่อเปลี่ยนสถานะคิวเป็น "เสร็จแล้ว"
- รองรับส่วนลดแบบ:
  - เปอร์เซ็นต์ (%)
  - จำนวนเงิน (บาท)
- คำนวณราคาหลังหักส่วนลดแบบเรียลไทม์
- แสดงข้อมูลลูกค้าและบริการ
- ป้องกันการใส่ส่วนลดเกินราคาเดิม

### 2. อัพเดทหน้าคิว (/src/app/queue/page.js)
- เพิ่ม state สำหรับจัดการ DiscountModal
- อัพเดทฟังก์ชัน `handleStatusUpdate` รองรับข้อมูลส่วนลด
- เปลี่ยนพฤติกรรมปุ่ม "✅ เสร็จแล้ว" ให้เปิด DiscountModal
- แสดงข้อมูลส่วนลดสำหรับคิวที่เสร็จแล้ว
- แสดงราคาเดิม, ส่วนลด, และราคาสุทธิ

### 3. อัพเดทฟังก์ชัน Firestore
- อัพเดท `updateBookingStatus` รองรับพารามิเตอร์ `discountData`
- เพิ่มฟิลด์ใหม่ในฐานข้อมูล:
  - `discountType`: 'percentage' | 'amount' | null
  - `discountValue`: จำนวนส่วนลด
  - `finalPrice`: ราคาหลังหักส่วนลด
  - `completedAt`: เวลาที่เสร็จสิ้น
- อัพเดท Mock Firestore ให้รองรับข้อมูลใหม่

### 4. อัพเดทหน้ารายงาน (/src/app/reports/page.js)
- อัพเดทฟังก์ชัน `calculateDailyRevenue` แสดงสรุปรายได้:
  - รายได้เดิม (ก่อนหักส่วนลด)
  - ส่วนลดรวม
  - รายได้สุทธิ (หลังหักส่วนลด)
- แสดงรายละเอียดส่วนลดในแต่ละคิว
- แสดงข้อมูลส่วนลดแบบละเอียด (%, บาท, ยอดที่หัก)

## วิธีการใช้งาน

### สำหรับพนักงาน:
1. ไปหน้าคิว (http://localhost:3001/queue/)
2. เมื่อคิวเสร็จแล้ว กดปุ่ม "✅ เสร็จแล้ว"
3. Modal จะเปิดขึ้นพร้อมแสดงราคาเดิม
4. เลือกประเภทส่วนลด:
   - "ไม่มีส่วนลด" - ไม่ให้ส่วนลด
   - "เปอร์เซ็นต์ (%)" - ลดเป็น %
   - "จำนวนเงิน (บาท)" - ลดเป็นจำนวนบาท
5. ใส่จำนวนส่วนลด
6. ระบบจะคำนวณราคาหลังหักส่วนลดอัตโนมัติ
7. กดปุ่ม "✅ เสร็จสิ้น"

### สำหรับการดูรายงาน:
1. ไปหน้ารายงาน (http://localhost:3001/reports/)
2. เลือกวันที่ที่ต้องการดู
3. ดูสรุปรายได้:
   - จำนวนคิวทั้งหมด
   - รายได้เดิม
   - ส่วนลดรวม
   - รายได้สุทธิ
4. ดูรายละเอียดแต่ละคิวพร้อมข้อมูลส่วนลด

## ข้อมูลที่เก็บในฐานข้อมูล

```javascript
// ตัวอย่างข้อมูล booking ที่เสร็จแล้วพร้อมส่วนลด
{
  id: "booking123",
  customerName: "คุณลูกค้า",
  serviceId: "1",
  therapistId: "M001",
  status: "done",
  startTime: "2025-07-22T10:00:00Z",
  duration: 60,
  discountType: "percentage", // หรือ "amount" หรือ null
  discountValue: 10, // 10% หรือ 100 บาท
  finalPrice: 270, // ราคาหลังหักส่วนลด (300 - 10% = 270)
  completedAt: "2025-07-22T11:00:00Z"
}
```

## การคำนวณรายได้

### รายได้เดิม
ราคาของบริการตามระยะเวลา (จาก service.priceByDuration[duration])

### ส่วนลด
- แบบ %: `originalPrice * (discountValue / 100)`
- แบบบาท: `discountValue`

### รายได้สุทธิ
`originalPrice - discount`

## ความปลอดภัย
- ตรวจสอบส่วนลดไม่เกินราคาเดิม
- ตรวจสอบ % ไม่เกิน 100
- ป้องกันราคาสุทธิติดลบ

## การทดสอบ
1. เปิดเว็บไซต์ที่ http://localhost:3001
2. ไปหน้าคิว
3. ทดสอบเปลี่ยนสถานะคิวเป็น "เสร็จแล้ว" พร้อมใส่ส่วนลด
4. ตรวจสอบการแสดงผลในหน้าคิวและหน้ารายงาน
