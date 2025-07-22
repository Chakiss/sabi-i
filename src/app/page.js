'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices } from '@/lib/firestore';
import { CalendarDaysIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, ChartBarIcon, UserGroupIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

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
  const [todayBookings, setTodayBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());

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
        const [bookings, therapists, services] = await Promise.all([
          getTodayBookings(),
          getTherapists(),
          getServices()
        ]);

        const activeTherapists = therapists.filter(t => t.status === 'active');
        const completedBookings = bookings.filter(b => b.status === 'done');
        const totalRevenue = completedBookings.reduce((sum, booking) => {
          const service = services.find(s => s.id === booking.serviceId);
          const finalPrice = booking.finalPrice || (service?.priceByDuration?.[booking.duration] || 0);
          return sum + finalPrice;
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
                const [bookings, therapists, services] = await Promise.all([
                  getTodayBookings(),
                  getTherapists(),
                  getServices()
                ]);

                const activeTherapists = therapists.filter(t => t.status === 'active').length;
                const completedBookings = bookings.filter(b => b.status === 'done');
                const totalRevenue = completedBookings.reduce((sum, booking) => {
                  const service = services.find(s => s.id === booking.serviceId);
                  return sum + (service?.priceByDuration?.[booking.duration] || 0);
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
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="glass-stat p-6 cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => setShowTodayBookings(!showTodayBookings)}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">คิววันนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {todayStats.bookings}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-blue-600 font-medium">คลิกเพื่อดูรายละเอียด</p>
                  <Link 
                    href="/queue" 
                    className="text-xs text-orange-600 font-bold hover:text-orange-700 transition-colors px-2 py-1 rounded bg-orange-50 hover:bg-orange-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    📋 จัดการ
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div 
            className="glass-stat p-6 cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => setShowAvailableTherapists(!showAvailableTherapists)}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">หมอว่างตอนนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {todayStats.availableCount}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <p className="text-xs text-green-600 font-medium">คลิกเพื่อดูรายชื่อ</p>
                  <span className="text-xs text-gray-500">
                    /{todayStats.activeTherapists} คน
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-stat p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">เสร็จแล้ว</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {todayStats.completedSessions}
                </p>
              </div>
            </div>
          </div>

          <div className="glass-stat p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">รายได้วันนี้</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                  ฿{todayStats.totalRevenue.toLocaleString()}
                </p>
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
    </div>
  );
}
