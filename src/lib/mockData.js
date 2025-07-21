// Mock data for testing without Firebase
export const mockTherapists = [
  {
    id: 'M001',
    name: 'คุณสมใจ นวดดี',
    status: 'active',
    startDate: new Date('2024-01-15'),
    createdAt: new Date('2024-01-15')
  },
  {
    id: 'M002',
    name: 'คุณมาลี ขยันนวด',
    status: 'active',
    startDate: new Date('2024-02-01'),
    createdAt: new Date('2024-02-01')
  },
  {
    id: 'M003',
    name: 'คุณสมชาย เก่งนวด',
    status: 'resigned',
    startDate: new Date('2023-12-01'),
    endDate: new Date('2024-06-15'),
    createdAt: new Date('2023-12-01')
  }
];

export const mockCustomers = [
  {
    phone: '081-234-5678', // Primary Key
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
    phone: '089-876-5432', // Primary Key  
    name: 'คุณลูกค้า B',
    email: 'customer.b@email.com',
    address: '123 ถนนสุขุมวิท กรุงเทพ',
    notes: 'ชอบนวดแรงๆ',
    totalVisits: 3,
    lastVisit: new Date(),
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date()
  }
];

export const mockServices = [
  {
    id: '1',
    name: 'นวดไทยประยุกต์',
    category: 'นวดไทย',
    priceByDuration: {
      60: 300,
      90: 450,
      120: 600
    }
  },
  {
    id: '2',
    name: 'นวดน้ำมันอโรม่า',
    category: 'อโรม่า',
    priceByDuration: {
      60: 400,
      90: 600,
      120: 800
    }
  },
  {
    id: '3',
    name: 'นวดกดจุด (ริดเส้น)',
    category: 'กดจุด',
    priceByDuration: {
      30: 200,
      60: 350,
      90: 525
    }
  },
  {
    id: '4',
    name: 'นวดฝ่าเท้า',
    category: 'ฝ่าเท้า',
    priceByDuration: {
      30: 250,
      45: 350,
      60: 450
    }
  },
  {
    id: '5',
    name: 'นวดหน้า + หัวไหล่',
    category: 'พิเศษ',
    priceByDuration: {
      30: 300,
      45: 400
    }
  }
];

export const mockBookings = [
  {
    id: '1',
    customerName: 'คุณลูกค้า A',
    customerPhone: '081-234-5678',
    serviceId: '1',
    therapistId: 'M001',
    startTime: new Date(),
    duration: 60,
    status: 'pending',
    isExtended: false,
    createdAt: new Date()
  },
  {
    id: '2',
    customerName: 'คุณลูกค้า B',
    customerPhone: '089-876-5432',
    serviceId: '2',
    therapistId: 'M002',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours later
    duration: 90,
    status: 'done',
    isExtended: false,
    createdAt: new Date()
  }
];

export const mockConfig = {
  commissionRate: 0.4,
  insuranceMin: 500
};
