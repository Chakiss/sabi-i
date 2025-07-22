// Mock Firestore functions for testing
import { mockTherapists, mockServices, mockBookings, mockConfig, mockCustomers } from './mockData';

// Flag to enable/disable mock mode
const USE_MOCK_DATA = process.env.NODE_ENV === 'development' && !process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

// Mock storage
let mockTherapistsStorage = [...mockTherapists];
let mockServicesStorage = [...mockServices];
let mockBookingsStorage = [...mockBookings];
let mockCustomersStorage = [...mockCustomers];

// Utility function to simulate async operations
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Function to get next therapist run number for mock
const getNextTherapistIdMock = () => {
  const existingIds = [];
  mockTherapistsStorage.forEach(therapist => {
    const id = therapist.id;
    if (id.startsWith('M') && id.length === 4) {
      const num = parseInt(id.substring(1));
      if (!isNaN(num)) {
        existingIds.push(num);
      }
    }
  });
  
  const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  const nextNum = maxNum + 1;
  
  return `M${nextNum.toString().padStart(3, '0')}`;
};

// Mock Therapist functions
export const addTherapistMock = async (therapistData) => {
  await delay();
  const therapistId = getNextTherapistIdMock();
  const newTherapist = {
    id: therapistId,
    ...therapistData,
    createdAt: new Date()
  };
  mockTherapistsStorage.push(newTherapist);
  return therapistId;
};

export const getTherapistsMock = async () => {
  await delay();
  return [...mockTherapistsStorage];
};

export const updateTherapistMock = async (therapistId, updateData) => {
  await delay();
  const index = mockTherapistsStorage.findIndex(t => t.id === therapistId);
  if (index !== -1) {
    mockTherapistsStorage[index] = {
      ...mockTherapistsStorage[index],
      ...updateData,
      updatedAt: new Date()
    };
  }
};

// Mock Services functions
export const addServiceMock = async (serviceData) => {
  await delay();
  const newService = {
    id: Date.now().toString(),
    ...serviceData,
    createdAt: new Date()
  };
  mockServicesStorage.push(newService);
  return newService.id;
};

export const getServicesMock = async () => {
  await delay();
  return [...mockServicesStorage];
};

// Service Management Functions
export const createService = (serviceData) => {
  console.log('Creating service in mock:', serviceData);
  
  const newId = (mockServices.length + 1).toString();
  const newService = {
    id: newId,
    ...serviceData,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  mockServices.push(newService);
  console.log('Service created in mock:', newService);
  return newService;
};

export const updateServiceMock = (serviceId, updateData) => {
  console.log('Updating service in mock:', serviceId, updateData);
  
  const serviceIndex = mockServices.findIndex(s => s.id === serviceId);
  if (serviceIndex === -1) {
    throw new Error('ไม่พบคอร์สนวดที่ต้องการแก้ไข');
  }
  
  mockServices[serviceIndex] = {
    ...mockServices[serviceIndex],
    ...updateData,
    updatedAt: new Date()
  };
  
  console.log('Service updated in mock:', mockServices[serviceIndex]);
  return mockServices[serviceIndex];
};

export const deleteServiceMock = (serviceId) => {
  console.log('Deleting service in mock:', serviceId);
  
  const serviceIndex = mockServices.findIndex(s => s.id === serviceId);
  if (serviceIndex === -1) {
    throw new Error('ไม่พบคอร์สนวดที่ต้องการลบ');
  }
  
  // Check if service is being used in any booking
  const isInUse = mockBookings.some(b => b.serviceId === serviceId);
  if (isInUse) {
    throw new Error('ไม่สามารถลบคอร์สนวดนี้ได้ เพราะมีการใช้งานอยู่');
  }
  
  mockServices.splice(serviceIndex, 1);
  console.log('Service deleted from mock');
  return true;
};

// Mock Bookings functions
export const addBookingMock = async (bookingData) => {
  await delay();
  
  // Save or update customer data first
  if (bookingData.customerName && bookingData.customerPhone) {
    await upsertCustomerMock({
      phone: bookingData.customerPhone,
      name: bookingData.customerName
    });
  }
  
  const newBooking = {
    id: Date.now().toString(),
    ...bookingData,
    status: 'pending',
    isExtended: false,
    createdAt: new Date()
  };
  
  console.log('📝 Adding new booking:', newBooking);
  console.log('📅 Start time:', newBooking.startTime);
  console.log('📊 Total bookings before:', mockBookingsStorage.length);
  
  mockBookingsStorage.push(newBooking);
  
  console.log('📊 Total bookings after:', mockBookingsStorage.length);
  console.log('🗂️ All bookings:', mockBookingsStorage);
  
  return newBooking.id;
};

export const getTodayBookingsMock = async () => {
  await delay();
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  
  console.log('🗓️ Fetching today bookings...');
  console.log('📅 Today:', today.toISOString());
  console.log('🌅 Start of day:', startOfDay.toISOString());
  console.log('🌇 End of day:', endOfDay.toISOString());
  console.log('📊 Total bookings in storage:', mockBookingsStorage.length);
  
  const todayBookings = mockBookingsStorage.filter(booking => {
    const bookingDate = new Date(booking.startTime);
    console.log(`🔍 Checking booking ${booking.id}:`);
    console.log(`   Customer: ${booking.customerName}`);
    console.log(`   Start Time: ${bookingDate.toISOString()}`);
    console.log(`   Start Time (Thai): ${bookingDate.toLocaleString('th-TH')}`);
    
    const isToday = bookingDate >= startOfDay && bookingDate < endOfDay;
    console.log(`   ✅ Is today? ${isToday}`);
    return isToday;
  });
  
  console.log('📋 Today bookings found:', todayBookings.length);
  todayBookings.forEach(booking => {
    console.log(`   - ${booking.customerName} at ${new Date(booking.startTime).toLocaleTimeString('th-TH')}`);
  });
  
  return todayBookings;
};

export const updateBookingStatusMock = async (bookingId, status, discountData = null) => {
  await delay();
  const index = mockBookingsStorage.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    const updateData = {
      ...mockBookingsStorage[index],
      status,
      updatedAt: new Date()
    };

    // Add discount data if provided (when completing a booking)
    if (status === 'done' && discountData) {
      updateData.discountType = discountData.discountType;
      updateData.discountValue = discountData.discountValue;
      updateData.finalPrice = discountData.finalPrice;
      updateData.completedAt = new Date();
    }

    mockBookingsStorage[index] = updateData;
  }
};

export const updateBookingMock = async (bookingId, updateData) => {
  await delay();
  const index = mockBookingsStorage.findIndex(b => b.id === bookingId);
  if (index !== -1) {
    mockBookingsStorage[index] = {
      ...mockBookingsStorage[index],
      ...updateData,
      updatedAt: new Date()
    };
    console.log('📝 Updated booking:', mockBookingsStorage[index]);
    return true;
  }
  return false;
};

export const getBookingByIdMock = async (bookingId) => {
  await delay(200);
  return mockBookingsStorage.find(booking => booking.id === bookingId) || null;
};

// Mock Config function
export const getConfigMock = async () => {
  await delay(300);
  return mockConfig;
};

// ==============================
// CUSTOMER MOCK FUNCTIONS
// ==============================

export const getCustomerByPhoneMock = async (phone) => {
  await delay(200);
  return mockCustomersStorage.find(customer => customer.phone === phone) || null;
};

export const upsertCustomerMock = async (customerData) => {
  await delay(300);
  
  const { phone, ...data } = customerData;
  const existingIndex = mockCustomersStorage.findIndex(c => c.phone === phone);
  
  const customerDoc = {
    phone,
    ...data,
    totalVisits: existingIndex >= 0 ? mockCustomersStorage[existingIndex].totalVisits + 1 : 1,
    lastVisit: new Date(),
    updatedAt: new Date(),
    ...(existingIndex >= 0 ? {} : { createdAt: new Date() })
  };
  
  if (existingIndex >= 0) {
    mockCustomersStorage[existingIndex] = customerDoc;
  } else {
    mockCustomersStorage.push(customerDoc);
  }
  
  return customerDoc;
};

export const getCustomersMock = async () => {
  await delay(300);
  return [...mockCustomersStorage];
};

// Mock functions for date range queries
export const getBookingsByDateRangeMock = (startDate, endDate) => {
  console.log('Getting bookings by date range in mock:', startDate, endDate);
  
  return mockBookings.filter(booking => {
    const bookingDate = new Date(booking.startTime);
    return bookingDate >= startDate && bookingDate <= endDate;
  });
};

export const getMonthlyRevenueMock = (year, month) => {
  console.log('Getting monthly revenue in mock:', year, month);
  
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const monthlyBookings = mockBookings.filter(booking => {
    const bookingDate = new Date(booking.startTime);
    return bookingDate >= startOfMonth && bookingDate <= endOfMonth;
  });
  
  const completedBookings = monthlyBookings.filter(b => b.status === 'done');
  const totalRevenue = completedBookings.reduce((sum, booking) => {
    const service = mockServices.find(s => s.id === booking.serviceId);
    return sum + (service?.priceByDuration?.[booking.duration] || 0);
  }, 0);
  
  // Create daily breakdown
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyBreakdown = {};
  
  for (let day = 1; day <= daysInMonth; day++) {
    dailyBreakdown[day] = { bookings: 0, revenue: 0 };
  }
  
  completedBookings.forEach(booking => {
    const bookingDate = new Date(booking.startTime);
    const day = bookingDate.getDate();
    const service = mockServices.find(s => s.id === booking.serviceId);
    const revenue = service?.priceByDuration?.[booking.duration] || 0;
    
    dailyBreakdown[day].bookings += 1;
    dailyBreakdown[day].revenue += revenue;
  });
  
  return {
    year,
    month,
    totalBookings: monthlyBookings.length,
    completedBookings: completedBookings.length,
    totalRevenue,
    dailyBreakdown
  };
};

// Reset function for testing
export const resetMockData = () => {
  mockTherapistsStorage = [...mockTherapists];
  mockServicesStorage = [...mockServices];
  mockBookingsStorage = [...mockBookings];
  mockCustomersStorage = [...mockCustomers];
};
