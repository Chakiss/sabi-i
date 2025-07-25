# 📊 Advanced Features - Sabai Massage Management System

## สิ่งที่เพิ่มใหม่ (Version 2.0)

### 1. 📅 หน้าตารางคิวล่วงหน้า (/schedule)
**ดูคิวล่วงหน้าทั้งหมด ได้ทั้งวันนี้และวันอื่นๆ**

#### คุณสมบัติ:
- 📅 **ปฏิทินแบบเต็มรูปแบบ** - เลือกดูคิวได้ทุกวัน
- 🗓️ **นำทางรวดเร็ว** - วันนี้, พรุ่งนี้, สัปดาห์หน้า
- 📊 **สรุปข้อมูลวันที่เลือก** - จำนวนคิว แยกตามสถานะ
- 🔍 **รายละเอียดคิว** - ข้อมูลครบถ้วนในแต่ละคิว
- 📱 **Responsive Design** - ใช้งานได้ทั้งมือถือและคอมพิวเตอร์

#### การใช้งาน:
1. เข้าหน้าแรก → คลิก "ตารางคิวล่วงหน้า"
2. เลือกวันที่จากปฏิทิน หรือใช้ปุ่มลัด
3. ดูรายการคิวทั้งหมดของวันนั้น
4. เรียงลำดับตามเวลาอัตโนมัติ

### 2. 💰 ระบบคำนวณค่ามือแบบอัตโนมัติ
**หลังจากเสร็จแล้วมีการคำนวณค่ามือ 40% จาก config Firebase ของราคาก่อนลด**

#### คุณสมบัติ:
- ⚙️ **Config จาก Firebase** - ตั้งค่าเปอร์เซ็นต์ค่ามือได้ (default: 40%)
- 💵 **คำนวณอัตโนมัติ** - คำนวณจากราคาก่อนหักส่วนลด
- 👩‍⚕️ **แยกรายได้หมอนวด** - แสดงเงินที่หมอนวดได้รับ
- 🏪 **แยกรายได้ร้าน** - แสดงเงินที่ร้านได้รับ
- 📈 **รายงานสรุป** - สรุปค่ามือรวมในรายงานรายวัน

#### การทำงาน:
```javascript
// ตัวอย่างการคำนวณ
ราคาเดิม: 300 บาท
ส่วนลด 10%: -30 บาท
ราคาสุทธิ: 270 บาท

// คำนวณค่ามือจากราคาก่อนลด (300 บาท)
ค่ามือ 40%: 300 × 0.4 = 120 บาท (หมอนวดได้)
ร้านได้: 270 - 120 = 150 บาท
```

### 3. 📢 ระบบช่องทางรู้จัก
**ใส่ว่าลูกค้ารู้จักทางช่องทางไหน**

#### ช่องทางที่รองรับ:
- 📘 Facebook
- 📷 Instagram
- 🔍 Google
- 🚶‍♀️ Walk-in (เดินเข้ามาเอง)
- 👥 Referral (บอกต่อ)
- 💬 Line
- 🌐 Website
- 📝 Other (อื่นๆ)

#### คุณสมบัติ:
- 📊 **ติดตามช่องทาง** - บันทึกช่องทางในการจองคิวใหม่
- 🏷️ **แสดงผลสีสัน** - แสดง badge สีสันในหน้าคิว
- 📈 **วิเคราะห์ได้** - ดูได้ในรายงานว่าลูกค้ามาจากช่องทางไหนมากที่สุด

### 4. 💼 การคำนวณเงินของหมอนวดและร้านในทุกการจองคิว
**คำนวณเงินของหมอนวดและร้านในทุก ๆ การจองคิว**

#### คุณสมบัติการคำนวณ:
- 🧮 **คำนวณแบบเรียลไทม์** - แสดงในทุก Modal
- 💯 **ตามสัดส่วนที่ตั้งไว้** - ใช้ config จาก Firebase
- 💳 **แสดงในรายงาน** - สรุปรายได้แยกหมอนวด/ร้าน
- 📊 **สถิติรายวัน** - ดูได้ว่าแต่ละวันหมอนวดได้เท่าไหร่

#### ตำแหน่งที่แสดง:
1. **DiscountModal** - เมื่อคิวเสร็จแล้ว
2. **หน้า Queue** - แสดงในคิวที่เสร็จแล้ว
3. **หน้า Reports** - สรุปรายได้รายวัน
4. **หน้า Schedule** - ดูได้ในรายละเอียดคิว (ถ้าเสร็จแล้ว)

## 🔧 การตั้งค่า Config

### Firebase Config Collection:
```javascript
// config/global document
{
  commissionRate: 0.4,        // 40% ค่ามือหมอนวด
  taxRate: 0.07,              // 7% ภาษี
  insuranceMin: 500,          // ประกันสุขภาพขั้นต่ำ
  businessHours: {
    open: '09:00',            // เวลาเปิดร้าน
    close: '22:00'            // เวลาปิดร้าน
  },
  channels: [                 // ช่องทางลูกค้า
    'Facebook', 'Instagram', 'Google', 
    'Walk-in', 'Referral', 'Line', 
    'Website', 'Other'
  ]
}
```

## 📋 ข้อมูลที่เพิ่มในฐานข้อมูล

### Booking Document (เพิ่มฟิลด์):
```javascript
{
  // ฟิลด์เดิม...
  channel: 'Facebook',                    // ช่องทางลูกค้า
  discountType: 'percentage',            // ประเภทส่วนลด
  discountValue: 10,                     // ค่าส่วนลด
  finalPrice: 270,                       // ราคาหลังส่วนลด
  therapistCommission: 120,              // ค่ามือหมอนวด (40% ของราคาก่อนลด)
  shopRevenue: 150,                      // รายได้ร้าน (ราคาสุทธิ - ค่ามือ)
  completedAt: Timestamp                 // เวลาที่เสร็จสิ้น
}
```

## 🌟 คุณสมบัติเด่น

### 1. **การคำนวณที่ยุติธรรม**
- ค่ามือคำนวณจากราคาก่อนลด → หมอนวดไม่เสียหายจากส่วนลด
- ร้านรับผิดชobการให้ส่วนลด → ส่งเสริมการขายได้

### 2. **ระบบรายงานที่สมบูรณ์**
- แสดงรายได้แยกหมอนวด/ร้าน
- ติดตามช่องทางลูกค้า
- สรุปส่วนลดรวม
- คำนวณค่ามือรวมรายวัน

### 3. **UX/UI ที่ดีขึ้น**
- หน้าตารางคิวใหม่ที่ใช้ง่าย
- แสดงข้อมูลครบถ้วนในที่เดียว
- การนำทางที่สะดวก
- ปฏิทินที่ใช้งานง่าย

## 🚀 การอัพเกรด

### จากเวอร์ชันเก่า:
1. **ข้อมูลเดิมยังคงอยู่** - ไม่สูญหาย
2. **คิวเก่าจะแสดงปกติ** - แต่ไม่มีข้อมูลช่องทางและค่ามือ
3. **คิวใหม่จะมีฟีเจอร์ครบ** - ตั้งแต่การบันทึก
4. **Config ใช้ค่า default** - หากไม่มีการตั้งค่า

### การทดสอบ:
1. สร้างคิวใหม่ → ทดสอบเลือกช่องทาง
2. เสร็จคิว → ทดสอบการคำนวณค่ามือ
3. ดูรายงาน → ตรวจสอบการแสดงผล
4. หน้าตารางคิว → ทดสอบเลือกวันที่

---
**Version:** 2.0  
**Updated:** ${new Date().toLocaleString('th-TH')}  
**Features:** Advanced Scheduling + Commission Calculation + Channel Tracking
