'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices } from '@/lib/firestore';
import { CalendarDaysIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, ChartBarIcon, UserGroupIcon } from '@heroicons/react/24/outline';
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
      <div className="min-h-screen flex items-center justify-center thai-pattern">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">🌸 กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                🌸
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                  Saba-i Massage
                </h1>
                <p className="text-gray-600 mt-1">ระบบจัดการร้านนวดไทย</p>
              </div>
            </div>
            
            {/* Current Date Display */}
            <div className="flex items-center">
              {/* Desktop Version */}
              <div className="hidden sm:block">
                <div className="glass-card px-4 py-3 shadow-sm">
                  <div className="text-right">
                    <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">วันนี้</div>
                    <div className="text-lg font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                      {currentTime.toLocaleDateString('th-TH', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-gray-600 font-medium">
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
                <div className="glass-card px-3 py-2">
                  <div className="text-right">
                    <div className="text-sm font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                      {currentTime.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                    <div className="text-xs text-gray-600">
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
        <div className="flex justify-end mb-6">
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
            className="glass-button px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
          >
            🔄 รีเฟรช
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
              className="glass-card p-8 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <div className="relative z-10">
                <div className="flex items-center mb-4">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${item.color} shadow-lg group-hover:scale-110 transition-all duration-300`}>
                    <item.icon className="h-8 w-8 text-white" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-gray-900 transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 leading-relaxed group-hover:text-gray-700 transition-colors">
                  {item.description}
                </p>
                
                <div className="mt-6 flex items-center text-yellow-600 font-semibold">
                  <span>เข้าใช้งาน</span>
                  <svg className="ml-2 w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Decorative element */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-transparent rounded-full transform translate-x-8 -translate-y-8"></div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
