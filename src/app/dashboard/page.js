'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, getBookingsByDateRange } from '@/lib/firestore';
import { ArrowLeftIcon, CalendarDaysIcon, UserGroupIcon, ClipboardDocumentListIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const [currentPeriod, setCurrentPeriod] = useState('today');
  const [currentStats, setCurrentStats] = useState({
    bookings: 0,
    activeTherapists: 0,
    totalRevenue: 0,
    completedSessions: 0,
    growthRate: 0,
    therapistEarnings: 0,
    shopEarnings: 0
  });
  
  const [todayBookings, setTodayBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTodayBookings, setShowTodayBookings] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [therapistsData, servicesData] = await Promise.all([
          getTherapists(),
          getServices()
        ]);

        // คำนวณช่วงวันที่ตาม period ที่เลือก
        const today = new Date();
        let startDate, endDate, prevStartDate, prevEndDate;

        if (currentPeriod === 'today') {
          startDate = new Date(today);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999);
          
          // วันก่อนหน้า
          prevStartDate = new Date(startDate);
          prevStartDate.setDate(prevStartDate.getDate() - 1);
          prevEndDate = new Date(endDate);
          prevEndDate.setDate(prevEndDate.getDate() - 1);
        } else if (currentPeriod === 'week') {
          // สัปดาห์นี้ (7 วันย้อนหลัง)
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999);
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 6);
          startDate.setHours(0, 0, 0, 0);
          
          // สัปดาห์ก่อนหน้า
          prevEndDate = new Date(startDate);
          prevEndDate.setDate(prevEndDate.getDate() - 1);
          prevEndDate.setHours(23, 59, 59, 999);
          prevStartDate = new Date(prevEndDate);
          prevStartDate.setDate(prevStartDate.getDate() - 6);
          prevStartDate.setHours(0, 0, 0, 0);
        } else if (currentPeriod === 'month') {
          // เดือนนี้ (30 วันย้อนหลัง)
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999);
          startDate = new Date(today);
          startDate.setDate(startDate.getDate() - 29);
          startDate.setHours(0, 0, 0, 0);
          
          // เดือนก่อนหน้า
          prevEndDate = new Date(startDate);
          prevEndDate.setDate(prevEndDate.getDate() - 1);
          prevEndDate.setHours(23, 59, 59, 999);
          prevStartDate = new Date(prevEndDate);
          prevStartDate.setDate(prevStartDate.getDate() - 29);
          prevStartDate.setHours(0, 0, 0, 0);
        }

        // ดึงข้อมูลการจองสำหรับช่วงเวลาปัจจุบันและก่อนหน้า
        const [currentBookings, prevBookings] = await Promise.all([
          getBookingsByDateRange(startDate, endDate),
          getBookingsByDateRange(prevStartDate, prevEndDate)
        ]);

        // คำนวณข้อมูลสำหรับ period ปัจจุบัน
        const activeTherapists = therapistsData.filter(t => t.status === 'active').length;
        const completedBookings = currentBookings.filter(b => b.status === 'done');
        const totalRevenue = completedBookings.reduce((sum, booking) => {
          const service = servicesData.find(s => s.id === booking.serviceId);
          return sum + (service?.priceByDuration?.[booking.duration] || 0);
        }, 0);

        // คำนวณรายได้นักบำบัดและร้าน (60/40)
        const therapistEarnings = totalRevenue * 0.6;
        const shopEarnings = totalRevenue * 0.4;

        // คำนวณข้อมูลช่วงก่อนหน้าเพื่อเปรียบเทียบ
        const prevCompletedBookings = prevBookings.filter(b => b.status === 'done');
        const prevTotalRevenue = prevCompletedBookings.reduce((sum, booking) => {
          const service = servicesData.find(s => s.id === booking.serviceId);
          return sum + (service?.priceByDuration?.[booking.duration] || 0);
        }, 0);

        // คำนวณอัตราการเติบโต
        const growthRate = prevTotalRevenue > 0 
          ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100)
          : totalRevenue > 0 ? 100 : 0;

        setCurrentStats({
          bookings: currentBookings.length,
          activeTherapists,
          totalRevenue,
          completedSessions: completedBookings.length,
          growthRate,
          therapistEarnings,
          shopEarnings
        });

        // ถ้าเป็น today period ให้เก็บข้อมูลการจองของวันนี้ด้วย
        if (currentPeriod === 'today') {
          setTodayBookings(currentBookings);
        }

        setTherapists(therapistsData);
        setServices(servicesData);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Auto refresh ทุก 30 วินาที
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [currentPeriod]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center thai-pattern">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">📊 กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/"
              className="mr-4 p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  รายงานยอดและสรุปรายได้
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selection */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setCurrentPeriod('today')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                currentPeriod === 'today'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'glass-button hover:bg-white/20'
              }`}
            >
              📅 วันนี้
            </button>
            <button
              onClick={() => setCurrentPeriod('week')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                currentPeriod === 'week'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'glass-button hover:bg-white/20'
              }`}
            >
              📊 สัปดาห์นี้ (7 วัน)
            </button>
            <button
              onClick={() => setCurrentPeriod('month')}
              className={`px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                currentPeriod === 'month'
                  ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow-lg'
                  : 'glass-button hover:bg-white/20'
              }`}
            >
              📈 เดือนนี้ (30 วัน)
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div 
            className="glass-stat p-6 cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => currentPeriod === 'today' && setShowTodayBookings(!showTodayBookings)}
          >
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-lg">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  การจอง{currentPeriod === 'today' ? 'วันนี้' : currentPeriod === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {currentStats.bookings}
                </p>
                {currentPeriod === 'today' && (
                  <p className="text-xs text-blue-600 font-medium mt-1">คลิกเพื่อดูรายละเอียด</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="glass-stat p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 shadow-lg">
                <UserGroupIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">หมอนวดเข้าเวร</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {currentStats.activeTherapists}
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">คนที่พร้อมให้บริการ</p>
              </div>
            </div>
          </div>

          <div className="glass-stat p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
                <ClipboardDocumentListIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">ลูกค้าที่เสร็จแล้ว</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {currentStats.completedSessions}
                </p>
                <p className="text-xs text-purple-600 font-medium mt-1">จากทั้งหมด {currentStats.bookings} คิว</p>
              </div>
            </div>
          </div>

          <div className="glass-stat p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 shadow-lg">
                <CurrencyDollarIcon className="h-8 w-8 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">
                  รายได้{currentPeriod === 'today' ? 'วันนี้' : currentPeriod === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้'}
                </p>
                <p className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
                  ฿{currentStats.totalRevenue.toLocaleString()}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`text-xs font-medium ${
                    currentStats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentStats.growthRate >= 0 ? '↗️' : '↘️'} {Math.abs(currentStats.growthRate).toFixed(1)}%
                  </span>
                  <span className="text-xs text-gray-500 ml-1">
                    จาก{currentPeriod === 'today' ? 'เมื่อวาน' : currentPeriod === 'week' ? 'สัปดาห์ก่อน' : 'เดือนก่อน'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                👨‍⚕️
              </div>
              <h3 className="text-xl font-bold text-gray-800">รายได้นักบำบัด (60%)</h3>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
              ฿{currentStats.therapistEarnings.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              จากรายได้รวม ฿{currentStats.totalRevenue.toLocaleString()}
            </p>
          </div>

          <div className="glass-card p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                🏪
              </div>
              <h3 className="text-xl font-bold text-gray-800">รายได้ร้าน (40%)</h3>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
              ฿{currentStats.shopEarnings.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              จากรายได้รวม ฿{currentStats.totalRevenue.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Today's Bookings Modal/Section */}
        {showTodayBookings && currentPeriod === 'today' && (
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

        {/* Other Dashboard Content */}
        <div className="glass-card p-12 text-center">
          <div className="text-8xl mb-6">📊</div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent mb-4">
            Dashboard Analytics
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            หน้า Dashboard แบบเต็มจะถูกพัฒนาใน Week 4 ตาม Roadmap<br />
            จะมีการแสดงผลแบบ Real-time Charts และ Analytics
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            <div className="glass p-6">
              <div className="text-2xl mb-2">📈</div>
              <h3 className="font-bold text-gray-800 mb-2">รายงานรายวัน</h3>
              <p className="text-sm text-gray-600">ยอดนวด, รายได้, ค่าคอมมิชชั่น</p>
            </div>
            
            <div className="glass p-6">
              <div className="text-2xl mb-2">👥</div>
              <h3 className="font-bold text-gray-800 mb-2">รายงานหมอนวด</h3>
              <p className="text-sm text-gray-600">ประสิทธิภาพ, ยอดทำงาน</p>
            </div>
            
            <div className="glass p-6">
              <div className="text-2xl mb-2">📅</div>
              <h3 className="font-bold text-gray-800 mb-2">รายงานรายเดือน</h3>
              <p className="text-sm text-gray-600">คอร์สยอดนิยม, แนวโน้ม</p>
            </div>
            
            <div className="glass p-6">
              <div className="text-2xl mb-2">💾</div>
              <h3 className="font-bold text-gray-800 mb-2">Export ข้อมูล</h3>
              <p className="text-sm text-gray-600">CSV, PDF Reports</p>
            </div>
          </div>
          
          {/* Management Links */}
          <div className="mt-12 pt-8 border-t border-white/20">
            <h3 className="text-xl font-bold text-gray-800 mb-6">🔧 การจัดการ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/reports"
                className="glass-button p-4 bg-gradient-to-r from-indigo-400 to-indigo-600 text-white hover:shadow-lg transition-all duration-200 text-center group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📊</div>
                <div className="font-semibold">รายงานและสถิติ</div>
                <div className="text-xs opacity-90">ดูคิวย้อนหลัง รายได้รายเดือน</div>
              </Link>
              
              <Link
                href="/services"
                className="glass-button p-4 bg-gradient-to-r from-purple-400 to-purple-600 text-white hover:shadow-lg transition-all duration-200 text-center group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">💆‍♀️</div>
                <div className="font-semibold">จัดการคอร์สนวด</div>
                <div className="text-xs opacity-90">เพิ่ม แก้ไข ราคาคอร์ส</div>
              </Link>
              
              <Link
                href="/therapists"
                className="glass-button p-4 bg-gradient-to-r from-green-400 to-emerald-600 text-white hover:shadow-lg transition-all duration-200 text-center group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">👥</div>
                <div className="font-semibold">จัดการหมอนวด</div>
                <div className="text-xs opacity-90">ข้อมูลพนักงาน ตารางเวร</div>
              </Link>
              
              <Link
                href="/queue"
                className="glass-button p-4 bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:shadow-lg transition-all duration-200 text-center group"
              >
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📋</div>
                <div className="font-semibold">จัดการคิว</div>
                <div className="text-xs opacity-90">อัพเดทสถานะ เริ่ม-จบคิว</div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
