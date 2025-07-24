'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, updateBookingStatus, getConfig } from '@/lib/firestore';
import { CalendarDaysIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, ChartBarIcon, UserGroupIcon, SparklesIcon, ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, PlayCircleIcon, PencilIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import EditBookingModal from '@/components/EditBookingModal';
import DiscountModal from '@/components/DiscountModal';
import BookingModal from '@/components/BookingModal';

export default function HomePage() {
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
  const [showTodayBookings, setShowTodayBookings] = useState(false);
  const [showAvailableTherapists, setShowAvailableTherapists] = useState(false);
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  const [todayBookings, setTodayBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Queue management states
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showQueueSection, setShowQueueSection] = useState(true);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookings, therapists, services, config] = await Promise.all([
          getTodayBookings(),
          getTherapists(),
          getServices(),
          getConfig()
        ]);

        const activeTherapists = therapists.filter(t => t.status === 'active');
        const completedBookings = bookings.filter(b => b.status === 'done');
        
        // Calculate shop revenue (after commission)
        const totalRevenue = completedBookings.reduce((sum, booking) => {
          const service = services.find(s => s.id === booking.serviceId);
          const finalPrice = booking.finalPrice || (service?.priceByDuration?.[booking.duration] || 0);
          const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
          
          // If booking already has shopRevenue stored, use it
          if (booking.shopRevenue !== undefined) {
            return sum + booking.shopRevenue;
          }
          
          // ✅ แก้ไข: คำนวณค่าคอมจากราคาเต็ม ไม่ใช่ราคาหลังลด
          const commissionRate = config?.commissionRate || 0.4;
          const therapistCommission = Math.floor(originalPrice * commissionRate);
          const shopRevenue = finalPrice - therapistCommission;
          
          return sum + shopRevenue;
        }, 0);

        // Calculate available therapists (not currently working)
        const currentTime = new Date();
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

        setTodayStats({
          bookings: bookings.length,
          activeTherapists: activeTherapists.length,
          totalRevenue,
          completedSessions: completedBookings.length,
          availableTherapists: availableTherapists,
          availableCount: availableTherapists.length,
          busyTherapists: busyTherapists,
          busyCount: busyTherapists.length
        });

        setTodayBookings(bookings);
        setTherapists(therapists);
        setServices(services);
        
        // Debug logging
        console.log('🔄 Fetched dashboard data:', {
          bookings: bookings.length,
          bookingStatuses: bookings.map(b => ({ id: b.id, status: b.status, customer: b.customerName }))
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    
    // Refresh when window gains focus (กลับมาจากหน้าอื่น)
    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing dashboard data...');
      fetchDashboardData();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Queue management functions
  const fetchDashboardData = async () => {
    try {
      const [bookings, therapists, services, config] = await Promise.all([
        getTodayBookings(),
        getTherapists(),
        getServices(),
        getConfig()
      ]);

      const activeTherapists = therapists.filter(t => t.status === 'active');
      const completedBookings = bookings.filter(b => b.status === 'done');
      
      // Calculate shop revenue (after commission)
      const totalRevenue = completedBookings.reduce((sum, booking) => {
        const service = services.find(s => s.id === booking.serviceId);
        const finalPrice = booking.finalPrice || (service?.priceByDuration?.[booking.duration] || 0);
        const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
        
        // If booking already has shopRevenue stored, use it
        if (booking.shopRevenue !== undefined) {
          return sum + booking.shopRevenue;
        }
        
        // ✅ แก้ไข: คำนวณค่าคอมจากราคาเต็ม ไม่ใช่ราคาหลังลด
        const commissionRate = config?.commissionRate || 0.4;
        const therapistCommission = Math.floor(originalPrice * commissionRate);
        const shopRevenue = finalPrice - therapistCommission;
        
        return sum + shopRevenue;
      }, 0);

      // Calculate available therapists (not currently working)
      const currentTime = new Date();
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

      setTodayStats({
        bookings: bookings.length,
        activeTherapists: activeTherapists.length,
        totalRevenue,
        completedSessions: completedBookings.length,
        availableTherapists: availableTherapists,
        availableCount: availableTherapists.length,
        busyTherapists: busyTherapists,
        busyCount: busyTherapists.length
      });

      setTodayBookings(bookings);
      setTherapists(therapists);
      setServices(services);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, discountData = null) => {
    try {
      console.log('🔄 Updating booking status:', { bookingId, newStatus, discountData });
      
      await updateBookingStatus(bookingId, newStatus, discountData);
      toast.success('อัพเดทสถานะสำเร็จ! ✨');
      
      console.log('✅ Status updated successfully, refreshing data...');
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchDashboardData(); // Refresh data after update
  };

  const handleCompleteBooking = (booking) => {
    setCompletingBooking(booking);
    setIsDiscountModalOpen(true);
  };

  const handleDiscountModalClose = () => {
    setIsDiscountModalOpen(false);
    setCompletingBooking(null);
  };

  const handleCompleteWithDiscount = async (bookingId, discountData) => {
    await handleStatusUpdate(bookingId, 'done', discountData);
    setIsDiscountModalOpen(false);
    setCompletingBooking(null);
  };

  const handleNewBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleBookingModalClose = () => {
    setIsBookingModalOpen(false);
  };

  const handleBookingAdded = () => {
    fetchDashboardData(); // Refresh data after new booking
  };

  const menuItems = [
    {
      title: 'จองคิว',
      description: 'ลงคิวลูกค้า จัดหมอนวด',
      icon: CalendarDaysIcon,
      href: '/booking',
      color: 'from-blue-400 to-blue-600',
      bgPattern: 'bg-gradient-to-br from-blue-50 to-blue-100'
    },
    {
      title: 'จัดการคิว',
      description: 'อัพเดทสถานะ เริ่ม-จบคิว',
      icon: ClipboardDocumentListIcon,
      href: '/queue',
      color: 'from-orange-400 to-orange-600',
      bgPattern: 'bg-gradient-to-br from-orange-50 to-orange-100'
    },
    {
      title: 'จัดการหมอนวด',
      description: 'ข้อมูลพนักงาน ตารางเวร',
      icon: ClipboardDocumentListIcon,
      href: '/therapists',
      color: 'from-green-400 to-emerald-600',
      bgPattern: 'bg-gradient-to-br from-green-50 to-emerald-100'
    },
    {
      title: 'จัดการคอร์สนวด',
      description: 'เพิ่ม แก้ไข ราคาคอร์ส',
      icon: CurrencyDollarIcon,
      href: '/services',
      color: 'from-purple-400 to-purple-600',
      bgPattern: 'bg-gradient-to-br from-purple-50 to-purple-100'
    },
    {
      title: 'ตารางคิวล่วงหน้า',
      description: 'ดูคิวทั้งหมดในแต่ละวัน',
      icon: CalendarDaysIcon,
      href: '/schedule',
      color: 'from-purple-400 to-purple-600',
      bgPattern: 'bg-gradient-to-br from-purple-50 to-purple-100'
    },
    {
      title: 'รายงานและสถิติ',
      description: 'ดูคิวย้อนหลัง รายได้รายเดือน',
      icon: ChartBarIcon,
      href: '/reports',
      color: 'from-indigo-400 to-indigo-600',
      bgPattern: 'bg-gradient-to-br from-indigo-50 to-indigo-100'
    },
    {
      title: 'Dashboard',
      description: 'รายงานยอด สรุปรายได้',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard',
      color: 'from-indigo-400 to-indigo-600',
      bgPattern: 'bg-gradient-to-br from-indigo-50 to-indigo-100'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50/90 via-purple-50/80 to-blue-50/70">
        <div className="bg-gradient-to-br from-white/95 to-purple-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-white/30 max-w-md mx-4">
          {/* Animated Logo */}
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center shadow-2xl animate-pulse">
              <SparklesIcon className="h-10 w-10 text-white" />
            </div>
            {/* Floating particles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-pink-400 rounded-full animate-bounce delay-0 absolute -top-2 -left-2"></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce delay-75 absolute -bottom-1 -right-1"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-150 absolute top-1 right-4"></div>
            </div>
          </div>
          
          {/* Loading Spinner */}
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-500 border-r-pink-500 mx-auto"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-b-blue-500 border-l-purple-300 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            กำลังโหลดข้อมูล
          </h2>
          <p className="text-gray-600 font-medium">
            <SparklesIcon className="h-4 w-4 inline mr-1" />
            กรุณารอสักครู่...
          </p>
          
          {/* Progress dots */}
          <div className="flex justify-center space-x-2 mt-6">
            <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse delay-75"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse delay-150"></div>
          </div>
        </div>
      </div>
    );
  }

  // Sort bookings by start time
  const sortedBookings = todayBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  // Group by status
  const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
  const inProgressBookings = sortedBookings.filter(b => b.status === 'in_progress');
  const doneBookings = sortedBookings.filter(b => b.status === 'done');

  // Debug logging
  console.log('📊 Dashboard Booking Status:', {
    total: sortedBookings.length,
    pending: pendingBookings.length,
    inProgress: inProgressBookings.length,
    done: doneBookings.length,
    allBookings: sortedBookings.map(b => ({ id: b.id, status: b.status, customer: b.customerName }))
  });

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
                <p className="text-gray-600 mt-2 text-lg font-medium">✨ ระบบจัดการร้านนวดไทย</p>
              </div>
            </div>
            
            {/* Current Date Display */}
            <div className="flex items-center">
              {/* Desktop Version */}
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
              
              {/* Mobile Version */}
              <div className="sm:hidden">
                <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-white/30">
                  <div className="text-right">
                    <div className="text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {currentTime.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">
                      {currentTime.toLocaleTimeString('th-TH', {
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
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Refresh Button */}
        <div className="flex justify-end mb-8">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const [bookings, therapists, services, config] = await Promise.all([
                  getTodayBookings(),
                  getTherapists(),
                  getServices(),
                  getConfig()
                ]);

                const activeTherapists = therapists.filter(t => t.status === 'active').length;
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

                setTodayStats({
                  bookings: bookings.length,
                  activeTherapists,
                  totalRevenue,
                  completedSessions: completedBookings.length
                });

                setTodayBookings(bookings);
                setTherapists(therapists);
                setServices(services);
                
                toast.success('รีเฟรชข้อมูลแล้ว');
              } catch (error) {
                console.error('Error refreshing data:', error);
                toast.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
              } finally {
                setLoading(false);
              }
            }}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>รีเฟรชข้อมูล</span>
          </button>
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
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      

          <div 
            className="glass-stat p-6 cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => setShowRevenueDetails(!showRevenueDetails)}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">รายได้ร้านวันนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                  ฿{todayStats.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-yellow-600 font-medium">คลิกเพื่อดูรายละเอียด</p>
                  <p className="text-xs text-gray-500">💡 หลังหักค่าคอม</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Bookings Modal/Section */}
        {showTodayBookings && (
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  📅
                </div>
                <h2 className="text-2xl font-bold text-gray-800">คิววันนี้ ({todayBookings.length} คิว)</h2>
              </div>
              <button
                onClick={() => setShowTodayBookings(false)}
                className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
              >
                ✕
              </button>
            </div>
            
            {todayBookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📅</div>
                <p className="text-gray-500 text-lg">ยังไม่มีคิววันนี้</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings
                  .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                  .map((booking) => {
                    const therapist = therapists.find(t => t.id === booking.therapistId);
                    const service = services.find(s => s.id === booking.serviceId);
                    const startTime = new Date(booking.startTime);
                    const endTime = new Date(startTime.getTime() + booking.duration * 60000);
                    
                    return (
                      <div key={booking.id} className="glass p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
                              <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                                booking.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                                booking.status === 'in_progress' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                                'bg-gradient-to-r from-green-400 to-green-500 text-white'
                              }`}>
                                {booking.status === 'pending' ? '⏳ รอคิว' :
                                 booking.status === 'in_progress' ? '💆‍♀️ กำลังนวด' : '✅ เสร็จแล้ว'}
                              </span>
                            </div>
                            {booking.customerPhone && (
                              <p className="text-gray-500 text-sm font-medium mb-2">📞 {booking.customerPhone}</p>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-600">คอร์ส:</span>
                                <span className="ml-2 font-semibold text-gray-800">{service?.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">หมอนวด:</span>
                                <span className="ml-2 font-semibold text-gray-800">{therapist?.name}</span>
                              </div>
                              <div>
                                <span className="text-gray-600">เวลา:</span>
                                <span className="ml-2 font-semibold text-gray-800">
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
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Available Therapists Section */}
        {showAvailableTherapists && (
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  👥
                </div>
                <h2 className="text-2xl font-bold text-gray-800">สถานะหมอนวดตอนนี้</h2>
              </div>
              <button
                onClick={() => setShowAvailableTherapists(false)}
                className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
              >
                ✕
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="glass p-4 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white mr-4">
                    ✅
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">หมอที่ว่าง</p>
                    <p className="text-2xl font-bold text-green-600">{todayStats.availableCount} คน</p>
                  </div>
                </div>
              </div>
              
              <div className="glass p-4 bg-gradient-to-r from-orange-50 to-red-50">
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white mr-4">
                    💼
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">หมอที่ไม่ว่าง</p>
                    <p className="text-2xl font-bold text-red-500">{todayStats.busyCount} คน</p>
                  </div>
                </div>
              </div>
            </div>
            
            {todayStats.activeTherapists === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">�‍⚕️</div>
                <p className="text-gray-500 text-lg">ไม่มีหมอนวดที่เข้าเวรวันนี้</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Available Therapists */}
                {todayStats.availableCount > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
                      หมอนวดที่ว่าง ({todayStats.availableCount} คน)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {todayStats.availableTherapists.map((therapist) => (
                        <div key={therapist.id} className="glass p-6 border-l-4 border-green-400">
                          <div className="flex items-center mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold mr-3">
                              💆‍♀️
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800">{therapist.name}</h4>
                              <p className="text-sm text-gray-600">รหัส: {therapist.id}</p>
                            </div>
                          </div>
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-sm font-medium">
                            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                            พร้อมให้บริการ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Busy Therapists */}
                {todayStats.busyCount > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                      <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
                      หมอนวดที่ไม่ว่าง ({todayStats.busyCount} คน)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {todayStats.busyTherapists.map((therapist) => (
                        <div key={therapist.id} className="glass p-6 border-l-4 border-red-400">
                          <div className="flex items-center mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-lg font-bold mr-3">
                              💼
                            </div>
                            <div>
                              <h4 className="font-bold text-gray-800">{therapist.name}</h4>
                              <p className="text-sm text-gray-600">รหัส: {therapist.id}</p>
                            </div>
                          </div>
                          
                          <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg mb-3">
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">ลูกค้า:</span> {therapist.customer}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">คอร์ส:</span> {therapist.service}
                            </p>
                            <p className="text-sm text-gray-700">
                              <span className="font-medium">เสร็จประมาณ:</span> {therapist.endTime.toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-red-100 to-orange-100 text-red-700 text-sm font-medium">
                            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
                            กำลังให้บริการ
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="flex items-center text-sm text-blue-700">
                <div className="w-4 h-4 mr-2">ℹ️</div>
                <p>
                  <span className="font-semibold">หมายเหตุ:</span> ข้อมูลนี้คำนวณจากคิวที่กำลังดำเนินการอยู่ในปัจจุบัน 
                  และอัพเดททุก 30 วินาทีอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Revenue Details Section */}
        {showRevenueDetails && (
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  💰
                </div>
                <h2 className="text-2xl font-bold text-gray-800">รายละเอียดรายได้วันนี้</h2>
              </div>
              <button
                onClick={() => setShowRevenueDetails(false)}
                className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
              >
                ✕
              </button>
            </div>
            
            {todayBookings.filter(b => b.status === 'done').length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">💰</div>
                <p className="text-gray-500 text-lg">ยังไม่มีรายได้วันนี้</p>
              </div>
            ) : (
              <RevenueBreakdown 
                completedBookings={todayBookings.filter(b => b.status === 'done')}
                therapists={therapists}
                services={services}
              />
            )}
          </div>
        )}

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="group relative bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 overflow-hidden transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] hover:border-purple-300/50"
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-100/30 via-pink-50/20 to-blue-100/30 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              
              {/* Floating Elements */}
              <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-purple-300/20 to-pink-300/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-lg group-hover:scale-125 transition-transform duration-500"></div>
              
              <div className="relative z-10">
                {/* Icon Container */}
                <div className="flex items-center justify-center mb-6">
                  <div className={`p-5 rounded-2xl bg-gradient-to-br ${item.color} shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                    <item.icon className="h-10 w-10 text-white" />
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent mb-3 group-hover:from-purple-700 group-hover:to-pink-600 transition-all duration-300 text-center">
                  {item.title}
                </h3>
                
                {/* Description */}
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors text-center font-medium">
                  {item.description}
                </p>
                
                {/* Call to Action */}
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

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-out"></div>
            </Link>
          ))}
        </div>
      </div>

      {/* Modals */}
      <EditBookingModal
        booking={editingBooking}
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onUpdate={handleBookingUpdate}
      />

      <DiscountModal
        booking={completingBooking}
        isOpen={isDiscountModalOpen}
        onClose={handleDiscountModalClose}
        onComplete={handleCompleteWithDiscount}
      />

      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
        therapists={therapists}
        services={services}
        onBookingAdded={handleBookingAdded}
      />
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, therapist, service, startTime, onStatusUpdate, onEdit, onComplete }) {
  const endTime = new Date(startTime.getTime() + booking.duration * 60000);
  
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'done';
      case 'done': return null;
      default: return null;
    }
  };
  
  const getNextStatusText = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return '🚀 เริ่มนวด';
      case 'in_progress': return '✨ เสร็จแล้ว';
      case 'done': return null;
      default: return null;
    }
  };

  const getCardGradient = (status) => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-br from-white/95 to-yellow-50/90';
      case 'in_progress': return 'bg-gradient-to-br from-white/95 to-blue-50/90';
      case 'done': return 'bg-gradient-to-br from-white/95 to-green-50/90';
      default: return 'bg-gradient-to-br from-white/95 to-gray-50/90';
    }
  };

  const getBorderColor = (status) => {
    switch (status) {
      case 'pending': return 'border-l-yellow-400';
      case 'in_progress': return 'border-l-blue-400';
      case 'done': return 'border-l-green-400';
      default: return 'border-l-gray-400';
    }
  };
  
  const nextStatus = getNextStatus(booking.status);
  const nextStatusText = getNextStatusText(booking.status);

  // Handle status update - if completing, use onComplete function
  const handleStatusClick = () => {
    if (booking.status === 'in_progress' && nextStatus === 'done') {
      // Create booking object with service price for discount calculation
      const servicePrice = service?.priceByDuration?.[booking.duration] || 0;
      const bookingWithPrice = {
        ...booking,
        serviceName: service?.name,
        servicePrice: servicePrice
      };
      onComplete(bookingWithPrice);
    } else if (nextStatus) {
      onStatusUpdate(booking.id, nextStatus);
    }
  };

  return (
    <div className={`${getCardGradient(booking.status)} backdrop-blur-xl rounded-2xl shadow-xl p-6 border-l-4 ${getBorderColor(booking.status)} border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
              {booking.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
              {booking.customerPhone && (
                <div className="flex items-center text-gray-600 text-sm mt-1">
                  <PhoneIcon className="h-4 w-4 mr-1 text-green-500" />
                  {booking.customerPhone}
                </div>
              )}
            </div>
          </div>
          {booking.channel && (
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
              📍 {booking.channel}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="bg-white/80 rounded-xl p-3 shadow-md">
            <p className="text-sm text-gray-600 font-bold flex items-center justify-end">
              <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
              {dateTimeUtils.formatTime(startTime)}
              <span className="mx-1">-</span>
              {dateTimeUtils.formatTime(endTime)}
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">⏱️ {booking.duration} นาที</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white/70 rounded-xl p-4 mb-4 shadow-sm">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium flex items-center">
              <SparklesIcon className="h-4 w-4 mr-1 text-purple-500" />
              คอร์ส:
            </span>
            <div className="text-right">
              <span className="font-bold text-gray-800">{service?.name}</span>
              {service?.priceByDuration?.[booking.duration] && (
                <div className="space-y-1">
                  {/* Original Price */}
                  {booking.discountType && booking.finalPrice !== undefined ? (
                    <div className="text-gray-500 text-sm line-through">
                      {dateTimeUtils.formatCurrency(service.priceByDuration[booking.duration])}
                    </div>
                  ) : (
                    <div className="text-green-600 font-bold text-lg">
                      {dateTimeUtils.formatCurrency(service.priceByDuration[booking.duration])}
                    </div>
                  )}
                  
                  {/* Discounted Price */}
                  {booking.discountType && booking.finalPrice !== undefined && (
                    <div className="text-green-600 font-bold text-lg">
                      {dateTimeUtils.formatCurrency(booking.finalPrice)}
                      <span className="text-xs text-red-600 ml-1">
                        ({booking.discountType === 'percentage' ? `${booking.discountValue}%` : `฿${booking.discountValue}`} ลด)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium flex items-center">
              <UserIcon className="h-4 w-4 mr-1 text-blue-500" />
              หมอนวด:
            </span>
            <span className="font-bold text-gray-800">🌟 {therapist?.name}</span>
          </div>
        </div>
        
        {/* Show discount info for bookings with discount (all statuses) */}
        {booking.discountType && booking.finalPrice !== undefined && (
          <div className="mt-4 p-4 bg-gradient-to-r from-blue-50/90 to-indigo-50/80 rounded-xl border border-blue-200/50 shadow-sm">
            <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
              💰 ข้อมูลราคาและส่วนลด
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ราคาเดิม:</span>
                <span className="font-medium">{dateTimeUtils.formatCurrency(service?.priceByDuration?.[booking.duration] || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ส่วนลด:</span>
                <span className="text-red-600 font-medium">
                  {booking.discountType === 'percentage' 
                    ? `${booking.discountValue}%` 
                    : dateTimeUtils.formatCurrency(booking.discountValue)
                  }
                  {' (-'}{dateTimeUtils.formatCurrency((service?.priceByDuration?.[booking.duration] || 0) - (booking.finalPrice || 0))})
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-blue-300 pt-2">
                <span className="text-blue-800">ราคาที่ลูกค้าจ่าย:</span>
                <span className="text-green-600">{dateTimeUtils.formatCurrency(booking.finalPrice || 0)}</span>
              </div>

              {/* Show commission breakdown for completed bookings */}
              {booking.status === 'done' && (
                <div className="border-t border-gray-300 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-orange-600">ค่าคอมหมอนวด:</span>
                    <span className="text-orange-600 font-bold">
                      {dateTimeUtils.formatCurrency(booking.therapistCommission || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-indigo-600">ร้านได้:</span>
                    <span className="text-indigo-600 font-bold">
                      {dateTimeUtils.formatCurrency(booking.shopRevenue || ((booking.finalPrice || 0) - (booking.therapistCommission || 0)))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        {nextStatus ? (
          <>
            <button
              onClick={handleStatusClick}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>{nextStatusText}</span>
            </button>
            <button
              onClick={() => onEdit(booking)}
              className="px-4 py-3 bg-white/80 hover:bg-white/90 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          </>
        ) : (
          /* คิวที่เสร็จแล้ว - ไม่สามารถแก้ไขได้ */
          <div className="w-full text-center">
            <div className="px-6 py-4 bg-gradient-to-r from-green-100/90 to-emerald-100/80 border-2 border-green-300/50 text-green-700 font-bold rounded-xl flex items-center justify-center shadow-md">
              <CheckCircleIcon className="h-6 w-6 mr-2" />
              เสร็จสิ้นแล้ว
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Revenue Breakdown Component  
function RevenueBreakdown({ completedBookings, therapists, services }) {
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await getConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };
    loadConfig();
  }, []);

  if (!config) return <div>กำลังโหลดข้อมูล...</div>;

  // Calculate summary
  let totalOriginalPrice = 0;
  let totalFinalPrice = 0;
  let totalTherapistCommission = 0;
  let totalShopRevenue = 0;
  let totalDiscount = 0;

  const bookingDetails = completedBookings.map(booking => {
    const service = services.find(s => s.id === booking.serviceId);
    const therapist = therapists.find(t => t.id === booking.therapistId);
    
    const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
    const finalPrice = booking.finalPrice || originalPrice;
    const discount = originalPrice - finalPrice;
    
    const therapistCommission = booking.therapistCommission || Math.floor(finalPrice * config.commissionRate);
    const shopRevenue = booking.shopRevenue || (finalPrice - therapistCommission);
    
    totalOriginalPrice += originalPrice;
    totalFinalPrice += finalPrice;
    totalDiscount += discount;
    totalTherapistCommission += therapistCommission;
    totalShopRevenue += shopRevenue;

    return {
      booking,
      service,
      therapist,
      originalPrice,
      finalPrice,
      discount,
      therapistCommission,
      shopRevenue
    };
  });

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">฿{totalOriginalPrice.toLocaleString()}</div>
          <div className="text-sm text-gray-600">ราคาเต็ม</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-red-600">-฿{totalDiscount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">ส่วนลดรวม</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">-฿{totalTherapistCommission.toLocaleString()}</div>
          <div className="text-sm text-gray-600">ค่าคอมหมอนวด</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-bold text-green-600">฿{totalShopRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-600">รายได้ร้าน</div>
        </div>
      </div>

      {/* Formula */}
      <div className="glass p-4">
        <div className="text-center text-lg font-semibold text-gray-800 mb-2">
          📊 สูตรคำนวณ
        </div>
        <div className="text-center text-gray-700">
          <span className="text-blue-600 font-bold">฿{totalOriginalPrice.toLocaleString()}</span>
          <span className="mx-2">-</span>
          <span className="text-red-600 font-bold">฿{totalDiscount.toLocaleString()}</span>
          <span className="mx-2">-</span>
          <span className="text-orange-600 font-bold">฿{totalTherapistCommission.toLocaleString()}</span>
          <span className="mx-2">=</span>
          <span className="text-green-600 font-bold text-xl">฿{totalShopRevenue.toLocaleString()}</span>
        </div>
        <div className="text-center text-sm text-gray-500 mt-2">
          ราคาเต็ม - ส่วนลด - ค่าคอมหมอนวด ({(config.commissionRate * 100).toFixed(0)}%) = รายได้ร้าน
        </div>
      </div>

      {/* Detailed List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800">รายละเอียดแต่ละคิว</h3>
        {bookingDetails.map(({ booking, service, therapist, originalPrice, finalPrice, discount, therapistCommission, shopRevenue }) => (
          <div key={booking.id} className="glass p-4">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h4 className="font-bold text-gray-800">{booking.customerName}</h4>
                <p className="text-sm text-gray-600">
                  {service?.name} • {therapist?.name} • {booking.duration} นาที
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(booking.startTime).toLocaleTimeString('th-TH', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right text-sm">
                <div className="text-gray-600">ราคาเต็ม: ฿{originalPrice.toLocaleString()}</div>
                {discount > 0 && (
                  <div className="text-red-600">ส่วนลด: -฿{discount.toLocaleString()}</div>
                )}
                <div className="text-orange-600">ค่าคอม: -฿{therapistCommission.toLocaleString()}</div>
                <div className="text-green-600 font-bold">ร้านได้: ฿{shopRevenue.toLocaleString()}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
