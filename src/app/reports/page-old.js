'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBookingsByDate, getMonthlyRevenue, getTherapists, getServices, getConfig } from '@/lib/firestore';
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
  
  const [dailyBookings, setDailyBookings] = useState([]);
  const [monthlyData, setMonthlyData] = useState(null);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState({ daily: false, monthly: false });
  const [activeTab, setActiveTab] = useState('daily'); // 'daily', 'monthly', 'commission'

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
    if (selectedDate) {
      fetchDailyBookings();
    }
  }, [selectedDate, fetchDailyBookings]);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth, fetchMonthlyData]);

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
            onClick={() => setActiveTab('daily')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'daily' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            รายงานรายวัน
          </button>
          <button
            onClick={() => setActiveTab('monthly')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'monthly' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <ChartBarIcon className="h-5 w-5 mr-2" />
            รายงานรายเดือน
          </button>
          <button
            onClick={() => setActiveTab('commission')}
            className={`flex-1 flex items-center justify-center px-6 py-4 rounded-xl font-semibold transition-all duration-300 ${
              activeTab === 'commission' 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg' 
                : 'text-gray-600 hover:bg-white/50'
            }`}
          >
            <BanknotesIcon className="h-5 w-5 mr-2" />
            รายงานค่ามือ
          </button>
        </div>

        {/* Daily Report Tab */}
        {activeTab === 'daily' && (
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
        {activeTab === 'monthly' && (
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

        {/* Commission Report Tab */}
        {activeTab === 'commission' && (
          <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl p-8 border border-white/20">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center text-white shadow-lg mr-4">
                <BanknotesIcon className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">รายงานค่ามือหมอนวด</h2>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                เลือกวันที่
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 bg-white/70 backdrop-blur-sm border border-white/30 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-gray-800"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {loading.daily ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-yellow-500 mx-auto mb-6"></div>
                <p className="text-gray-600 text-lg">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                {calculateTherapistCommissions().length === 0 ? (
                  <div className="text-center py-16 text-gray-500">
                    <BanknotesIcon className="h-16 w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-lg">ไม่มีข้อมูลค่าคอมมิชชั่นในวันนี้</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 backdrop-blur-sm p-6 rounded-2xl border border-blue-200/50 text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                          <UserGroupIcon className="h-6 w-6" />
                        </div>
                        <div className="text-3xl font-bold text-blue-600 mb-1">{calculateTherapistCommissions().length}</div>
                        <div className="text-sm text-gray-600">หมอนวดที่ทำงาน</div>
                      </div>
                      <div className="bg-gradient-to-br from-green-50/80 to-emerald-50/80 backdrop-blur-sm p-6 rounded-2xl border border-green-200/50 text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                          <CurrencyDollarIcon className="h-6 w-6" />
                        </div>
                        <div className="text-3xl font-bold text-green-600 mb-1">
                          ฿{calculateTherapistCommissions().reduce((sum, t) => sum + t.totalRevenue, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">รายได้รวม</div>
                      </div>
                      <div className="bg-gradient-to-br from-yellow-50/80 to-orange-50/80 backdrop-blur-sm p-6 rounded-2xl border border-yellow-200/50 text-center">
                        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center text-white mx-auto mb-3">
                          <BanknotesIcon className="h-6 w-6" />
                        </div>
                        <div className="text-3xl font-bold text-yellow-600 mb-1">
                          ฿{calculateTherapistCommissions().reduce((sum, t) => sum + t.totalCommission, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600">ค่ามือรวม</div>
                      </div>
                    </div>

                    {/* Therapist Commission Table */}
                    <div className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-sm rounded-2xl border border-white/30 overflow-hidden">
                      <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-6">
                        <div className="flex items-center">
                          <TrophyIcon className="h-8 w-8 text-white mr-3" />
                          <h3 className="text-2xl font-bold text-white">ตารางค่าคอมมิชชั่นหมอนวด</h3>
                        </div>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">อันดับ</th>
                              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b border-gray-200">หมอนวด</th>
                              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">จำนวนคิว</th>
                              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">รายได้รวม</th>
                              <th className="px-6 py-4 text-right text-sm font-bold text-gray-700 border-b border-gray-200">ค่าคอมมิชชั่น</th>
                              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b border-gray-200">เฉลี่ย/คิว</th>
                            </tr>
                          </thead>
                          <tbody>
                            {calculateTherapistCommissions().map((therapist, index) => (
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
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Detailed breakdown for each therapist */}
                    <div className="space-y-6">
                      <h4 className="text-xl font-bold text-gray-800">รายละเอียดแต่ละหมอนวด</h4>
                      {calculateTherapistCommissions().map((therapist) => (
                        <div key={therapist.id} className="bg-gradient-to-br from-white/90 to-gray-50/80 backdrop-blur-sm rounded-2xl border border-white/30 overflow-hidden">
                          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4">
                            <h5 className="text-lg font-bold text-white">{therapist.name}</h5>
                            <p className="text-indigo-100">
                              {therapist.totalBookings} คิว • ค่ามือรวม ฿{therapist.totalCommission.toLocaleString()}
                            </p>
                          </div>
                          <div className="p-6">
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 font-semibold text-gray-700">ลูกค้า</th>
                                    <th className="text-left py-3 font-semibold text-gray-700">บริการ</th>
                                    <th className="text-center py-3 font-semibold text-gray-700">นาที</th>
                                    <th className="text-right py-3 font-semibold text-gray-700">ราคา</th>
                                    <th className="text-right py-3 font-semibold text-gray-700">ค่ามือ</th>
                                    <th className="text-center py-3 font-semibold text-gray-700">เวลา</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {therapist.bookings.map((booking, bookingIndex) => (
                                    <tr key={bookingIndex} className="border-b border-gray-100 hover:bg-gray-50/50">
                                      <td className="py-3">{booking.customerName}</td>
                                      <td className="py-3">{booking.serviceName}</td>
                                      <td className="py-3 text-center">{booking.duration}</td>
                                      <td className="py-3 text-right font-medium">฿{booking.finalPrice.toLocaleString()}</td>
                                      <td className="py-3 text-right font-bold text-yellow-600">฿{booking.commission.toLocaleString()}</td>
                                      <td className="py-3 text-center text-xs text-gray-500">
                                        {new Date(booking.startTime).toLocaleTimeString('th-TH', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
