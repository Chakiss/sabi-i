import { addDoc, collection, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Initialize default services
export const initializeServices = async () => {
  const services = [
    {
      name: 'นวดไทยประยุกต์',
      category: 'นวดไทย',
      priceByDuration: {
        60: 300,
        90: 450,
        120: 600
      }
    },
    {
      name: 'นวดน้ำมันอโรม่า', 
      category: 'อโรม่า',
      priceByDuration: {
        60: 400,
        90: 600,
        120: 800
      }
    },
    {
      name: 'นวดกดจุด (ริดเส้น)',
      category: 'กดจุด',
      priceByDuration: {
        30: 200,
        60: 350,
        90: 525
      }
    },
    {
      name: 'นวดฝ่าเท้า',
      category: 'ฝ่าเท้า', 
      priceByDuration: {
        30: 250,
        45: 350,
        60: 450
      }
    },
    {
      name: 'นวดหน้า + หัวไหล่',
      category: 'พิเศษ',
      priceByDuration: {
        30: 300,
        45: 400
      }
    }
  ];

  try {
    console.log('🌸 กำลังสร้างคอร์สนวด...');
    const servicesRef = collection(db, 'services');
    
    for (const service of services) {
      await addDoc(servicesRef, {
        ...service,
        createdAt: new Date()
      });
    }
    
    console.log('✅ สร้างคอร์สนวดสำเร็จ!');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างคอร์สนวด:', error);
    throw error;
  }
};

// Initialize sample therapists
export const initializeTherapists = async () => {
  const therapists = [
    {
      id: 'M001',
      name: 'คุณสมใจ นวดดี',
      status: 'active',
      startDate: new Date('2024-01-15')
    },
    {
      id: 'M002',
      name: 'คุณมาลี ขยันนวด', 
      status: 'active',
      startDate: new Date('2024-02-01')
    },
    {
      id: 'M003',
      name: 'คุณสมชาย เก่งนวด',
      status: 'active',
      startDate: new Date('2024-03-01')
    },
    {
      id: 'M004',
      name: 'คุณสุดา ใจดี',
      status: 'active', 
      startDate: new Date('2024-04-01')
    }
  ];

  try {
    console.log('👥 กำลังสร้างข้อมูลหมอนวด...');
    
    for (const therapist of therapists) {
      const therapistRef = doc(db, 'therapists', therapist.id);
      await setDoc(therapistRef, {
        name: therapist.name,
        status: therapist.status,
        startDate: therapist.startDate,
        createdAt: new Date()
      });
      console.log(`✅ สร้างหมอนวด ${therapist.id}: ${therapist.name}`);
    }
    
    console.log('✅ สร้างข้อมูลหมอนวดสำเร็จ!');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูลหมอนวด:', error);
    throw error;
  }
};

// Initialize global config
export const initializeConfig = async () => {
  try {
    console.log('⚙️ กำลังตั้งค่าระบบ...');
    
    const configRef = doc(db, 'config', 'global');
    await setDoc(configRef, {
      commissionRate: 0.4,  // ค่าคอม 40%
      insuranceMin: 500,    // ประกันมือขั้นต่ำ 500 บาท/วัน
      shopName: 'Saba-i Massage',
      shopPhone: '02-xxx-xxxx',
      shopAddress: 'กรุงเทพฯ',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log('✅ ตั้งค่าระบบสำเร็จ!');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการตั้งค่าระบบ:', error);
    throw error;
  }
};

// Initialize sample customers
export const initializeCustomers = async () => {
  const customers = [
    {
      phone: '081-234-5678',
      name: 'คุณลูกค้า A',
      email: '',
      address: '',
      notes: '',
      totalVisits: 1,
      lastVisit: new Date(),
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date()
    },
    {
      phone: '089-876-5432',
      name: 'คุณลูกค้า B',
      email: 'customer.b@email.com',
      address: '123 ถนนสุขุมวิท กรุงเทพ',
      notes: 'ชอบนวดแรงๆ',
      totalVisits: 3,
      lastVisit: new Date(),
      createdAt: new Date('2024-02-01'),
      updatedAt: new Date()
    },
    {
      phone: '092-555-1234',
      name: 'คุณสมศรี ใจดี',
      email: 'somsri@email.com',
      address: '456 ถนนพหลโยธิน กรุงเทพ',
      notes: 'มีปัญหาหลังเมื่อย',
      totalVisits: 5,
      lastVisit: new Date(),
      createdAt: new Date('2024-03-01'),
      updatedAt: new Date()
    }
  ];

  try {
    console.log('👥 กำลังสร้างข้อมูลลูกค้า...');
    
    for (const customer of customers) {
      const customerRef = doc(db, 'customers', customer.phone);
      await setDoc(customerRef, customer);
      console.log(`✅ สร้างลูกค้า ${customer.phone}: ${customer.name}`);
    }
    
    console.log('✅ สร้างข้อมูลลูกค้าสำเร็จ!');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูลลูกค้า:', error);
    return false;
  }
};

// Initialize sample bookings
export const initializeSampleBookings = async () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const bookings = [
    {
      customerName: 'คุณลูกค้า A',
      customerPhone: '081-234-5678',
      serviceId: 'temp_service_1', // จะอัพเดทหลังสร้าง services
      therapistId: 'M001', // ใช้ therapist ID ใหม่
      startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9:00 AM
      duration: 60,
      status: 'pending',
      isExtended: false
    },
    {
      customerName: 'คุณลูกค้า B',
      customerPhone: '089-876-5432',
      serviceId: 'temp_service_2',
      therapistId: 'M002', // ใช้ therapist ID ใหม่
      startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2:00 PM
      duration: 90,
      status: 'done',
      isExtended: false
    }
  ];

  try {
    console.log('📅 กำลังสร้างตัวอย่างการจอง...');
    const bookingsRef = collection(db, 'bookings');
    
    for (const booking of bookings) {
      await addDoc(bookingsRef, {
        ...booking,
        createdAt: new Date()
      });
    }
    
    console.log('✅ สร้างตัวอย่างการจองสำเร็จ!');
    return true;
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างตัวอย่างการจอง:', error);
    throw error;
  }
};

// Initialize all data
export const initializeAllData = async () => {
  try {
    console.log('🚀 เริ่มต้นการสร้างข้อมูลใน Firebase...');
    
    // สร้างตามลำดับ
    await initializeConfig();
    await initializeServices(); 
    await initializeTherapists();
    await initializeCustomers();
    // Skip sample bookings for now as we need real IDs
    
    console.log('🎉 สร้างข้อมูลทั้งหมดสำเร็จ!');
    console.log('📝 ตอนนี้คุณสามารถเริ่มใช้งานระบบได้แล้ว');
    
    return {
      success: true,
      message: 'สร้างข้อมูลเริ่มต้นใน Firebase เรียบร้อยแล้ว'
    };
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาดในการสร้างข้อมูล:', error);
    throw error;
  }
};
