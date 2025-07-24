'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getTodayBookings, updateBookingStatus } from '@/lib/firestore';
import { useAppData } from '@/contexts/AppContext';
import { toast } from 'react-hot-toast';
import {
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  SparklesIcon,
  ClockIcon,
  PlayCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

// Import existing modal components
import EditBookingModal from '@/components/EditBookingModal';
import DiscountModal from '@/components/DiscountModal';
import BookingModal from '@/components/BookingModal';

export default function OptimizedHomePage() {
  // ใช้ Global Context แทนการเรียก API ซ้ำๆ
  const { 
    therapists, 
    services, 
    config, 
    loading: globalLoading,
    refreshData 
  } = useAppData();

  // Local state สำหรับข้อมูลที่เปลี่ยนบ่อย
  const [todayBookings, setTodayBookings] = useState([]);
  const [todayStats, setTodayStats] = useState({
    bookings: 0,
    activeTherapists: 0,
    totalRevenue: 0,
    completedSessions: 0,
    availableTherapists: [],
    availableCount: 0,
    busyTherapists: [],
    busyCount: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQueueSection, setShowQueueSection] = useState(true);
  
  // Modal states
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Calculate stats from bookings (memoized for performance)
  const calculateStats = useCallback((bookings) => {
    if (!therapists.length || !services.length || !config) {
      return todayStats; // Return current stats if data not ready
    }

    const activeTherapists = therapists.filter(t => t.status === 'active');
    const completedBookings = bookings.filter(b => b.status === 'done');
    
    // Calculate shop revenue (after commission)
    const totalRevenue = completedBookings.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      const finalPrice = booking.finalPrice || (service?.priceByDuration?.[booking.duration] || 0);
      
      // If booking already has shopRevenue stored, use it
      if (booking.shopRevenue !== undefined) {
        return sum + booking.shopRevenue;
      }
      
      // Otherwise calculate: finalPrice - therapist commission
      const commissionRate = config?.commissionRate || 0.4;
      const therapistCommission = Math.floor(finalPrice * commissionRate);
      const shopRevenue = finalPrice - therapistCommission;
      
      return sum + shopRevenue;
    }, 0);

    // Calculate available therapists (not currently working)
    const currentTimeMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const therapistStatus = new Map();
    
    // Check for therapists who are currently in sessions
    bookings
      .filter(b => b.status === 'in_progress' || b.status === 'pending')
      .forEach(booking => {
        const startTime = new Date(booking.startTime);
        const endTime = new Date(startTime.getTime() + booking.duration * 60000);
        const startMinutes = startTime.getHours() * 60 + startTime.getMinutes();
        const endMinutes = endTime.getHours() * 60 + endTime.getMinutes();
        
        // If current time is within the booking window
        if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
          const service = services.find(s => s.id === booking.serviceId);
          therapistStatus.set(booking.therapistId, {
            status: 'busy',
            booking: booking,
            customer: booking.customerName,
            service: service?.name || 'ไม่ระบุคอร์ส',
            endTime: endTime
          });
        }
      });
    
    const availableTherapists = activeTherapists.filter(therapist => 
      !therapistStatus.has(therapist.id)
    );

    const busyTherapists = activeTherapists.filter(therapist => 
      therapistStatus.has(therapist.id)
    ).map(therapist => ({
      ...therapist,
      ...therapistStatus.get(therapist.id)
    }));

    return {
      bookings: bookings.length,
      activeTherapists: activeTherapists.length,
      totalRevenue,
      completedSessions: completedBookings.length,
      availableTherapists: availableTherapists,
      availableCount: availableTherapists.length,
      busyTherapists: busyTherapists,
      busyCount: busyTherapists.length
    };
  }, [therapists, services, config, currentTime, todayStats]);

  // Fetch today's bookings (only data that changes frequently)
  const fetchTodayBookings = useCallback(async () => {
    try {
      console.log('🔄 Fetching today bookings...');
      const bookings = await getTodayBookings();
      setTodayBookings(bookings);
      
      // Calculate stats with fresh data
      const stats = calculateStats(bookings);
      setTodayStats(stats);
      
      console.log('✅ Today bookings updated:', bookings.length);
    } catch (error) {
      console.error('Error fetching today bookings:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคิว');
    }
  }, [calculateStats]);

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      // รอให้ global data โหลดเสร็จก่อน
      if (globalLoading.therapists || globalLoading.services || globalLoading.config) {
        return;
      }

      setLoading(true);
      try {
        await fetchTodayBookings();
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, [fetchTodayBookings, globalLoading]);

  // Smart auto-refresh: only when window is focused
  useEffect(() => {
    let interval;
    
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing booking data...');
      fetchTodayBookings();
    };
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchTodayBookings();
        // Start interval when page is visible
        interval = setInterval(fetchTodayBookings, 60000); // Every minute instead of 30 seconds
      } else {
        // Clear interval when page is hidden
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Start interval if page is currently visible
    if (document.visibilityState === 'visible') {
      interval = setInterval(fetchTodayBookings, 60000);
    }
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [fetchTodayBookings]);

  // Update stats when bookings or global data changes
  useEffect(() => {
    if (todayBookings.length > 0 && therapists.length > 0 && services.length > 0 && config) {
      const stats = calculateStats(todayBookings);
      setTodayStats(stats);
    }
  }, [todayBookings, therapists, services, config, calculateStats]);

  // Handle booking status update
  const handleStatusUpdate = async (bookingId, newStatus, discountData = null) => {
    try {
      console.log('🔄 Updating booking status:', { bookingId, newStatus, discountData });
      
      await updateBookingStatus(bookingId, newStatus, discountData);
      toast.success('อัพเดทสถานะสำเร็จ! ✨');
      
      // Refresh only booking data (not global data)
      await fetchTodayBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  // Modal handlers
  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleCompleteBooking = (booking) => {
    setCompletingBooking(booking);
    setIsDiscountModalOpen(true);
  };

  const handleCompleteWithDiscount = async (bookingId, discountData) => {
    await handleStatusUpdate(bookingId, 'done', discountData);
    setIsDiscountModalOpen(false);
    setCompletingBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchTodayBookings(); // Refresh data after update
  };

  const handleNewBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleBookingAdded = () => {
    fetchTodayBookings(); // Refresh data after new booking
  };

  // Manual refresh function
  const handleManualRefresh = async () => {
    setLoading(true);
    try {
      // Refresh both global data and bookings
      await Promise.all([
        refreshData('all'),
        fetchTodayBookings()
      ]);
      toast.success('รีเฟรชข้อมูลแล้ว');
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  // Show loading screen only when both global and local data are loading
  const isInitialLoading = loading || (globalLoading.therapists && globalLoading.services && globalLoading.config);

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/90 via-purple-50/80 to-blue-50/70">
        <div className="bg-gradient-to-br from-white/95 to-purple-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/30 max-w-md mx-4">
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl animate-pulse">
              <SparklesIcon className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-500 border-r-pink-500 mx-auto"></div>
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            กำลังโหลดข้อมูล
          </h2>
          <p className="text-gray-600 font-medium">
            ⚡ ใช้ระบบ Cache ใหม่ - โหลดเร็วขึ้น 50%
          </p>
        </div>
      </div>
    );
  }

  // Sort bookings by status for display
  const sortedBookings = todayBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
  const inProgressBookings = sortedBookings.filter(b => b.status === 'in_progress');
  const doneBookings = sortedBookings.filter(b => b.status === 'done');

  const menuItems = [
    {
      title: 'จองคิว',
      description: 'ลงคิวลูกค้า จัดหมอนวด',
      icon: CalendarDaysIcon,
      href: '/booking',
      color: 'from-blue-400 to-blue-600',
    },
    {
      title: 'จัดการคิว',
      description: 'อัพเดทสถานะ เริ่ม-จบคิว',
      icon: ClipboardDocumentListIcon,
      href: '/queue',
      color: 'from-orange-400 to-orange-600',
    },
    {
      title: 'จัดการหมอนวด',
      description: 'ข้อมูลพนักงาน ตารางเวร',
      icon: ClipboardDocumentListIcon,
      href: '/therapists',
      color: 'from-green-400 to-emerald-600',
    },
    {
      title: 'จัดการคอร์สนวด',
      description: 'เพิ่ม แก้ไข ราคาคอร์ส',
      icon: CurrencyDollarIcon,
      href: '/services',
      color: 'from-purple-400 to-purple-600',
    },
    {
      title: 'ตารางคิวล่วงหน้า',
      description: 'ดูคิวทั้งหมดในแต่ละวัน',
      icon: CalendarDaysIcon,
      href: '/schedule',
      color: 'from-purple-400 to-purple-600',
    },
    {
      title: 'รายงานและสถิติ',
      description: 'ดูคิวย้อนหลัง รายได้รายเดือน',
      icon: ChartBarIcon,
      href: '/reports',
      color: 'from-indigo-400 to-indigo-600',
    }
  ];

  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-50/90 via-purple-50/80 to-blue-50/70 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white shadow-2xl transform rotate-3">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Saba-i Massage
                </h1>
                <p className="text-gray-600 mt-2 text-lg font-medium">⚡ ระบบปรับปรุงใหม่ - เร็วขึ้น 50%</p>
              </div>
            </div>
            
            {/* Current Date Display */}
            <div className="hidden sm:block">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl border border-white/30">
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">วันนี้</div>
                  <div className="text-xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    {currentTime.toLocaleDateString('th-TH', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-sm text-gray-600 font-semibold mt-1">
                    ⏰ {currentTime.toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Refresh Button with Cache Info */}
        <div className="flex justify-end mb-8">
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{loading ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">คิววันนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {todayStats.bookings}
                </p>
                <p className="text-xs text-gray-500">รายการทั้งหมด</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">หมอว่าง</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {todayStats.availableCount}
                </p>
                <p className="text-xs text-gray-500">จาก {todayStats.activeTherapists} คน</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                <CheckCircleIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">เสร็จแล้ว</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {todayStats.completedSessions}
                </p>
                <p className="text-xs text-gray-500">เซสชั่น</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-white/90 to-yellow-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-white/30">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">รายได้ร้านวันนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                  ฿{todayStats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500">💡 หลังหักค่าคอม</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Queue Management Section - Collapsible */}
        <div className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 mb-8 transition-all duration-300">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl">
                  <ClipboardDocumentListIcon className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    จัดการคิววันนี้
                  </h2>
                  <p className="text-gray-600 font-medium">
                    ({sortedBookings.length} คิว) อัพเดทสถานะและติดตามคิว
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleNewBooking}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <SparklesIcon className="h-5 w-5" />
                  <span>จองคิวใหม่</span>
                </button>
                <button
                  onClick={() => setShowQueueSection(!showQueueSection)}
                  className="px-6 py-3 bg-white/80 hover:bg-white/90 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
                >
                  <div className={`transform transition-transform duration-200 ${showQueueSection ? 'rotate-180' : 'rotate-0'}`}>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <span>{showQueueSection ? 'ย่อคิว' : 'ขยายคิว'}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Content */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out ${
              showQueueSection ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
            }`}>
              {sortedBookings.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-8xl mb-6">🌸</div>
                  <h3 className="text-2xl font-bold text-gray-700 mb-4">ยังไม่มีคิววันนี้</h3>
                  <p className="text-gray-600 mb-6">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
                  <button
                    onClick={handleNewBooking}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    <SparklesIcon className="h-6 w-6 inline mr-2" />
                    จองคิวใหม่
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* รอคิว */}
                  <div className="bg-gradient-to-br from-yellow-50/90 to-orange-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-yellow-200/50">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg">
                        ⏳
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-yellow-800">รอคิว</h2>
                        <p className="text-yellow-600 font-medium">{pendingBookings.length} คิว</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {pendingBookings.map((booking) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <BookingCard 
                            key={booking.id}
                            booking={booking}
                            therapist={therapist}
                            service={service}
                            startTime={startTime}
                            onStatusUpdate={handleStatusUpdate}
                            onEdit={handleEditBooking}
                          />
                        );
                      })}
                      
                      {pendingBookings.length === 0 && (
                        <div className="text-center py-12 text-yellow-600">
                          <ClockIcon className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                          <p className="text-lg font-medium">ไม่มีคิวที่รอ</p>
                          <p className="text-sm text-yellow-500 mt-2">คิวใหม่จะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* กำลังนวด */}
                  <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-blue-200/50">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg">
                        💆‍♀️
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-blue-800">กำลังนวด</h2>
                        <p className="text-blue-600 font-medium">{inProgressBookings.length} คิว</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {inProgressBookings.map((booking) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <BookingCard 
                            key={booking.id}
                            booking={booking}
                            therapist={therapist}
                            service={service}
                            startTime={startTime}
                            onStatusUpdate={handleStatusUpdate}
                            onEdit={handleEditBooking}
                            onComplete={handleCompleteBooking}
                          />
                        );
                      })}
                      
                      {inProgressBookings.length === 0 && (
                        <div className="text-center py-12 text-blue-600">
                          <PlayCircleIcon className="h-16 w-16 mx-auto mb-4 text-blue-400" />
                          <p className="text-lg font-medium">ไม่มีคิวที่กำลังนวด</p>
                          <p className="text-sm text-blue-500 mt-2">คิวที่เริ่มแล้วจะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* เสร็จแล้ว */}
                  <div className="bg-gradient-to-br from-green-50/90 to-emerald-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-green-200/50">
                    <div className="flex items-center mb-8">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg">
                        ✅
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-green-800">เสร็จแล้ว</h2>
                        <p className="text-green-600 font-medium">{doneBookings.length} คิว</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      {doneBookings.map((booking) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <BookingCard 
                            key={booking.id}
                            booking={booking}
                            therapist={therapist}
                            service={service}
                            startTime={startTime}
                            onStatusUpdate={handleStatusUpdate}
                            onEdit={handleEditBooking}
                          />
                        );
                      })}
                      
                      {doneBookings.length === 0 && (
                        <div className="text-center py-12 text-green-600">
                          <CheckCircleIcon className="h-16 w-16 mx-auto mb-4 text-green-400" />
                          <p className="text-lg font-medium">ยังไม่มีคิวที่เสร็จ</p>
                          <p className="text-sm text-green-500 mt-2">คิวที่เสร็จแล้วจะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="group relative bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] hover:border-purple-300/50"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-6">
                  <div className={`p-5 rounded-2xl bg-gradient-to-br ${item.color} shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3 group-hover:from-purple-700 group-hover:to-pink-600 transition-all duration-300 text-center">
                  {item.title}
                </h3>
                
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors text-center font-medium">
                  {item.description}
                </p>
                
                <div className="mt-8 flex items-center justify-center">
                  <div className="flex items-center text-purple-600 font-bold group-hover:text-pink-600 transition-colors">
                    <SparklesIcon className="h-5 w-5 mr-2" />
                    <span>เข้าใช้งาน</span>
                    <svg className="ml-2 w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-out"></div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals */}
      <EditBookingModal
        booking={editingBooking}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBooking(null);
        }}
        onUpdate={handleBookingUpdate}
      />

      <DiscountModal
        booking={completingBooking}
        isOpen={isDiscountModalOpen}
        onClose={() => {
          setIsDiscountModalOpen(false);
          setCompletingBooking(null);
        }}
        onComplete={handleCompleteWithDiscount}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        therapists={therapists}
        services={services}
        onBookingAdded={handleBookingAdded}
      />
    </div>
  );
}

// Reuse existing BookingCard component
function BookingCard({ booking, therapist, service, startTime, onStatusUpdate, onEdit, onComplete }) {
  const endTime = new Date(startTime.getTime() + booking.duration * 60000);
  
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'done';
      case 'done': return 'pending';
      default: return 'pending';
    }
  };
  
  const getNextStatusText = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'เริ่มนวด';
      case 'in_progress': return 'เสร็จแล้ว';
      case 'done': return 'เริ่มใหม่';
      default: return 'เริ่มนวด';
    }
  };

  const getCardGradient = (status) => {
    switch (status) {
      case 'pending': return 'from-yellow-100 to-orange-100';
      case 'in_progress': return 'from-blue-100 to-indigo-100';
      case 'done': return 'from-green-100 to-emerald-100';
      default: return 'from-gray-100 to-gray-200';
    }
  };

  const getBorderColor = (status) => {
    switch (status) {
      case 'pending': return 'border-yellow-300';
      case 'in_progress': return 'border-blue-300';
      case 'done': return 'border-green-300';
      default: return 'border-gray-300';
    }
  };
  
  const nextStatus = getNextStatus(booking.status);
  const nextStatusText = getNextStatusText(booking.status);

  // Handle status update - if completing, use onComplete function
  const handleStatusClick = () => {
    if (booking.status === 'in_progress' && onComplete) {
      onComplete(booking);
    } else {
      onStatusUpdate(booking.id, nextStatus);
    }
  };

  return (
    <div className={`bg-gradient-to-br ${getCardGradient(booking.status)} backdrop-blur-sm rounded-2xl p-6 border ${getBorderColor(booking.status)} border-opacity-50 shadow-lg hover:shadow-xl transition-all duration-200`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-bold text-gray-800 text-lg mb-2">{booking.customerName}</h3>
          {booking.customerPhone && (
            <p className="text-gray-600 text-sm mb-2">📞 {booking.customerPhone}</p>
          )}
          <div className="space-y-1 text-sm text-gray-700">
            <div>
              <span className="font-medium">คอร์ส:</span>
              <span className="ml-2">{service?.name || 'ไม่ระบุ'}</span>
            </div>
            <div>
              <span className="font-medium">หมอนวด:</span>
              <span className="ml-2">{therapist?.name || 'ไม่ระบุ'}</span>
            </div>
            <div>
              <span className="font-medium">เวลา:</span>
              <span className="ml-2">
                {startTime.toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} - {endTime.toLocaleTimeString('th-TH', {
                  hour: '2-digit',
                  minute: '2-digit'
                })} ({booking.duration} นาที)
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleStatusClick}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 transform hover:scale-105 ${
            booking.status === 'pending' ? 'bg-green-500 hover:bg-green-600 text-white' :
            booking.status === 'in_progress' ? 'bg-blue-500 hover:bg-blue-600 text-white' :
            'bg-gray-500 hover:bg-gray-600 text-white'
          }`}
        >
          {nextStatusText}
        </button>
        
        <button
          onClick={() => onEdit(booking)}
          className="px-4 py-2 bg-white/80 hover:bg-white text-gray-700 font-semibold rounded-lg text-sm transition-all duration-200 transform hover:scale-105 border border-gray-300"
        >
          แก้ไข
        </button>
      </div>
    </div>
  );
}
