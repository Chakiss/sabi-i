'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBookingsByDate, getMonthlyRevenue, getTherapists, getServices, getConfig, getBookingsByDateRange } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon,
  UserGroupIcon,
  BanknotesIcon,
  ClockIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';

export default function ReportsPage() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
  });
  
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1
    };
  });
  
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);
    return {
      startDate: lastWeek.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  });
  
  const [dailyBookings, setDailyBookings] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [rangeBookings, setRangeBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState({ daily: false, monthly: false, range: false });
  const [viewMode, setViewMode] = useState('comprehensive'); // 'comprehensive', 'daily', 'monthly'

  const fetchTherapistsAndServices = async () => {
    try {
      const [therapistsData, servicesData, configData] = await Promise.all([
        getTherapists(),
        getServices(),
        getConfig()
      ]);
      setTherapists(therapistsData);
      setServices(servicesData);
      setConfig(configData);
    } catch (error) {
      console.error('Error fetching base data:', error);
    }
  };

  const fetchRangeBookings = useCallback(async () => {
    if (!dateRange.startDate || !dateRange.endDate) return;
    
    setLoading(prev => ({ ...prev, range: true }));
    try {
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59, 999); // End of day
      
      const bookings = await getBookingsByDateRange(startDate, endDate);
      setRangeBookings(bookings);
    } catch (error) {
      console.error('Error fetching range bookings:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลช่วงวันที่');
    } finally {
      setLoading(prev => ({ ...prev, range: false }));
    }
  }, [dateRange.startDate, dateRange.endDate]);

  const fetchDailyBookings = useCallback(async () => {
    if (!selectedDate) return;
    
    setLoading(prev => ({ ...prev, daily: true }));
    try {
      const bookings = await getBookingsByDate(new Date(selectedDate));
      setDailyBookings(bookings);
    } catch (error) {
      console.error('Error fetching daily bookings:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลรายวัน');
    } finally {
      setLoading(prev => ({ ...prev, daily: false }));
    }
  }, [selectedDate]);

  const fetchMonthlyData = useCallback(async () => {
    setLoading(prev => ({ ...prev, monthly: true }));
    try {
      const data = await getMonthlyRevenue(selectedMonth.year, selectedMonth.month);
      setMonthlyData(data);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลรายเดือน');
    } finally {
      setLoading(prev => ({ ...prev, monthly: false }));
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchTherapistsAndServices();
  }, []);

  useEffect(() => {
    if (viewMode === 'comprehensive' || viewMode === 'daily') {
      if (selectedDate) {
        fetchDailyBookings();
      }
    }
  }, [selectedDate, fetchDailyBookings, viewMode]);

  useEffect(() => {
    if (viewMode === 'comprehensive' || viewMode === 'monthly') {
      fetchMonthlyData();
    }
  }, [selectedMonth, fetchMonthlyData, viewMode]);

  useEffect(() => {
    if (viewMode === 'comprehensive') {
      fetchRangeBookings();
    }
  }, [dateRange, fetchRangeBookings, viewMode]);

  const navigateMonth = (direction) => {
    setSelectedMonth(prev => {
      const newMonth = direction === 'prev' ? prev.month - 1 : prev.month + 1;
      let newYear = prev.year;
      
      if (newMonth < 1) {
        return { year: newYear - 1, month: 12 };
      } else if (newMonth > 12) {
        return { year: newYear + 1, month: 1 };
      }
      
      return { year: newYear, month: newMonth };
    });
  };

  const calculateRangeRevenue = () => {
    const completedBookings = rangeBookings.filter(b => b.status === 'done');
    return completedBookings.reduce((summary, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      const therapistCommission = booking.therapistCommission || 0;
      const shopRevenue = booking.shopRevenue || (finalPrice - therapistCommission);
      
      return {
        originalRevenue: (summary.originalRevenue || 0) + originalPrice,
        totalDiscount: (summary.totalDiscount || 0) + (originalPrice - finalPrice),
        finalRevenue: (summary.finalRevenue || 0) + finalPrice,
        totalTherapistCommission: (summary.totalTherapistCommission || 0) + therapistCommission,
        totalShopRevenue: (summary.totalShopRevenue || 0) + shopRevenue,
        count: (summary.count || 0) + 1
      };
    }, { 
      originalRevenue: 0, 
      totalDiscount: 0, 
      finalRevenue: 0, 
      totalTherapistCommission: 0,
      totalShopRevenue: 0,
      count: 0 
    });
  };

  const calculateRangeTherapistCommissions = () => {
    const completedBookings = rangeBookings.filter(b => b.status === 'done');
    const therapistStats = {};
    
    completedBookings.forEach(booking => {
      const therapist = therapists.find(t => t.id === booking.therapistId);
      if (!therapist) return;
      
      const service = services.find(s => s.id === booking.serviceId);
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      const commission = booking.therapistCommission || Math.floor(originalPrice * (config?.commissionRate || 0.4));
      
      if (!therapistStats[therapist.id]) {
        therapistStats[therapist.id] = {
          id: therapist.id,
          name: therapist.name,
          totalBookings: 0,
          totalRevenue: 0,
          totalCommission: 0,
          bookings: []
        };
      }
      
      therapistStats[therapist.id].totalBookings++;
      therapistStats[therapist.id].totalRevenue += finalPrice;
      therapistStats[therapist.id].totalCommission += commission;
      therapistStats[therapist.id].bookings.push({
        customerName: booking.customerName,
        serviceName: service?.name || '-',
        duration: booking.duration,
        originalPrice,
        finalPrice,
        commission,
        startTime: booking.startTime,
        bookingDate: new Date(booking.startTime).toLocaleDateString('th-TH')
      });
    });
    
    return Object.values(therapistStats).sort((a, b) => b.totalCommission - a.totalCommission);
  };

  const calculateServiceStats = () => {
    const completedBookings = rangeBookings.filter(b => b.status === 'done');
    const serviceStats = {};
    const durationStats = {};
    
    completedBookings.forEach(booking => {
      const service = services.find(s => s.id === booking.serviceId);
      if (!service) return;
      
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      
      // Service statistics
      if (!serviceStats[service.id]) {
        serviceStats[service.id] = {
          id: service.id,
          name: service.name,
          category: service.category,
          totalBookings: 0,
          totalRevenue: 0,
          totalOriginalRevenue: 0,
          durations: {}
        };
      }
      
      serviceStats[service.id].totalBookings++;
      serviceStats[service.id].totalRevenue += finalPrice;
      serviceStats[service.id].totalOriginalRevenue += originalPrice;
      
      // Duration breakdown for each service
      if (!serviceStats[service.id].durations[booking.duration]) {
        serviceStats[service.id].durations[booking.duration] = 0;
      }
      serviceStats[service.id].durations[booking.duration]++;
      
      // Overall duration statistics
      if (!durationStats[booking.duration]) {
        durationStats[booking.duration] = {
          duration: booking.duration,
          count: 0,
          revenue: 0
        };
      }
      durationStats[booking.duration].count++;
      durationStats[booking.duration].revenue += finalPrice;
    });
    
    const sortedServices = Object.values(serviceStats).sort((a, b) => b.totalBookings - a.totalBookings);
    const sortedDurations = Object.values(durationStats).sort((a, b) => b.count - a.count);
    
    // Category statistics
    const categoryStats = {};
    sortedServices.forEach(service => {
      if (!categoryStats[service.category]) {
        categoryStats[service.category] = {
          category: service.category,
          totalBookings: 0,
          totalRevenue: 0,
          services: []
        };
      }
      categoryStats[service.category].totalBookings += service.totalBookings;
      categoryStats[service.category].totalRevenue += service.totalRevenue;
      categoryStats[service.category].services.push(service.name);
    });
    
    const sortedCategories = Object.values(categoryStats).sort((a, b) => b.totalBookings - a.totalBookings);
    
    return {
      services: sortedServices,
      durations: sortedDurations,
      categories: sortedCategories,
      totalCompletedBookings: completedBookings.length
    };
  };

  const calculateTimeStats = () => {
    const completedBookings = rangeBookings.filter(b => b.status === 'done');
    const dayOfWeekStats = {};
    const timeSlotStats = {};
    const hourStats = {};
    
    // Initialize day of week stats
    const dayNames = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'];
    dayNames.forEach((day, index) => {
      dayOfWeekStats[index] = {
        dayIndex: index,
        dayName: day,
        totalBookings: 0,
        totalRevenue: 0,
        timeSlots: {}
      };
    });
    
    // Initialize time slot stats
    const timeSlots = [
      { name: 'เช้า', start: 6, end: 12, label: '06:00-12:00' },
      { name: 'บ่าย', start: 12, end: 17, label: '12:00-17:00' },
      { name: 'เย็น', start: 17, end: 20, label: '17:00-20:00' },
      { name: 'กลางคืน', start: 20, end: 24, label: '20:00-24:00' }
    ];
    
    timeSlots.forEach(slot => {
      timeSlotStats[slot.name] = {
        name: slot.name,
        label: slot.label,
        totalBookings: 0,
        totalRevenue: 0,
        dayBreakdown: {}
      };
    });
    
    // Initialize hour stats (6 AM to 11 PM)
    for (let hour = 6; hour <= 23; hour++) {
      hourStats[hour] = {
        hour,
        displayHour: `${hour.toString().padStart(2, '0')}:00`,
        totalBookings: 0,
        totalRevenue: 0
      };
    }
    
    completedBookings.forEach(booking => {
      const bookingDate = new Date(booking.startTime);
      const dayOfWeek = bookingDate.getDay();
      const hour = bookingDate.getHours();
      
      const service = services.find(s => s.id === booking.serviceId);
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      
      // Day of week stats
      dayOfWeekStats[dayOfWeek].totalBookings++;
      dayOfWeekStats[dayOfWeek].totalRevenue += finalPrice;
      
      // Find time slot
      const timeSlot = timeSlots.find(slot => hour >= slot.start && hour < slot.end);
      if (timeSlot) {
        timeSlotStats[timeSlot.name].totalBookings++;
        timeSlotStats[timeSlot.name].totalRevenue += finalPrice;
        
        // Day breakdown for each time slot
        const dayName = dayNames[dayOfWeek];
        if (!timeSlotStats[timeSlot.name].dayBreakdown[dayName]) {
          timeSlotStats[timeSlot.name].dayBreakdown[dayName] = {
            bookings: 0,
            revenue: 0
          };
        }
        timeSlotStats[timeSlot.name].dayBreakdown[dayName].bookings++;
        timeSlotStats[timeSlot.name].dayBreakdown[dayName].revenue += finalPrice;
        
        // Time slot breakdown for each day
        if (!dayOfWeekStats[dayOfWeek].timeSlots[timeSlot.name]) {
          dayOfWeekStats[dayOfWeek].timeSlots[timeSlot.name] = {
            bookings: 0,
            revenue: 0
          };
        }
        dayOfWeekStats[dayOfWeek].timeSlots[timeSlot.name].bookings++;
        dayOfWeekStats[dayOfWeek].timeSlots[timeSlot.name].revenue += finalPrice;
      }
      
      // Hour stats
      if (hourStats[hour]) {
        hourStats[hour].totalBookings++;
        hourStats[hour].totalRevenue += finalPrice;
      }
    });
    
    const sortedDays = Object.values(dayOfWeekStats).sort((a, b) => b.totalBookings - a.totalBookings);
    const sortedTimeSlots = Object.values(timeSlotStats).sort((a, b) => b.totalBookings - a.totalBookings);
    const sortedHours = Object.values(hourStats)
      .filter(h => h.totalBookings > 0)
      .sort((a, b) => b.totalBookings - a.totalBookings);
    
    return {
      dayOfWeek: sortedDays,
      timeSlots: sortedTimeSlots,
      hours: sortedHours,
      totalCompletedBookings: completedBookings.length
    };
  };

  const calculateDailyRevenue = () => {
    const completedBookings = dailyBookings.filter(b => b.status === 'done');
    return completedBookings.reduce((summary, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      const therapistCommission = booking.therapistCommission || 0;
      const shopRevenue = booking.shopRevenue || 0;
      
      return {
        originalRevenue: (summary.originalRevenue || 0) + originalPrice,
        totalDiscount: (summary.totalDiscount || 0) + (originalPrice - finalPrice),
        finalRevenue: (summary.finalRevenue || 0) + finalPrice,
        totalTherapistCommission: (summary.totalTherapistCommission || 0) + therapistCommission,
        totalShopRevenue: (summary.totalShopRevenue || 0) + shopRevenue,
        count: (summary.count || 0) + 1
      };
    }, { 
      originalRevenue: 0, 
      totalDiscount: 0, 
      finalRevenue: 0, 
      totalTherapistCommission: 0,
      totalShopRevenue: 0,
      count: 0 
    });
  };

  const calculateTherapistCommissions = () => {
    const completedBookings = dailyBookings.filter(b => b.status === 'done');
    const therapistStats = {};
    
    completedBookings.forEach(booking => {
      const therapist = therapists.find(t => t.id === booking.therapistId);
      if (!therapist) return;
      
      const service = services.find(s => s.id === booking.serviceId);
      const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
      const finalPrice = booking.finalPrice || originalPrice;
      const commission = booking.therapistCommission || Math.floor(finalPrice * (config?.commissionRate || 0.4));
      
      if (!therapistStats[therapist.id]) {
        therapistStats[therapist.id] = {
          id: therapist.id,
          name: therapist.name,
          totalBookings: 0,
          totalRevenue: 0,
          totalCommission: 0,
          bookings: []
        };
      }
      
      therapistStats[therapist.id].totalBookings++;
      therapistStats[therapist.id].totalRevenue += finalPrice;
      therapistStats[therapist.id].totalCommission += commission;
      therapistStats[therapist.id].bookings.push({
        customerName: booking.customerName,
        serviceName: service?.name || '-',
        duration: booking.duration,
        originalPrice,
        finalPrice,
        commission,
        startTime: booking.startTime
      });
    });
    
    return Object.values(therapistStats).sort((a, b) => b.totalCommission - a.totalCommission);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="p-3 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-md hover:shadow-lg border border-white/30"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
              </Link>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold shadow-xl">
                📊
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  รายงานและสถิติ
                </h1>
                <p className="text-gray-600 mt-2 text-lg">ดูรายงาน รายได้ และค่าคอมมิชชั่น</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-2 mb-8 p-2 bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30">
          <button
            onClick={() => setViewMode('comprehensive')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              viewMode === 'comprehensive' 
                ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            รายงานสรุปรวม
          </button>
          <button
            onClick={() => setViewMode('daily')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              viewMode === 'daily' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            รายงานรายวัน
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              viewMode === 'monthly' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <BanknotesIcon className="h-5 w-5 mr-2" />
            รายงานรายเดือน
          </button>
        </div>

        {/* Comprehensive Report */}
        {viewMode === 'comprehensive' && (
          <div className="space-y-8">
            {/* Date Range Selector */}
            <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white shadow-lg mr-4">
                  📊
                </div>
                <h2 className="text-2xl font-bold text-gray-800">รายงานสรุปรวม - รายได้ร้านและหมอนวด</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">วันที่เริ่มต้น</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">วันที่สิ้นสุด</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800"
                    max={new Date().toISOString().split('T')[0]}
                    min={dateRange.startDate}
                  />
                </div>
              </div>
            </div>

            {loading.range ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-purple-500 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <ClockIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">{rangeBookings.length}</div>
                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <CurrencyDollarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      ฿{calculateRangeRevenue().finalRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้สุทธิรวม</div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50/80 to-orange-50/80 backdrop-blur-sm p-6 rounded-2xl border border-yellow-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <BanknotesIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-yellow-600 mb-1">
                      ฿{calculateRangeRevenue().totalTherapistCommission.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">ค่ามือหมอนวด</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <UserGroupIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      ฿{calculateRangeRevenue().totalShopRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้ร้าน</div>
                  </div>
                </div>

                {/* Revenue Summary Table */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <CurrencyDollarIcon className="h-8 w-8 mr-3" />
                      สรุปรายได้ร้าน
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">รายการ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">จำนวน</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">เปอร์เซ็นต์</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 border-b border-gray-100 font-medium">รายได้ก่อนหักส่วนลด</td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-lg font-bold">
                              ฿{calculateRangeRevenue().originalRevenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-sm text-gray-600">100%</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 border-b border-gray-100 font-medium text-red-600">หักส่วนลดรวม</td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-lg font-bold text-red-600">
                              -฿{calculateRangeRevenue().totalDiscount.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-sm text-red-600">
                              -{calculateRangeRevenue().originalRevenue > 0 ? 
                                Math.round((calculateRangeRevenue().totalDiscount / calculateRangeRevenue().originalRevenue) * 100) : 0}%
                            </td>
                          </tr>
                          <tr className="bg-green-50/50 hover:bg-green-100/50">
                            <td className="px-6 py-4 border-b border-gray-100 font-bold text-green-700">รายได้สุทธิ</td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-xl font-bold text-green-600">
                              ฿{calculateRangeRevenue().finalRevenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-sm font-medium text-green-600">
                              {calculateRangeRevenue().originalRevenue > 0 ? 
                                Math.round((calculateRangeRevenue().finalRevenue / calculateRangeRevenue().originalRevenue) * 100) : 0}%
                            </td>
                          </tr>
                          <tr className="hover:bg-gray-50/50">
                            <td className="px-6 py-4 border-b border-gray-100 font-medium text-yellow-600">จ่ายค่ามือหมอนวด</td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-lg font-bold text-yellow-600">
                              -฿{calculateRangeRevenue().totalTherapistCommission.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right border-b border-gray-100 text-sm text-yellow-600">
                              -{calculateRangeRevenue().finalRevenue > 0 ? 
                                Math.round((calculateRangeRevenue().totalTherapistCommission / calculateRangeRevenue().finalRevenue) * 100) : 0}%
                            </td>
                          </tr>
                          <tr className="bg-purple-50/50 hover:bg-purple-100/50">
                            <td className="px-6 py-4 font-bold text-purple-700">กำไรสุทธิร้าน</td>
                            <td className="px-6 py-4 text-right text-xl font-bold text-purple-600">
                              ฿{calculateRangeRevenue().totalShopRevenue.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium text-purple-600">
                              {calculateRangeRevenue().finalRevenue > 0 ? 
                                Math.round((calculateRangeRevenue().totalShopRevenue / calculateRangeRevenue().finalRevenue) * 100) : 0}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Service Statistics Section */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-pink-500 to-rose-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <ChartBarIcon className="h-8 w-8 mr-3" />
                      สถิติบริการที่ลูกค้าใช้
                    </h3>
                  </div>
                  <div className="p-6">
                    {calculateServiceStats().totalCompletedBookings === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ChartBarIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>ไม่มีข้อมูลบริการในช่วงวันที่นี้</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Service Category Statistics */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-pink-500 rounded mr-2"></div>
                            สถิติตามประเภทบริการ
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {calculateServiceStats().categories.map((category, index) => (
                              <div key={category.category} className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200' :
                                index === 1 ? 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200' :
                                'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'
                              }`}>
                                <div className="flex items-center justify-between mb-2">
                                  <h5 className="font-semibold text-gray-800">{category.category}</h5>
                                  {index === 0 && <span className="text-xl">👑</span>}
                                  {index === 1 && <span className="text-xl">⭐</span>}
                                  {index === 2 && <span className="text-xl">🌟</span>}
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="flex justify-between">
                                    <span>จำนวนคิว:</span>
                                    <span className="font-bold">{category.totalBookings}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>รายได้:</span>
                                    <span className="font-bold text-green-600">฿{category.totalRevenue.toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>สัดส่วน:</span>
                                    <span className="font-bold text-blue-600">
                                      {Math.round((category.totalBookings / calculateServiceStats().totalCompletedBookings) * 100)}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Popular Services Table */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-rose-500 rounded mr-2"></div>
                            บริการที่ได้รับความนิยม
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">อันดับ</th>
                                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">บริการ</th>
                                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">ประเภท</th>
                                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">จำนวนคิว</th>
                                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">รายได้รวม</th>
                                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">สัดส่วน</th>
                                  <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">ราคาเฉลี่ย</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculateServiceStats().services.slice(0, 10).map((service, index) => (
                                  <tr key={service.id} className={`hover:bg-white/60 transition-all duration-200 ${
                                    index === 0 ? 'bg-gradient-to-r from-pink-50/80 to-rose-50/80' : 
                                    index === 1 ? 'bg-gradient-to-r from-purple-50/80 to-violet-50/80' :
                                    index === 2 ? 'bg-gradient-to-r from-blue-50/80 to-indigo-50/80' : 'bg-white/40'
                                  }`}>
                                    <td className="px-6 py-4 border-b border-gray-100">
                                      <div className="flex items-center">
                                        {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                                        {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                                        {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                                        <span className="font-bold text-gray-700">#{index + 1}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-100">
                                      <div className="font-semibold text-gray-800">{service.name}</div>
                                    </td>
                                    <td className="px-6 py-4 border-b border-gray-100">
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                        {service.category}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-center border-b border-gray-100">
                                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                        {service.totalBookings}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right border-b border-gray-100">
                                      <span className="text-lg font-bold text-green-600">฿{service.totalRevenue.toLocaleString()}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center border-b border-gray-100">
                                      <span className="text-sm font-medium text-purple-600">
                                        {Math.round((service.totalBookings / calculateServiceStats().totalCompletedBookings) * 100)}%
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-right border-b border-gray-100">
                                      <span className="text-sm font-medium text-orange-600">
                                        ฿{Math.round(service.totalRevenue / service.totalBookings).toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Duration Popularity */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                            ระยะเวลาที่ได้รับความนิยม
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {calculateServiceStats().durations.map((duration, index) => (
                              <div key={duration.duration} className={`p-4 rounded-xl border text-center transition-all duration-200 hover:shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200' :
                                index === 1 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200' :
                                'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                              }`}>
                                <div className="text-2xl font-bold text-gray-800 mb-1">
                                  {duration.duration}
                                  <span className="text-sm font-normal text-gray-600 ml-1">นาที</span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <div className="font-semibold">{duration.count} คิว</div>
                                  <div className="text-xs text-green-600 font-medium">
                                    ฿{duration.revenue.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-blue-600">
                                    {Math.round((duration.count / calculateServiceStats().totalCompletedBookings) * 100)}%
                                  </div>
                                </div>
                                {index === 0 && <div className="mt-2 text-lg">👑</div>}
                                {index === 1 && <div className="mt-2 text-lg">⭐</div>}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Service Usage Trends */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-indigo-500 rounded mr-2"></div>
                            รายละเอียดการใช้บริการ
                          </h4>
                          <div className="space-y-4">
                            {calculateServiceStats().services.slice(0, 5).map((service) => (
                              <div key={service.id} className="bg-gradient-to-r from-white/80 to-gray-50/60 p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-start mb-3">
                                  <div>
                                    <h5 className="font-semibold text-gray-800 text-lg">{service.name}</h5>
                                    <p className="text-sm text-gray-600">{service.category}</p>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold text-green-600">฿{service.totalRevenue.toLocaleString()}</div>
                                    <div className="text-sm text-gray-600">{service.totalBookings} คิว</div>
                                  </div>
                                </div>
                                
                                {/* Duration breakdown for this service */}
                                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                                  {Object.entries(service.durations)
                                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                    .map(([duration, count]) => (
                                      <div key={duration} className="bg-white/60 p-2 rounded-lg text-center border border-gray-100">
                                        <div className="text-sm font-semibold text-gray-800">{duration}น</div>
                                        <div className="text-xs text-blue-600">{count} คิว</div>
                                        <div className="text-xs text-gray-500">
                                          {Math.round((count / service.totalBookings) * 100)}%
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Time and Day Statistics Section */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <ClockIcon className="h-8 w-8 mr-3" />
                      สถิติช่วงเวลาและวันที่ลูกค้าใช้บริการ
                    </h3>
                  </div>
                  <div className="p-6">
                    {calculateTimeStats().totalCompletedBookings === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <ClockIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>ไม่มีข้อมูลเวลาในช่วงวันที่นี้</p>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Day of Week Statistics */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-indigo-500 rounded mr-2"></div>
                            สถิติตามวันในสัปดาห์
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                            {calculateTimeStats().dayOfWeek.map((day, index) => (
                              <div key={day.dayIndex} className={`p-4 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200 ring-2 ring-indigo-300' :
                                index === 1 ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 ring-1 ring-purple-200' :
                                index === 2 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 ring-1 ring-blue-200' :
                                'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                              }`}>
                                <div className="text-center">
                                  <div className="flex items-center justify-center mb-2">
                                    <h5 className="font-semibold text-gray-800">{day.dayName}</h5>
                                    {index === 0 && <span className="ml-2 text-lg">👑</span>}
                                    {index === 1 && <span className="ml-2 text-lg">⭐</span>}
                                    {index === 2 && <span className="ml-2 text-lg">🌟</span>}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="text-2xl font-bold text-indigo-600">{day.totalBookings}</div>
                                    <div className="text-xs text-gray-600">คิว</div>
                                    <div className="text-sm font-medium text-green-600">
                                      ฿{day.totalRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-purple-600">
                                      {Math.round((day.totalBookings / calculateTimeStats().totalCompletedBookings) * 100)}%
                                    </div>
                                  </div>
                                  
                                  {/* Time slot breakdown for this day */}
                                  {Object.keys(day.timeSlots).length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                      <div className="text-xs text-gray-600 mb-2">ช่วงเวลายอดนิยม:</div>
                                      <div className="space-y-1">
                                        {Object.entries(day.timeSlots)
                                          .sort(([,a], [,b]) => b.bookings - a.bookings)
                                          .slice(0, 2)
                                          .map(([timeSlot, data]) => (
                                            <div key={timeSlot} className="flex justify-between text-xs">
                                              <span className="text-gray-600">{timeSlot}:</span>
                                              <span className="font-medium text-indigo-600">{data.bookings} คิว</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Time Slot Statistics */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-purple-500 rounded mr-2"></div>
                            สถิติตามช่วงเวลา
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {calculateTimeStats().timeSlots.map((timeSlot, index) => (
                              <div key={timeSlot.name} className={`p-6 rounded-xl border transition-all duration-200 hover:shadow-lg ${
                                index === 0 ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 ring-2 ring-purple-300' :
                                index === 1 ? 'bg-gradient-to-br from-pink-50 to-rose-50 border-pink-200 ring-1 ring-pink-200' :
                                index === 2 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 ring-1 ring-orange-200' :
                                'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                              }`}>
                                <div className="text-center">
                                  <div className="flex items-center justify-center mb-3">
                                    <div>
                                      <h5 className="font-bold text-gray-800 text-lg">{timeSlot.name}</h5>
                                      <p className="text-sm text-gray-600">{timeSlot.label}</p>
                                    </div>
                                    {index === 0 && <span className="ml-3 text-2xl">👑</span>}
                                    {index === 1 && <span className="ml-3 text-2xl">⭐</span>}
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div className="text-3xl font-bold text-purple-600">{timeSlot.totalBookings}</div>
                                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                                    <div className="text-lg font-medium text-green-600">
                                      ฿{timeSlot.totalRevenue.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-indigo-600 font-medium">
                                      {Math.round((timeSlot.totalBookings / calculateTimeStats().totalCompletedBookings) * 100)}% ของทั้งหมด
                                    </div>
                                  </div>
                                  
                                  {/* Day breakdown for this time slot */}
                                  {Object.keys(timeSlot.dayBreakdown).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                      <div className="text-xs text-gray-600 mb-2">วันที่นิยมมากสุด:</div>
                                      <div className="space-y-1">
                                        {Object.entries(timeSlot.dayBreakdown)
                                          .sort(([,a], [,b]) => b.bookings - a.bookings)
                                          .slice(0, 3)
                                          .map(([day, data]) => (
                                            <div key={day} className="flex justify-between text-xs">
                                              <span className="text-gray-600">{day}:</span>
                                              <span className="font-medium text-purple-600">{data.bookings} คิว</span>
                                            </div>
                                          ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Hourly Statistics */}
                        <div>
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-4 h-4 bg-orange-500 rounded mr-2"></div>
                            สถิติตามช่วงชั่วโมง (เรียงตามความนิยม)
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 xl:grid-cols-9 gap-3">
                            {calculateTimeStats().hours.map((hour, index) => (
                              <div key={hour.hour} className={`p-3 rounded-lg border text-center transition-all duration-200 hover:shadow-md ${
                                index === 0 ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 ring-2 ring-orange-300' :
                                index === 1 ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200 ring-1 ring-amber-200' :
                                index === 2 ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200 ring-1 ring-yellow-200' :
                                'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200'
                              }`}>
                                <div className="space-y-1">
                                  <div className="font-bold text-gray-800 text-sm">{hour.displayHour}</div>
                                  <div className="text-lg font-bold text-orange-600">{hour.totalBookings}</div>
                                  <div className="text-xs text-gray-600">คิว</div>
                                  <div className="text-xs text-green-600 font-medium">
                                    ฿{Math.round(hour.totalRevenue / 1000)}K
                                  </div>
                                  {index === 0 && <div className="text-sm">👑</div>}
                                  {index === 1 && <div className="text-sm">⭐</div>}
                                  {index === 2 && <div className="text-sm">🌟</div>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Peak Hours and Days Summary */}
                        <div className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 p-6 rounded-2xl border border-indigo-200/50">
                          <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <TrophyIcon className="h-6 w-6 text-indigo-600 mr-2" />
                            สรุปช่วงเวลาและวันยอดนิยม
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                              <h5 className="font-semibold text-gray-800">🏆 วันที่มีลูกค้ามากที่สุด</h5>
                              {calculateTimeStats().dayOfWeek.slice(0, 3).map((day, index) => (
                                <div key={day.dayIndex} className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                                  <div className="flex items-center">
                                    {index === 0 && <span className="mr-2">🥇</span>}
                                    {index === 1 && <span className="mr-2">🥈</span>}
                                    {index === 2 && <span className="mr-2">🥉</span>}
                                    <span className="font-medium">{day.dayName}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-indigo-600">{day.totalBookings} คิว</div>
                                    <div className="text-xs text-green-600">฿{day.totalRevenue.toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            <div className="space-y-3">
                              <h5 className="font-semibold text-gray-800">⏰ ช่วงเวลายอดนิยม</h5>
                              {calculateTimeStats().timeSlots.slice(0, 3).map((timeSlot, index) => (
                                <div key={timeSlot.name} className="flex justify-between items-center p-3 bg-white/70 rounded-lg">
                                  <div className="flex items-center">
                                    {index === 0 && <span className="mr-2">🥇</span>}
                                    {index === 1 && <span className="mr-2">🥈</span>}
                                    {index === 2 && <span className="mr-2">🥉</span>}
                                    <div>
                                      <span className="font-medium">{timeSlot.name}</span>
                                      <div className="text-xs text-gray-600">{timeSlot.label}</div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-purple-600">{timeSlot.totalBookings} คิว</div>
                                    <div className="text-xs text-green-600">฿{timeSlot.totalRevenue.toLocaleString()}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Peak hour */}
                          <div className="mt-4 pt-4 border-t border-indigo-200">
                            <h5 className="font-semibold text-gray-800 mb-2">🕐 ชั่วโมงที่คิวเยอะที่สุด</h5>
                            <div className="text-center p-4 bg-gradient-to-r from-orange-100 to-amber-100 rounded-lg">
                              <div className="text-2xl font-bold text-orange-600 mb-1">
                                {calculateTimeStats().hours[0]?.displayHour || 'ไม่มีข้อมูล'}
                              </div>
                              <div className="text-sm text-gray-600">
                                {calculateTimeStats().hours[0]?.totalBookings || 0} คิว • 
                                ฿{calculateTimeStats().hours[0]?.totalRevenue.toLocaleString() || 0}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Therapist Commission Summary Table */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <BanknotesIcon className="h-8 w-8 mr-3" />
                      สรุปรายได้หมอนวด
                    </h3>
                  </div>
                  <div className="p-6">
                    {calculateRangeTherapistCommissions().length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <BanknotesIcon className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                        <p>ไม่มีข้อมูลค่าคอมมิชชั่นในช่วงวันที่นี้</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">อันดับ</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">หมอนวด</th>
                              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">จำนวนคิว</th>
                              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">รายได้รวม</th>
                              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">ค่ามือรวม</th>
                              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">เฉลี่ย/คิว</th>
                              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">% ของรายได้</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculateRangeTherapistCommissions().map((therapist, index) => (
                              <tr key={therapist.id} className={`hover:bg-white/60 transition-all duration-200 ${
                                index === 0 ? 'bg-gradient-to-r from-yellow-50/80 to-orange-50/80' : 
                                index === 1 ? 'bg-gradient-to-r from-gray-50/80 to-slate-50/80' :
                                index === 2 ? 'bg-gradient-to-r from-amber-50/80 to-yellow-50/80' : 'bg-white/40'
                              }`}>
                                <td className="px-6 py-4 border-b border-gray-100">
                                  <div className="flex items-center">
                                    {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                                    {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                                    {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                                    <span className="font-bold text-gray-700">#{index + 1}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-4 border-b border-gray-100">
                                  <div className="font-semibold text-gray-800 text-lg">{therapist.name}</div>
                                </td>
                                <td className="px-6 py-4 text-center border-b border-gray-100">
                                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                                    {therapist.totalBookings}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right border-b border-gray-100">
                                  <span className="text-lg font-bold text-green-600">฿{therapist.totalRevenue.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4 text-right border-b border-gray-100">
                                  <span className="text-xl font-bold text-yellow-600">฿{therapist.totalCommission.toLocaleString()}</span>
                                </td>
                                <td className="px-6 py-4 text-center border-b border-gray-100">
                                  <span className="text-sm font-medium text-gray-600">
                                    ฿{Math.round(therapist.totalCommission / therapist.totalBookings).toLocaleString()}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center border-b border-gray-100">
                                  <span className="text-sm font-medium text-purple-600">
                                    {therapist.totalRevenue > 0 ? Math.round((therapist.totalCommission / therapist.totalRevenue) * 100) : 0}%
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gradient-to-r from-yellow-100 to-orange-100 font-bold">
                              <td className="px-6 py-4 border-t-2 border-yellow-300" colSpan="2">รวมทั้งหมด</td>
                              <td className="px-6 py-4 text-center border-t-2 border-yellow-300">
                                {calculateRangeTherapistCommissions().reduce((sum, t) => sum + t.totalBookings, 0)}
                              </td>
                              <td className="px-6 py-4 text-right border-t-2 border-yellow-300 text-green-700">
                                ฿{calculateRangeTherapistCommissions().reduce((sum, t) => sum + t.totalRevenue, 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 text-right border-t-2 border-yellow-300 text-yellow-700">
                                ฿{calculateRangeTherapistCommissions().reduce((sum, t) => sum + t.totalCommission, 0).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 border-t-2 border-yellow-300" colSpan="2"></td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Daily Breakdown Table */}
                <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                    <h3 className="text-2xl font-bold text-white flex items-center">
                      <CalendarDaysIcon className="h-8 w-8 mr-3" />
                      รายละเอียดรายวัน
                    </h3>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto max-h-96">
                      <table className="w-full">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur-sm">
                          <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">วันที่</th>
                            <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">จำนวนคิว</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">รายได้รวม</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">ค่ามือ</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">กำไรร้าน</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(
                            rangeBookings
                              .filter(b => b.status === 'done')
                              .reduce((acc, booking) => {
                                const date = new Date(booking.startTime).toLocaleDateString('th-TH');
                                if (!acc[date]) {
                                  acc[date] = { count: 0, revenue: 0, commission: 0, shop: 0 };
                                }
                                const service = services.find(s => s.id === booking.serviceId);
                                const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
                                const finalPrice = booking.finalPrice || originalPrice;
                                const commission = booking.therapistCommission || 0;
                                const shopRevenue = booking.shopRevenue || (finalPrice - commission);
                                
                                acc[date].count++;
                                acc[date].revenue += finalPrice;
                                acc[date].commission += commission;
                                acc[date].shop += shopRevenue;
                                return acc;
                              }, {})
                          )
                            .sort(([a], [b]) => new Date(b.split('/').reverse().join('-')) - new Date(a.split('/').reverse().join('-')))
                            .map(([date, data]) => (
                              <tr key={date} className="hover:bg-gray-50/50">
                                <td className="px-6 py-4 border-b border-gray-100 font-medium">{date}</td>
                                <td className="px-6 py-4 text-center border-b border-gray-100">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {data.count}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-right border-b border-gray-100 font-bold text-green-600">
                                  ฿{data.revenue.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right border-b border-gray-100 font-bold text-yellow-600">
                                  ฿{data.commission.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-right border-b border-gray-100 font-bold text-purple-600">
                                  ฿{data.shop.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Daily Report Tab */}
        {viewMode === 'daily' && (
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg mr-4">
                <CalendarDaysIcon className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">รายงานรายวัน</h2>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                เลือกวันที่
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-800"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {loading.daily ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-500 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <ClockIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-1">{dailyBookings.length}</div>
                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <CurrencyDollarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-green-600 mb-1">
                      ฿{calculateDailyRevenue().finalRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้สุทธิ</div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50/80 to-pink-50/80 backdrop-blur-sm p-6 rounded-2xl border border-purple-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <UserGroupIcon className="h-6 w-6" />
                    </div>
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {calculateDailyRevenue().count}
                    </div>
                    <div className="text-sm text-gray-600">คิวเสร็จสิ้น</div>
                  </div>
                </div>

                {/* Revenue Summary */}
                {calculateDailyRevenue().count > 0 && (
                  <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/50 mb-6">
                    <h3 className="font-semibold text-gray-800 mb-4 text-lg">สรุปรายได้</h3>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">รายได้เดิม:</span>
                          <span className="font-medium">฿{calculateDailyRevenue().originalRevenue.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ส่วนลดรวม:</span>
                          <span className="font-medium text-red-600">-฿{calculateDailyRevenue().totalDiscount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between border-t pt-3">
                          <span className="text-gray-800 font-semibold">รายได้สุทธิ:</span>
                          <span className="font-bold text-green-600">฿{calculateDailyRevenue().finalRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">หมอนวดได้รวม:</span>
                          <span className="font-medium text-blue-600">฿{calculateDailyRevenue().totalTherapistCommission.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">ร้านได้รวม:</span>
                          <span className="font-medium text-indigo-600">฿{calculateDailyRevenue().totalShopRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Booking List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {dailyBookings.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                      <CalendarDaysIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg">ไม่มีคิวในวันนี้</p>
                    </div>
                  ) : (
                    dailyBookings
                      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                      .map((booking) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
                        const finalPrice = booking.finalPrice || originalPrice;
                        const discount = originalPrice - finalPrice;
                        
                        return (
                          <div key={booking.id} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/30 hover:shadow-xl transition-all duration-300">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
                                <p className="text-sm text-gray-600">📞 {booking.customerPhone}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-4 py-2 rounded-xl text-sm font-bold ${
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {booking.status === 'pending' ? 'รอคิว' :
                                   booking.status === 'in_progress' ? 'กำลังนวด' : 'เสร็จแล้ว'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">เวลา:</span> {startTime.toLocaleTimeString('th-TH', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                              <div>
                                <span className="font-medium">คอร์ส:</span> {service?.name}
                              </div>
                              <div>
                                <span className="font-medium">หมอนวด:</span> {therapist?.name}
                              </div>
                              <div>
                                <span className="font-medium">ระยะเวลา:</span> {booking.duration} นาที
                              </div>
                            </div>

                            {/* Revenue Information for completed bookings */}
                            {booking.status === 'done' && (
                              <div className="mt-4 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 rounded-xl border border-green-200/50">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">ราคาเดิม:</span>
                                    <span className="ml-2 font-medium">฿{originalPrice.toLocaleString()}</span>
                                  </div>
                                  {booking.discountType && discount > 0 && (
                                    <div>
                                      <span className="text-gray-600">ส่วนลด:</span>
                                      <span className="ml-2 font-medium text-red-600">
                                        {booking.discountType === 'percentage' 
                                          ? `${booking.discountValue}%` 
                                          : `฿${booking.discountValue.toLocaleString()}`
                                        } (-฿{discount.toLocaleString()})
                                      </span>
                                    </div>
                                  )}
                                  <div className="col-span-2 border-t border-green-300 pt-2 mt-1">
                                    <span className="text-gray-800 font-semibold">รายได้สุทธิ:</span>
                                    <span className="ml-2 text-green-600 font-bold">฿{finalPrice.toLocaleString()}</span>
                                  </div>
                                  
                                  {/* Commission breakdown for completed bookings */}
                                  {(booking.therapistCommission || booking.shopRevenue) && (
                                    <>
                                      <div>
                                        <span className="text-gray-600 text-xs">หมอนวดได้:</span>
                                        <span className="ml-1 text-blue-600 font-medium">
                                          ฿{(booking.therapistCommission || 0).toLocaleString()}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600 text-xs">ร้านได้:</span>
                                        <span className="ml-1 text-indigo-600 font-medium">
                                          ฿{(booking.shopRevenue || 0).toLocaleString()}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Monthly Report Tab */}
        {viewMode === 'monthly' && (
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg mr-4">
                <ChartBarIcon className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">รายงานรายเดือน</h2>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-3 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-md border border-white/30"
              >
                <ArrowLeftCircleIcon className="h-6 w-6 text-gray-700" />
              </button>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-800">
                  {selectedMonth.month}/{selectedMonth.year}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('th-TH', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-3 rounded-xl bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all duration-300 shadow-md border border-white/30"
                disabled={selectedMonth.year === new Date().getFullYear() && selectedMonth.month === new Date().getMonth() + 1}
              >
                <ArrowRightCircleIcon className="h-6 w-6 text-gray-700" />
              </button>
            </div>

            {loading.monthly ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-green-500 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
              </div>
            ) : monthlyData ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-indigo-50/80 to-blue-50/80 backdrop-blur-sm p-6 rounded-2xl border border-indigo-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <CalendarDaysIcon className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-indigo-600 mb-1">{monthlyData.totalBookings}</div>
                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/50 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                      <CurrencyDollarIcon className="h-6 w-6" />
                    </div>
                    <div className="text-4xl font-bold text-green-600 mb-1">
                      ฿{monthlyData.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้รวม</div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/50 mb-6">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">สถิติรายเดือน</h3>
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">คิวเสร็จสิ้น:</span>
                        <span className="font-bold text-green-600">{monthlyData.completedBookings}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">อัตราความสำเร็จ:</span>
                        <span className="font-bold text-blue-600">
                          {monthlyData.totalBookings > 0 ? 
                            Math.round((monthlyData.completedBookings / monthlyData.totalBookings) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">รายได้เฉลี่ย/วัน:</span>
                        <span className="font-bold text-yellow-600">
                          ฿{Math.round(monthlyData.totalRevenue / new Date(selectedMonth.year, selectedMonth.month, 0).getDate()).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">รายได้เฉลี่ย/คิว:</span>
                        <span className="font-bold text-purple-600">
                          ฿{monthlyData.completedBookings > 0 ? 
                            Math.round(monthlyData.totalRevenue / monthlyData.completedBookings).toLocaleString() : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  <h3 className="font-bold text-gray-800 mb-4 text-lg">รายละเอียดรายวัน</h3>
                  {Object.entries(monthlyData.dailyBreakdown)
                    .filter(([day, data]) => data.bookings > 0)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([day, data]) => (
                      <div key={day} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 flex justify-between items-center shadow-md border border-white/30">
                        <div>
                          <span className="font-medium text-gray-800 text-lg">
                            {day} {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('th-TH', { month: 'short' })}
                          </span>
                          <span className="text-sm text-gray-600 ml-2">({data.bookings} คิว)</span>
                        </div>
                        <div className="text-green-600 font-bold text-lg">
                          ฿{data.revenue.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-gray-500">
                <ChartBarIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg">ไม่มีข้อมูลในเดือนนี้</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
