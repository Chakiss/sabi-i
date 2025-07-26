import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from './firebase';
import { MOCK_DATA } from './mockData';
import { debugLog } from './debugConfig';
import {
  addTherapistMock,
  getTherapistsMock,
  updateTherapistMock,
  addServiceMock,
  getServicesMock,
  addBookingMock,
  getTodayBookingsMock,
  updateBookingStatusMock,
  updateBookingMock,
  getBookingByIdMock,
  getConfigMock,
  getCustomerByPhoneMock,
  upsertCustomerMock,
  getCustomersMock,
  createService,
  updateServiceMock,
  deleteServiceMock,
  getBookingsByDateRangeMock,
  getMonthlyRevenueMock
} from './mockFirestore';

// Import mock customers functions  
import { mockCustomers } from './mockData';

// Track permission errors to avoid spamming
let permissionErrorShown = false;

// Check if we should use mock data (when Firebase is not properly configured)
const shouldUseMock = () => {
  try {
    return !db || process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK === 'true';
  } catch (error) {
    console.warn('Firebase not configured, using mock data');
    return true;
  }
};

// Auto fallback to mock when Firebase has permission issues
const handleFirebaseError = (error, mockFunction, ...args) => {
  console.warn('Firebase error, falling back to mock data:', error.message);
  
  // Check if it's a permission error
  if (error.code === 'permission-denied' || error.message.includes('Missing or insufficient permissions')) {
    if (!permissionErrorShown) {
      console.warn('🔥 Firebase permission denied - Please update Firestore Security Rules');
      console.warn('📖 See FIREBASE_SETUP.md for instructions');
      permissionErrorShown = true;
    }
  }
  
  return mockFunction(...args);
};

// Function to get next therapist run number
const getNextTherapistId = async () => {
  try {
    const therapistsRef = collection(db, 'therapists');
    const querySnapshot = await getDocs(therapistsRef);
    
    // Get all existing IDs and find the highest number
    const existingIds = [];
    querySnapshot.docs.forEach(doc => {
      const id = doc.id;
      if (id.startsWith('M') && id.length === 4) {
        const num = parseInt(id.substring(1));
        if (!isNaN(num)) {
          existingIds.push(num);
        }
      }
    });
    
    // Find next number
    const maxNum = existingIds.length > 0 ? Math.max(...existingIds) : 0;
    const nextNum = maxNum + 1;
    
    // Format as M001, M002, etc.
    return `M${nextNum.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error generating therapist ID:', error);
    // Fallback to timestamp-based ID
    return `M${Date.now().toString().slice(-3)}`;
  }
};

export const addTherapist = async (therapistData) => {
  if (shouldUseMock()) {
    return addTherapistMock(therapistData);
  }
  
  try {
    // Generate next therapist ID (M001, M002, etc.)
    const therapistId = await getNextTherapistId();
    const therapistRef = doc(db, 'therapists', therapistId);
    
    await setDoc(therapistRef, {
      ...therapistData,
      startDate: Timestamp.fromDate(new Date(therapistData.startDate)),
      createdAt: Timestamp.now()
    });
    
    return therapistId;
  } catch (error) {
    console.error('Error adding therapist:', error);
    // Fallback to mock
    console.warn('Falling back to mock data');
    return addTherapistMock(therapistData);
  }
};

export const getTherapists = async () => {
  if (shouldUseMock()) {
    return getTherapistsMock();
  }
  
  try {
    const therapistsRef = collection(db, 'therapists');
    const querySnapshot = await getDocs(
      query(therapistsRef, orderBy('createdAt', 'desc'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate?.toDate(),
      endDate: doc.data().endDate?.toDate()
    }));
  } catch (error) {
    return handleFirebaseError(error, getTherapistsMock);
  }
};

export const updateTherapist = async (therapistId, updateData) => {
  if (shouldUseMock()) {
    return updateTherapistMock(therapistId, updateData);
  }
  
  try {
    const docRef = doc(db, 'therapists', therapistId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating therapist:', error);
    // Fallback to mock
    console.warn('Falling back to mock data');
    return updateTherapistMock(therapistId, updateData);
  }
};

// Services Collection
export const addService = async (serviceData) => {
  if (shouldUseMock()) {
    return createService(serviceData);
  }
  
  try {
    const serviceRef = await addDoc(collection(db, 'services'), {
      ...serviceData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return {
      id: serviceRef.id,
      ...serviceData
    };
  } catch (error) {
    console.error('Error adding service:', error);
    return createService(serviceData);
  }
};

export const getServices = async () => {
  if (shouldUseMock()) {
    return getServicesMock();
  }
  
  try {
    const servicesRef = collection(db, 'services');
    const querySnapshot = await getDocs(
      query(servicesRef, orderBy('category'), orderBy('name'))
    );
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return handleFirebaseError(error, getServicesMock);
  }
};

export const updateService = async (serviceId, updateData) => {
  if (shouldUseMock()) {
    return updateServiceMock(serviceId, updateData);
  }
  
  try {
    const serviceRef = doc(db, 'services', serviceId);
    await updateDoc(serviceRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating service:', error);
    return updateServiceMock(serviceId, updateData);
  }
};

export const deleteService = async (serviceId) => {
  if (shouldUseMock()) {
    return deleteServiceMock(serviceId);
  }
  
  try {
    // Check if service is being used in any booking
    const bookingsQuery = query(
      collection(db, 'bookings'),
      where('serviceId', '==', serviceId)
    );
    const bookingsSnapshot = await getDocs(bookingsQuery);
    
    if (!bookingsSnapshot.empty) {
      throw new Error('ไม่สามารถลบคอร์สนวดนี้ได้ เพราะมีการใช้งานอยู่');
    }
    
    const serviceRef = doc(db, 'services', serviceId);
    await deleteDoc(serviceRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting service:', error);
    return deleteServiceMock(serviceId);
  }
};

// Generate booking ID with format BYYYYMMDDHHMMSS
const generateBookingId = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');
  const second = String(now.getSeconds()).padStart(2, '0');
  
  return `B${year}${month}${day}${hour}${minute}${second}`;
};

// Bookings Collection
export const addBooking = async (bookingData) => {
  if (shouldUseMock()) {
    return addBookingMock(bookingData);
  }
  
  try {
    // Note: Customer management is now handled in BookingModal.js
    // This avoids duplicate customer operations
    
    // Generate custom booking ID
    const bookingId = generateBookingId();
    
    const bookingRef = doc(db, 'bookings', bookingId);
    await setDoc(bookingRef, {
      ...bookingData,
      startTime: Timestamp.fromDate(new Date(bookingData.startTime)),
      status: 'pending',
      isExtended: false,
      createdAt: Timestamp.now()
    });
    return bookingId;
  } catch (error) {
    console.error('Error adding booking:', error);
    console.warn('Falling back to mock data');
    return addBookingMock(bookingData);
  }
};

export const getTodayBookings = async () => {
  debugLog('firestore', '📅 getTodayBookings called');
  
  if (shouldUseMock()) {
    debugLog('firestore', '🎭 Using mock data for today bookings');
    return getTodayBookingsMock();
  }
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    debugLog('firestore', '🗓️ Querying bookings for date range:', { startOfDay, endOfDay });
    
    const q = query(
      bookingsRef,
      where('startTime', '>=', Timestamp.fromDate(startOfDay)),
      where('startTime', '<', Timestamp.fromDate(endOfDay)),
      orderBy('startTime')
    );
    
    const querySnapshot = await getDocs(q);
    const bookings = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate()
    }));
    
    debugLog('firestore', '🔥 Firebase bookings fetched:', bookings.map(b => ({ id: b.id, status: b.status, customer: b.customerName })));
    
    return bookings;
  } catch (error) {
    console.error('❌ Error fetching today bookings from Firebase:', error);
    return handleFirebaseError(error, getTodayBookingsMock);
  }
};

export const updateBookingStatus = async (bookingId, status, discountData = null) => {
  debugLog('firestore', '📝 updateBookingStatus called:', { bookingId, status, discountData });
  
  if (shouldUseMock()) {
    debugLog('firestore', '🎭 Using mock data for booking status update');
    return updateBookingStatusMock(bookingId, status, discountData);
  }
  
  try {
    const docRef = doc(db, 'bookings', bookingId);
    const updateData = {
      status,
      updatedAt: Timestamp.now()
    };

    // Add discount data if provided (when completing a booking)
    if (status === 'done' && discountData) {
      updateData.discountType = discountData.discountType;
      updateData.discountValue = discountData.discountValue;
      updateData.finalPrice = discountData.finalPrice;
      updateData.therapistCommission = discountData.therapistCommission;
      updateData.shopRevenue = discountData.shopRevenue;
      updateData.completedAt = Timestamp.now();
    }

    console.log('🔥 Updating Firebase document:', { bookingId, updateData });
    await updateDoc(docRef, updateData);
    console.log('✅ Firebase booking status updated successfully');
  } catch (error) {
    console.error('❌ Error updating booking status in Firebase:', error);
    console.warn('🎭 Falling back to mock data');
    return updateBookingStatusMock(bookingId, status, discountData);
  }
};

export const updateBooking = async (bookingId, updateData) => {
  if (shouldUseMock()) {
    return updateBookingMock(bookingId, updateData);
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const dataToUpdate = { ...updateData };
    
    // Convert startTime to Timestamp if provided
    if (dataToUpdate.startTime) {
      dataToUpdate.startTime = Timestamp.fromDate(new Date(dataToUpdate.startTime));
    }
    
    await updateDoc(bookingRef, {
      ...dataToUpdate,
      updatedAt: Timestamp.now()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating booking:', error);
    return updateBookingMock(bookingId, updateData);
  }
};

// Get booking by ID
export const getBookingById = async (bookingId) => {
  if (shouldUseMock()) {
    return getBookingByIdMock(bookingId);
  }
  
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const docSnap = await getDoc(bookingRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        startTime: docSnap.data().startTime?.toDate()
      };
    }
    return null;
  } catch (error) {
    return getBookingByIdMock(bookingId);
  }
};

// Configuration
export const getConfig = async () => {
  if (shouldUseMock()) {
    return getConfigMock();
  }
  
  try {
    const docRef = doc(db, 'config', 'global');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      // Return default config if not exists
      return {
        commissionRate: 0.4,
        insuranceMin: 500
      };
    }
  } catch (error) {
    console.error('Error getting config:', error);
    console.warn('Falling back to mock data');
    return getConfigMock();
  }
};

// ==============================
// CUSTOMER FUNCTIONS
// ==============================

// Get customer by phone
export const getCustomerByPhone = async (phone) => {
  console.log('🔍 getCustomerByPhone called with phone:', phone);
  console.log('🔍 shouldUseMock():', shouldUseMock());
  
  if (shouldUseMock()) {
    console.log('🎭 Using MOCK data for getCustomerByPhone');
    return getCustomerByPhoneMock(phone);
  }

  console.log('🔥 Using FIREBASE for getCustomerByPhone');
  try {
    const customerDoc = await getDoc(doc(db, 'customers', phone));
    console.log('🔍 Firebase customerDoc exists:', customerDoc.exists());
    
    if (customerDoc.exists()) {
      const result = { phone, ...customerDoc.data() };
      console.log('✅ Found customer in Firebase:', result);
      return result;
    }
    console.log('❌ No customer found in Firebase for phone:', phone);
    return null;
  } catch (error) {
    console.error('❌ Firebase error in getCustomerByPhone:', error);
    console.log('🎭 Falling back to mock due to error');
    return handleFirebaseError(error, getCustomerByPhoneMock, phone);
  }
};

// Add or update customer (upsert)
export const upsertCustomer = async (customerData) => {
  console.log('🔧 upsertCustomer called with:', customerData);
  console.log('🔧 shouldUseMock():', shouldUseMock());
  console.log('🔧 Firebase db object:', !!db);
  console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
  console.log('🔧 NEXT_PUBLIC_USE_MOCK:', process.env.NEXT_PUBLIC_USE_MOCK);
  
  if (shouldUseMock()) {
    console.log('🎭 Using MOCK data for upsertCustomer');
    return upsertCustomerMock(customerData);
  }

  console.log('🔥 Using FIREBASE for upsertCustomer');
  try {
    const { phone, ...data } = customerData;
    
    // Get existing customer
    const existingCustomer = await getCustomerByPhone(phone);
    console.log('🔍 Existing customer from Firebase:', existingCustomer);
    
    const customerDoc = {
      ...data,
      phone,
      totalVisits: existingCustomer ? existingCustomer.totalVisits + 1 : 1,
      lastVisit: Timestamp.now(),
      updatedAt: Timestamp.now(),
      // Only include preferredChannel if it has a valid value
      ...(data.preferredChannel ? { preferredChannel: data.preferredChannel } : 
         existingCustomer?.preferredChannel ? { preferredChannel: existingCustomer.preferredChannel } : {}),
      ...(existingCustomer ? {} : { createdAt: Timestamp.now() })
    };

    console.log('📝 Saving to Firebase customers collection:', customerDoc);
    await setDoc(doc(db, 'customers', phone), customerDoc);
    
    const result = { phone, ...customerDoc };
    console.log('✅ Firebase save successful:', result);
    return result;
  } catch (error) {
    console.error('❌ Firebase error in upsertCustomer:', error);
    console.log('🎭 Falling back to mock due to error');
    return handleFirebaseError(error, upsertCustomerMock, customerData);
  }
};

// Get all customers
export const getCustomers = async () => {
  if (shouldUseMock()) {
    return getCustomersMock();
  }

  try {
    const snapshot = await getDocs(collection(db, 'customers'));
    return snapshot.docs.map(doc => ({
      phone: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    return handleFirebaseError(error, getCustomersMock);
  }
};

// Get bookings by date range
export const getBookingsByDateRange = async (startDate, endDate) => {
  if (shouldUseMock()) {
    return getBookingsByDateRangeMock(startDate, endDate);
  }
  
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(
      bookingsRef,
      where('startTime', '>=', Timestamp.fromDate(startDate)),
      where('startTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('startTime', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate()
    }));
  } catch (error) {
    console.error('Error getting bookings by date range:', error);
    return getBookingsByDateRangeMock(startDate, endDate);
  }
};

// Get bookings by specific date
export const getBookingsByDate = async (date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getBookingsByDateRange(startOfDay, endOfDay);
};

// Get monthly revenue
export const getMonthlyRevenue = async (year, month) => {
  if (shouldUseMock()) {
    return getMonthlyRevenueMock(year, month);
  }
  
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    const bookings = await getBookingsByDateRange(startOfMonth, endOfMonth);
    const services = await getServices();
    
    const completedBookings = bookings.filter(b => b.status === 'done');
    const totalRevenue = completedBookings.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      return sum + (service?.priceByDuration?.[booking.duration] || 0);
    }, 0);
    
    return {
      year,
      month,
      totalBookings: bookings.length,
      completedBookings: completedBookings.length,
      totalRevenue,
      dailyBreakdown: getDailyBreakdown(completedBookings, services, year, month)
    };
  } catch (error) {
    console.error('Error getting monthly revenue:', error);
    return getMonthlyRevenueMock(year, month);
  }
};

// Helper function for daily breakdown
const getDailyBreakdown = (bookings, services, year, month) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dailyData = {};
  
  for (let day = 1; day <= daysInMonth; day++) {
    dailyData[day] = { bookings: 0, revenue: 0 };
  }
  
  bookings.forEach(booking => {
    const bookingDate = new Date(booking.startTime);
    if (bookingDate.getFullYear() === year && bookingDate.getMonth() === month - 1) {
      const day = bookingDate.getDate();
      const service = services.find(s => s.id === booking.serviceId);
      const revenue = service?.priceByDuration?.[booking.duration] || 0;
      
      dailyData[day].bookings += 1;
      dailyData[day].revenue += revenue;
    }
  });
  
  return dailyData;
};

// ==============================
// USER MANAGEMENT FUNCTIONS
// ==============================

// Get all users with their metadata
export const getAllUsers = async () => {
  if (shouldUseMock()) {
    // Return mock users data
    return [
      {
        uid: 'admin-001',
        email: 'admin@sabai.com',
        displayName: 'Administrator',
        role: 'admin',
        createdAt: new Date('2024-01-15T08:00:00'),
        lastSignIn: new Date('2025-01-26T10:30:00'),
        photoURL: null
      },
      {
        uid: 'user-001',
        email: 'user1@example.com',
        displayName: 'John Doe',
        role: 'viewer',
        createdAt: new Date('2024-03-20T14:15:00'),
        lastSignIn: new Date('2025-01-25T16:45:00'),
        photoURL: null
      },
      {
        uid: 'user-002',
        email: 'user2@example.com',
        displayName: 'Jane Smith',
        role: 'viewer',
        createdAt: new Date('2024-05-10T09:30:00'),
        lastSignIn: new Date('2025-01-24T11:20:00'),
        photoURL: null
      }
    ];
  }

  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(
      query(usersRef, orderBy('createdAt', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastSignIn: doc.data().lastSignIn?.toDate()
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    // Fallback to mock data
    return getAllUsers();
  }
};

// Update user role
export const updateUserRole = async (uid, role) => {
  if (shouldUseMock()) {
    console.log(`Mock: Updated user ${uid} role to ${role}`);
    return true;
  }

  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      role,
      updatedAt: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
};

// Create or update user metadata
export const upsertUserMetadata = async (userData) => {
  if (shouldUseMock()) {
    console.log('Mock: Upsert user metadata:', userData);
    return true;
  }

  try {
    const { uid, ...data } = userData;
    const userRef = doc(db, 'users', uid);
    
    await setDoc(userRef, {
      ...data,
      updatedAt: Timestamp.now(),
      lastSignIn: Timestamp.now()
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error upserting user metadata:', error);
    throw error;
  }
};
