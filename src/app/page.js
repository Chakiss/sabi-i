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
    <div className="min-h-screen thai-pattern-enhanced">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-50/95 via-purple-50/85 to-blue-50/75 backdrop-blur-xl border-b border-white/30 shadow-xl sticky top-0 z-50">
        <div className="w-full px-6 lg:px-12 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 flex items-center justify-center text-white shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Saba-i Massage
                </h1>
                <p className="text-gray-600 mt-2 text-lg font-medium flex items-center">
                  <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
                  ระบบจัดการร้านนวดไทย
                </p>
              </div>
            </div>
            
            {/* Current Date Display */}
            <div className="flex items-center">
              {/* Desktop Version */}
              <div className="hidden sm:block">
                <div className="bg-white/85 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl border border-white/40 hover:shadow-2xl transition-all duration-300">
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
                    <div className="text-sm text-gray-600 font-semibold mt-1 flex items-center justify-end">
                      <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
                      {currentTime.toLocaleTimeString('th-TH', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Version */}
              <div className="sm:hidden">
                <div className="bg-white/85 backdrop-blur-sm rounded-xl px-4 py-3 shadow-lg border border-white/40">
                  <div className="text-right">
                    <div className="text-sm font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      {currentTime.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="text-xs text-gray-600 font-medium flex items-center justify-end">
                      <ClockIcon className="h-3 w-3 mr-1" />
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

      <div className="w-full px-6 lg:px-12 py-12 full-width-container">
        {/* Refresh Button with Enhanced Design */}
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
                
                toast.success('รีเฟรชข้อมูลแล้ว ✨');
              } catch (error) {
                console.error('Error refreshing data:', error);
                toast.error('เกิดข้อผิดพลาดในการรีเฟรชข้อมูล');
              } finally {
                setLoading(false);
              }
            }}
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-600 text-white font-bold rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 flex items-center space-x-3 overflow-hidden"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* Content */}
            <div className="relative z-10 flex items-center space-x-3">
              <svg className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-lg">รีเฟรชข้อมูล</span>
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
            
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 skew-x-12"></div>
          </button>
        </div>
        
        {/* Enhanced Queue Management Section */}
        {showQueueSection && (
          <div className="bg-gradient-to-br from-white/95 to-blue-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/40 mb-8 min-h-[calc(100vh-12rem)] relative overflow-hidden">
            {/* Animated Background Elements */}
            <div className="absolute top-10 right-10 w-24 h-24 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 bg-gradient-to-br from-pink-300/20 to-yellow-300/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl transform hover:rotate-6 transition-transform duration-300">
                    <ClipboardDocumentListIcon className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      จัดการคิววันนี้
                    </h2>
                    <p className="text-gray-600 font-medium flex items-center">
                      <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse inline-block"></span>
                      ({sortedBookings.length} คิว) อัพเดทสถานะและติดตามคิว
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleNewBooking}
                    className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2 overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex items-center space-x-2">
                      <SparklesIcon className="h-5 w-5 group-hover:rotate-180 transition-transform duration-300" />
                      <span>จองคิวใหม่</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setShowQueueSection(!showQueueSection)}
                    className="px-6 py-3 bg-white/80 hover:bg-white/90 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 border border-white/50"
                  >
                    {showQueueSection ? '🙈 ซ่อนคิว' : '👁️ แสดงคิว'}
                  </button>
                </div>
              </div>

              {sortedBookings.length === 0 ? (
                <div className="text-center py-20">
                  <div className="mb-8">
                    <div className="text-8xl mb-4 animate-bounce">🌸</div>
                    <div className="w-32 h-32 mx-auto bg-gradient-to-br from-pink-100 to-purple-100 rounded-full flex items-center justify-center shadow-xl mb-6">
                      <CalendarDaysIcon className="h-16 w-16 text-purple-400" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-700 mb-4">ยังไม่มีคิววันนี้</h3>
                  <p className="text-gray-600 mb-8 text-lg">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
                  <button
                    onClick={handleNewBooking}
                    className="group relative px-10 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 text-lg overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="relative z-10 flex items-center space-x-3">
                      <SparklesIcon className="h-6 w-6 group-hover:rotate-180 transition-transform duration-500" />
                      <span>จองคิวใหม่</span>
                      <svg className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                      </svg>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
                  {/* รอคิว - Enhanced */}
                  <div className="bg-gradient-to-br from-yellow-50/95 to-orange-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-yellow-200/60 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-yellow-300/30 to-orange-300/30 rounded-full blur-xl"></div>
                    
                    <div className="flex items-center mb-6 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 transition-transform duration-300">
                        ⏳
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-yellow-800">รอคิว</h2>
                        <p className="text-yellow-600 font-medium flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2 animate-pulse inline-block"></span>
                          {pendingBookings.length} คิว
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
                      {pendingBookings.map((booking, index) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <div
                            key={booking.id}
                            className="transform hover:scale-[1.02] transition-all duration-200"
                            style={{
                              animationName: 'slideInUp',
                              animationDuration: '0.5s',
                              animationTimingFunction: 'ease-out',
                              animationFillMode: 'forwards',
                              animationDelay: `${index * 100}ms`
                            }}
                          >
                            <BookingCard 
                              booking={booking}
                              therapist={therapist}
                              service={service}
                              startTime={startTime}
                              onStatusUpdate={handleStatusUpdate}
                              onEdit={handleEditBooking}
                            />
                          </div>
                        );
                      })}
                      
                      {pendingBookings.length === 0 && (
                        <div className="text-center py-12 text-yellow-600 flex-1 flex flex-col justify-center">
                          <div className="w-20 h-20 mx-auto bg-yellow-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <ClockIcon className="h-10 w-10 text-yellow-400" />
                          </div>
                          <p className="text-base font-medium">ไม่มีคิวที่รอ</p>
                          <p className="text-sm text-yellow-500 mt-1">คิวใหม่จะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* กำลังนวด - Enhanced */}
                  <div className="bg-gradient-to-br from-blue-50/95 to-indigo-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-blue-200/60 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-blue-300/30 to-indigo-300/30 rounded-full blur-xl animate-pulse"></div>
                    
                    <div className="flex items-center mb-6 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 transition-transform duration-300">
                        💆‍♀️
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-blue-800">กำลังนวด</h2>
                        <p className="text-blue-600 font-medium flex items-center">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 animate-pulse inline-block"></span>
                          {inProgressBookings.length} คิว
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
                      {inProgressBookings.map((booking, index) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <div
                            key={booking.id}
                            className="transform hover:scale-[1.02] transition-all duration-200"
                            style={{
                              animationName: 'slideInUp',
                              animationDuration: '0.5s',
                              animationTimingFunction: 'ease-out',
                              animationFillMode: 'forwards',
                              animationDelay: `${index * 100}ms`
                            }}
                          >
                            <BookingCard 
                              booking={booking}
                              therapist={therapist}
                              service={service}
                              startTime={startTime}
                              onStatusUpdate={handleStatusUpdate}
                              onEdit={handleEditBooking}
                              onComplete={handleCompleteBooking}
                            />
                          </div>
                        );
                      })}
                      
                      {inProgressBookings.length === 0 && (
                        <div className="text-center py-12 text-gray-500 flex-1 flex flex-col justify-center">
                          <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <PlayCircleIcon className="h-10 w-10 text-blue-400" />
                          </div>
                          <p className="text-base font-medium">ไม่มีคิวที่กำลังนวด</p>
                          <p className="text-sm text-gray-400 mt-1">คิวที่เริ่มแล้วจะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* เสร็จแล้ว - Enhanced */}
                  <div className="bg-gradient-to-br from-green-50/95 to-emerald-50/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-green-200/60 flex flex-col h-full relative overflow-hidden">
                    <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-green-300/30 to-emerald-300/30 rounded-full blur-xl"></div>
                    
                    <div className="flex items-center mb-6 relative z-10">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg hover:scale-110 transition-transform duration-300">
                        ✅
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-green-800">เสร็จแล้ว</h2>
                        <p className="text-green-600 font-medium flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full mr-2 inline-block"></span>
                          {doneBookings.length} คิว
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex-1 overflow-y-auto relative z-10">
                      {doneBookings.map((booking, index) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        
                        return (
                          <div
                            key={booking.id}
                            className="transform hover:scale-[1.02] transition-all duration-200"
                            style={{
                              animationName: 'slideInUp',
                              animationDuration: '0.5s',
                              animationTimingFunction: 'ease-out',
                              animationFillMode: 'forwards',
                              animationDelay: `${index * 100}ms`
                            }}
                          >
                            <BookingCard 
                              booking={booking}
                              therapist={therapist}
                              service={service}
                              startTime={startTime}
                              onStatusUpdate={handleStatusUpdate}
                              onEdit={handleEditBooking}
                            />
                          </div>
                        );
                      })}
                      
                      {doneBookings.length === 0 && (
                        <div className="text-center py-12 text-gray-500 flex-1 flex flex-col justify-center">
                          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4 shadow-lg">
                            <CheckCircleIcon className="h-10 w-10 text-green-400" />
                          </div>
                          <p className="text-base font-medium">ยังไม่มีคิวที่เสร็จ</p>
                          <p className="text-sm text-gray-400 mt-1">คิวที่เสร็จแล้วจะปรากฏที่นี่</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Stats Overview - Comprehensive Dashboard */}
        <div className="bg-gradient-to-br from-white/95 to-purple-50/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl">
                <ChartBarIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  สรุปภาพรวมวันนี้
                </h2>
                <p className="text-gray-600 font-medium">
                  ข้อมูลสถิติและผลการดำเนินงาน • อัพเดทแบบเรียลไทม์
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-xl shadow-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-semibold text-gray-700">Live</span>
            </div>
          </div>

          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Bookings */}
            <div 
              className="bg-gradient-to-br from-blue-50/90 to-indigo-50/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-blue-200/50 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              onClick={() => setShowTodayBookings(!showTodayBookings)}
            >
              <div className="flex items-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg transform rotate-3">
                  <CalendarDaysIcon className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-blue-700 uppercase tracking-wider">คิวทั้งหมด</p>
                    <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">วันนี้</div>
                  </div>
                  <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-2">
                    {todayStats.bookings}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-xs text-blue-600 font-bold">👆 คลิกดูรายละเอียด</p>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-300 to-transparent"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Therapists */}
            <div 
              className="bg-gradient-to-br from-green-50/90 to-emerald-50/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-green-200/50 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              onClick={() => setShowAvailableTherapists(!showAvailableTherapists)}
            >
              <div className="flex items-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg transform -rotate-3">
                  <UserGroupIcon className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-green-700 uppercase tracking-wider">หมอนวดเข้าเวร</p>
                    <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Active</div>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {todayStats.activeTherapists}
                    </p>
                    <p className="text-lg text-gray-500 ml-2">คน</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-green-600 font-bold">{todayStats.availableCount} ว่าง</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span className="text-red-600 font-bold">{todayStats.busyCount} ไม่ว่าง</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Completed Sessions */}
            <div className="bg-gradient-to-br from-purple-50/90 to-violet-50/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-purple-200/50 hover:scale-105 transition-all duration-300 hover:shadow-2xl">
              <div className="flex items-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg transform rotate-6">
                  <CheckCircleIcon className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-purple-700 uppercase tracking-wider">งานที่เสร็จ</p>
                    <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">Done</div>
                  </div>
                  <div className="flex items-baseline mt-2">
                    <p className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                      {todayStats.completedSessions}
                    </p>
                    <p className="text-lg text-gray-500 ml-2">คิว</p>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-purple-500 to-violet-500 transition-all duration-500"
                        style={{
                          width: todayStats.bookings > 0 ? `${(todayStats.completedSessions / todayStats.bookings) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-purple-600 font-bold">
                      {todayStats.bookings > 0 ? Math.round((todayStats.completedSessions / todayStats.bookings) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue */}
            <div 
              className="bg-gradient-to-br from-yellow-50/90 to-orange-50/80 backdrop-blur-xl rounded-2xl shadow-xl p-6 border border-yellow-200/50 cursor-pointer hover:scale-105 transition-all duration-300 hover:shadow-2xl"
              onClick={() => setShowRevenueDetails(!showRevenueDetails)}
            >
              <div className="flex items-center">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-lg transform -rotate-6">
                  <CurrencyDollarIcon className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-yellow-700 uppercase tracking-wider">รายได้ร้าน</p>
                    <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">Net</div>
                  </div>
                  <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mt-2">
                    ฿{todayStats.totalRevenue.toLocaleString()}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <p className="text-xs text-yellow-700 font-bold">💰 หลังหักค่าคอม</p>
                    <div className="flex-1 h-0.5 bg-gradient-to-r from-yellow-300 to-transparent"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Queue Status */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center mr-3">
                  <ClockIcon className="h-4 w-4 text-white" />
                </div>
                สถานะคิว
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">รอคิว</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {sortedBookings.filter(b => b.status === 'pending').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">กำลังนวด</span>
                  </div>
                  <span className="text-lg font-bold text-blue-600">
                    {sortedBookings.filter(b => b.status === 'in_progress').length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm font-medium text-gray-700">เสร็จแล้ว</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {sortedBookings.filter(b => b.status === 'done').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mr-3">
                  <ChartBarIcon className="h-4 w-4 text-white" />
                </div>
                ประสิทธิภาพ
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">อัตราการเสร็จงาน</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: todayStats.bookings > 0 ? `${(todayStats.completedSessions / todayStats.bookings) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">
                      {todayStats.bookings > 0 ? Math.round((todayStats.completedSessions / todayStats.bookings) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">การใช้งานหมอนวด</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                        style={{
                          width: todayStats.activeTherapists > 0 ? `${(todayStats.busyCount / todayStats.activeTherapists) * 100}%` : '0%'
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">
                      {todayStats.activeTherapists > 0 ? Math.round((todayStats.busyCount / todayStats.activeTherapists) * 100) : 0}%
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">รายได้เฉลี่ย/คิว</span>
                  <span className="text-sm font-bold text-purple-600">
                    ฿{todayStats.completedSessions > 0 ? Math.round(todayStats.totalRevenue / todayStats.completedSessions).toLocaleString() : 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center mr-3">
                  <SparklesIcon className="h-4 w-4 text-white" />
                </div>
                การดำเนินการด่วน
              </h3>
              <div className="space-y-3">
                <button
                  onClick={handleNewBooking}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm flex items-center justify-center"
                >
                  <CalendarDaysIcon className="h-4 w-4 mr-2" />
                  จองคิวใหม่
                </button>
                <Link
                  href="/queue"
                  className="w-full px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm flex items-center justify-center"
                >
                  <ClipboardDocumentListIcon className="h-4 w-4 mr-2" />
                  จัดการคิว
                </Link>
                <Link
                  href="/reports"
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 text-sm flex items-center justify-center"
                >
                  <ChartBarIcon className="h-4 w-4 mr-2" />
                  ดูรายงาน
                </Link>
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
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse inline-block"></span>
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
                            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse inline-block"></span>
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

        {/* Enhanced Menu Cards Section */}
        <div className="bg-gradient-to-br from-white/95 to-indigo-50/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  เมนูการจัดการ
                </h2>
                <p className="text-gray-600 font-medium">
                  เลือกฟีเจอร์ที่ต้องการใช้งาน • ออกแบบให้ใช้งานง่าย
                </p>
              </div>
            </div>
            <div className="hidden lg:flex items-center space-x-3">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white shadow-lg"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 border-2 border-white shadow-lg"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-pink-600 border-2 border-white shadow-lg"></div>
              </div>
              <span className="text-sm font-semibold text-gray-600">7 ฟีเจอร์หลัก</span>
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {menuItems.map((item, index) => (
              <Link
                key={index}
                href={item.href}
                className="group relative bg-gradient-to-br from-white/95 to-gray-50/80 backdrop-blur-xl rounded-3xl shadow-lg border border-white/40 p-8 overflow-hidden transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] hover:border-purple-300/50 hover:from-white hover:to-purple-50/60"
              >
                {/* Animated Background Particles */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute top-4 right-4 w-16 h-16 bg-gradient-to-br from-purple-300/30 to-pink-300/30 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 bg-gradient-to-br from-blue-300/30 to-purple-300/30 rounded-full blur-lg group-hover:scale-125 transition-transform duration-500"></div>
                  <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-pink-300/20 to-yellow-300/20 rounded-full blur-md transform -translate-x-1/2 -translate-y-1/2 group-hover:scale-200 transition-transform duration-1000"></div>
                </div>
                
                <div className="relative z-10">
                  {/* Icon Container with Enhanced Animation */}
                  <div className="flex items-center justify-center mb-6">
                    <div className={`relative p-5 rounded-2xl bg-gradient-to-br ${item.color} shadow-2xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-300`}>
                      <item.icon className="h-10 w-10 text-white relative z-10" />
                      {/* Icon Glow Effect */}
                      <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    </div>
                  </div>
                  
                  {/* Title with Gradient Text */}
                  <h3 className="text-xl font-bold text-gray-800 mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300 text-center">
                    {item.title}
                  </h3>
                  
                  {/* Description with Enhanced Typography */}
                  <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors text-center font-medium text-sm mb-6">
                    {item.description}
                  </p>
                  
                  {/* Call to Action with Icon Animation */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center text-purple-600 font-bold group-hover:text-pink-600 transition-colors">
                      <SparklesIcon className="h-5 w-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                      <span className="text-sm">เข้าใช้งาน</span>
                      <svg className="ml-2 w-5 h-5 transform group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Shine Effect on Hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent opacity-0 group-hover:opacity-100 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-all duration-1000 ease-out"></div>
                
                {/* Gradient Border Effect */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-blue-500/50 opacity-0 group-hover:opacity-20 transition-opacity duration-300 -z-10 blur-sm"></div>
              </Link>
            ))}
          </div>

          {/* Footer Information */}
          <div className="mt-8 p-6 bg-gradient-to-r from-blue-50/80 to-purple-50/60 rounded-2xl border border-blue-200/50">
            <div className="flex items-center justify-center text-sm text-gray-600">
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2 animate-pulse inline-block"></span>
                  <span className="font-medium">ระบบพร้อมใช้งาน</span>
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-blue-500" />
                  <span className="font-medium">อัพเดทล่าสุด: {currentTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="font-medium">รองรับการใช้งานแบบ Multi-user</span>
                </div>
              </div>
            </div>
          </div>
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
