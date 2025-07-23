'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, getConfig } from '@/lib/firestore';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  SparklesIcon,
  BanknotesIcon,
  UserIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    today: {
      bookings: 0,
      revenue: 0,
      completed: 0,
      pending: 0,
      inProgress: 0,
      therapistEarnings: 0,
      shopEarnings: 0
    },
    thisWeek: {
      bookings: 0,
      revenue: 0,
      growth: 0
    },
    thisMonth: {
      bookings: 0,
      revenue: 0,
      growth: 0
    }
  });
  
  const [todayBookings, setTodayBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [chartData, setChartData] = useState({
    hourlyBookings: [],
    servicePopularity: [],
    therapistPerformance: [],
    revenueByDay: []
  });

  useEffect(() => {
    fetchDashboardData();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [bookings, therapistsData, servicesData, configData] = await Promise.all([
        getTodayBookings(),
        getTherapists(),
        getServices(),
        getConfig()
      ]);

      // Calculate today's stats
      const completedBookings = bookings.filter(b => b.status === 'done');
      const pendingBookings = bookings.filter(b => b.status === 'pending');
      const inProgressBookings = bookings.filter(b => b.status === 'in_progress');
      
      let totalRevenue = 0;
      let totalTherapistEarnings = 0;
      let totalShopEarnings = 0;

      completedBookings.forEach(booking => {
        const finalPrice = booking.finalPrice || 0;
        if (finalPrice > 0) {
          totalRevenue += finalPrice;
          const commissionRate = configData?.commissionRate || 0.4;
          totalTherapistEarnings += Math.floor(finalPrice * commissionRate);
          totalShopEarnings += Math.floor(finalPrice * (1 - commissionRate));
        }
      });

      // Generate hourly bookings data
      const hourlyData = Array(24).fill(0);
      bookings.forEach(booking => {
        const hour = new Date(booking.startTime).getHours();
        hourlyData[hour]++;
      });

      // Generate service popularity data
      const serviceCount = {};
      bookings.forEach(booking => {
        const service = servicesData.find(s => s.id === booking.serviceId);
        if (service) {
          serviceCount[service.name] = (serviceCount[service.name] || 0) + 1;
        }
      });

      // Generate therapist performance data
      const therapistStats = {};
      completedBookings.forEach(booking => {
        const therapist = therapistsData.find(t => t.id === booking.therapistId);
        if (therapist) {
          if (!therapistStats[therapist.name]) {
            therapistStats[therapist.name] = { bookings: 0, revenue: 0 };
          }
          therapistStats[therapist.name].bookings++;
          therapistStats[therapist.name].revenue += (booking.finalPrice || 0);
        }
      });

      // Generate revenue by day (last 7 days)
      const last7Days = Array(7).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }),
          revenue: Math.random() * 10000 + 5000 // Mock data for now
        };
      }).reverse();

      setStats({
        today: {
          bookings: bookings.length,
          revenue: totalRevenue,
          completed: completedBookings.length,
          pending: pendingBookings.length,
          inProgress: inProgressBookings.length,
          therapistEarnings: totalTherapistEarnings,
          shopEarnings: totalShopEarnings
        },
        thisWeek: {
          bookings: bookings.length * 6, // Mock data
          revenue: totalRevenue * 6,
          growth: 12.5
        },
        thisMonth: {
          bookings: bookings.length * 25, // Mock data
          revenue: totalRevenue * 25,
          growth: 18.3
        }
      });

      setChartData({
        hourlyBookings: hourlyData,
        servicePopularity: Object.entries(serviceCount).map(([name, count]) => ({ name, count })),
        therapistPerformance: Object.entries(therapistStats).map(([name, data]) => ({ name, ...data })),
        revenueByDay: last7Days
      });

      setTodayBookings(bookings);
      setTherapists(therapistsData);
      setServices(servicesData);
      setConfig(configData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50/90 via-purple-50/80 to-pink-50/70">
        <div className="bg-gradient-to-br from-white/95 to-purple-50/90 backdrop-blur-xl rounded-3xl shadow-2xl p-16 text-center border border-white/30 max-w-md mx-4">
          <div className="relative mb-8">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-2xl animate-pulse">
              <ChartBarIcon className="h-10 w-10 text-white" />
            </div>
          </div>
          
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-500 border-r-pink-500 mx-auto"></div>
          </div>
          
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-3">
            กำลังโหลด Dashboard
          </h2>
          <p className="text-gray-600 font-medium">
            <SparklesIcon className="h-4 w-4 inline mr-1" />
            กรุณารอสักครู่...
          </p>
        </div>
      </div>
    );
  }

  const currentStats = stats[selectedPeriod] || stats.today;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/90 via-purple-50/80 to-pink-50/70">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50/90 via-purple-50/80 to-pink-50/70 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="p-3 rounded-2xl bg-white/80 hover:bg-white/90 text-gray-600 hover:text-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl">
                <ChartBarIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg font-medium">
                  ✨ ภาพรวมและรายงานประจำวัน
                </p>
              </div>
            </div>
            
            {/* Period Selector */}
            <div className="flex bg-white/80 rounded-2xl p-2 shadow-lg border border-white/30">
              {[
                { key: 'today', label: 'วันนี้' },
                { key: 'thisWeek', label: 'สัปดาห์นี้' },
                { key: 'thisMonth', label: 'เดือนนี้' }
              ].map(period => (
                <button
                  key={period.key}
                  onClick={() => setSelectedPeriod(period.key)}
                  className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 ${
                    selectedPeriod === period.key
                      ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-600 hover:bg-white/60'
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total Bookings */}
          <div className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                <CalendarDaysIcon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {currentStats.bookings}
                </div>
                <div className="text-sm text-gray-600 font-medium">คิวทั้งหมด</div>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="flex items-center text-green-600 font-medium">
                <CheckCircleIcon className="h-4 w-4 mr-1" />
                เสร็จ: {stats.today.completed}
              </span>
              <span className="flex items-center text-yellow-600 font-medium">
                <ClockIcon className="h-4 w-4 mr-1" />
                รอ: {stats.today.pending}
              </span>
            </div>
          </div>

          {/* Total Revenue */}
          <div className="bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
                <CurrencyDollarIcon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  ฿{currentStats.revenue?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-600 font-medium">รายได้รวม</div>
              </div>
            </div>
            {selectedPeriod !== 'today' && (
              <div className="flex items-center text-sm text-green-600 font-medium">
                <TrendingUpIcon className="h-4 w-4 mr-1" />
                เพิ่มขึ้น +{currentStats.growth}%
              </div>
            )}
          </div>

          {/* Therapist Earnings */}
          <div className="bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg">
                <UserIcon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ฿{stats.today.therapistEarnings?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-600 font-medium">หมอนวดได้</div>
              </div>
            </div>
            <div className="text-xs text-purple-600 font-medium">
              {config ? `${(config.commissionRate * 100).toFixed(0)}%` : '40%'} จากรายได้
            </div>
          </div>

          {/* Shop Earnings */}
          <div className="bg-gradient-to-br from-white/90 to-orange-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30 hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg">
                <BanknotesIcon className="h-7 w-7" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                  ฿{stats.today.shopEarnings?.toLocaleString() || '0'}
                </div>
                <div className="text-sm text-gray-600 font-medium">ร้านได้</div>
              </div>
            </div>
            <div className="text-xs text-orange-600 font-medium">
              {config ? `${(100 - config.commissionRate * 100).toFixed(0)}%` : '60%'} จากรายได้
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Hourly Bookings Chart */}
          <div className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mr-4">
                <ClockIcon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">การจองคิวตลอดวัน</h3>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-1">
              {chartData.hourlyBookings.map((count, hour) => (
                <div key={hour} className="flex flex-col items-center flex-1">
                  <div className="w-full bg-gradient-to-t from-blue-400 to-blue-600 rounded-t-lg transition-all duration-300 hover:from-blue-500 hover:to-blue-700" 
                       style={{ height: `${Math.max((count / Math.max(...chartData.hourlyBookings)) * 200, 4)}px` }}>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-medium">{hour}:00</div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Trend Chart */}
          <div className="bg-gradient-to-br from-white/90 to-green-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg mr-4">
                <TrendingUpIcon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">รายได้ 7 วันที่ผ่านมา</h3>
            </div>
            
            <div className="h-64 flex items-end justify-between space-x-2">
              {chartData.revenueByDay.map((day, index) => (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="w-full bg-gradient-to-t from-green-400 to-green-600 rounded-t-lg transition-all duration-300 hover:from-green-500 hover:to-green-700" 
                       style={{ height: `${(day.revenue / Math.max(...chartData.revenueByDay.map(d => d.revenue))) * 200}px` }}>
                  </div>
                  <div className="text-xs text-gray-600 mt-2 font-medium">{day.date}</div>
                  <div className="text-xs text-green-600 font-bold">฿{Math.floor(day.revenue).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Popularity & Therapist Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Popular Services */}
          <div className="bg-gradient-to-br from-white/90 to-purple-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg mr-4">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">บริการยอดนิยม</h3>
            </div>
            
            <div className="space-y-4">
              {chartData.servicePopularity.slice(0, 5).map((service, index) => (
                <div key={service.name} className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-sm mr-4">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-800">{service.name}</span>
                      <span className="text-purple-600 font-bold">{service.count} คิว</span>
                    </div>
                    <div className="w-full bg-purple-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-purple-400 to-pink-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(service.count / Math.max(...chartData.servicePopularity.map(s => s.count))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Therapists */}
          <div className="bg-gradient-to-br from-white/90 to-orange-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg mr-4">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold text-gray-800">หมอนวดยอดเยี่ยม</h3>
            </div>
            
            <div className="space-y-4">
              {chartData.therapistPerformance.slice(0, 5).map((therapist, index) => (
                <div key={therapist.name} className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold text-sm mr-4">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-800">{therapist.name}</span>
                      <div className="text-right">
                        <div className="text-orange-600 font-bold">{therapist.bookings} คิว</div>
                        <div className="text-sm text-gray-600">฿{therapist.revenue?.toLocaleString() || '0'}</div>
                      </div>
                    </div>
                    <div className="w-full bg-orange-100 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-500" 
                        style={{ width: `${(therapist.bookings / Math.max(...chartData.therapistPerformance.map(t => t.bookings))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/30">
          <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <SparklesIcon className="h-6 w-6 mr-3 text-purple-600" />
            การดำเนินการด่วน
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/queue"
              className="p-6 bg-gradient-to-br from-blue-100/80 to-blue-200/60 rounded-2xl border border-blue-200/50 hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-center"
            >
              <CalendarDaysIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-800">จัดการคิว</div>
            </Link>
            
            <Link
              href="/booking"
              className="p-6 bg-gradient-to-br from-green-100/80 to-green-200/60 rounded-2xl border border-green-200/50 hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-center"
            >
              <UserIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-800">จองคิวใหม่</div>
            </Link>
            
            <Link
              href="/reports"
              className="p-6 bg-gradient-to-br from-purple-100/80 to-purple-200/60 rounded-2xl border border-purple-200/50 hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-center"
            >
              <ChartBarIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-800">รายงาน</div>
            </Link>
            
            <button
              onClick={fetchDashboardData}
              className="p-6 bg-gradient-to-br from-orange-100/80 to-orange-200/60 rounded-2xl border border-orange-200/50 hover:shadow-lg transition-all duration-200 transform hover:scale-105 text-center"
            >
              <svg className="h-8 w-8 text-orange-600 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <div className="font-semibold text-orange-800">รีเฟรช</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
