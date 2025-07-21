'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getBookingsByDate, getMonthlyRevenue, getTherapists, getServices } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  CalendarDaysIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  ArrowLeftCircleIcon,
  ArrowRightCircleIcon
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
  const [loading, setLoading] = useState({ daily: false, monthly: false });

  useEffect(() => {
    fetchTherapistsAndServices();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchDailyBookings();
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchMonthlyData();
  }, [selectedMonth]);

  const fetchTherapistsAndServices = async () => {
    try {
      const [therapistsData, servicesData] = await Promise.all([
        getTherapists(),
        getServices()
      ]);
      setTherapists(therapistsData);
      setServices(servicesData);
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
    return completedBookings.reduce((sum, booking) => {
      const service = services.find(s => s.id === booking.serviceId);
      return sum + (service?.priceByDuration?.[booking.duration] || 0);
    }, 0);
  };

  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-600" />
              </Link>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                  รายงานและสถิติ
                </h1>
                <p className="text-gray-600 mt-1">ดูคิวย้อนหลังและรายได้รายเดือน</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Daily Report */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CalendarDaysIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">รายงานรายวัน</h2>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                เลือกวันที่
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-4 py-3 glass-input text-gray-800"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {loading.daily ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-indigo-400 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="glass p-4 text-center">
                    <div className="text-2xl font-bold text-indigo-600">{dailyBookings.length}</div>
                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                  </div>
                  <div className="glass p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      ฿{calculateDailyRevenue().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้</div>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {dailyBookings.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CalendarDaysIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p>ไม่มีคิวในวันนี้</p>
                    </div>
                  ) : (
                    dailyBookings
                      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
                      .map((booking) => {
                        const therapist = therapists.find(t => t.id === booking.therapistId);
                        const service = services.find(s => s.id === booking.serviceId);
                        const startTime = new Date(booking.startTime);
                        const revenue = booking.status === 'done' ? 
                          (service?.priceByDuration?.[booking.duration] || 0) : 0;
                        
                        return (
                          <div key={booking.id} className="glass p-4 border-l-4 border-indigo-400">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-gray-800">{booking.customerName}</h3>
                                <p className="text-sm text-gray-600">📞 {booking.customerPhone}</p>
                              </div>
                              <div className="text-right">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                  'bg-green-100 text-green-800'
                                }`}>
                                  {booking.status === 'pending' ? 'รอคิว' :
                                   booking.status === 'in_progress' ? 'กำลังนวด' : 'เสร็จแล้ว'}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
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
                                <span className="font-medium">รายได้:</span> 
                                <span className="text-green-600 font-bold ml-1">฿{revenue.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </>
            )}
          </div>

          {/* Monthly Report */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <ChartBarIcon className="h-6 w-6 text-indigo-600 mr-2" />
                <h2 className="text-xl font-bold text-gray-800">รายงานรายเดือน</h2>
              </div>
            </div>
            
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 rounded-lg glass-button hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftCircleIcon className="h-6 w-6 text-gray-600" />
              </button>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {selectedMonth.month}/{selectedMonth.year}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('th-TH', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>
              
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 rounded-lg glass-button hover:bg-gray-50 transition-colors"
                disabled={selectedMonth.year === new Date().getFullYear() && selectedMonth.month === new Date().getMonth() + 1}
              >
                <ArrowRightCircleIcon className="h-6 w-6 text-gray-600" />
              </button>
            </div>

            {loading.monthly ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-indigo-400 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลดข้อมูล...</p>
              </div>
            ) : monthlyData ? (
              <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="glass p-4 text-center">
                    <div className="text-3xl font-bold text-indigo-600">{monthlyData.totalBookings}</div>
                    <div className="text-sm text-gray-600">คิวทั้งหมด</div>
                  </div>
                  <div className="glass p-4 text-center">
                    <div className="text-3xl font-bold text-green-600">
                      ฿{monthlyData.totalRevenue.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">รายได้รวม</div>
                  </div>
                </div>

                <div className="glass p-4 mb-6">
                  <h3 className="font-bold text-gray-800 mb-3">สถิติรายเดือน</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">คิวเสร็จสิ้น:</span>
                      <span className="ml-2 font-bold text-green-600">{monthlyData.completedBookings}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">อัตราความสำเร็จ:</span>
                      <span className="ml-2 font-bold text-blue-600">
                        {monthlyData.totalBookings > 0 ? 
                          Math.round((monthlyData.completedBookings / monthlyData.totalBookings) * 100) : 0}%
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">รายได้เฉลี่ย/วัน:</span>
                      <span className="ml-2 font-bold text-yellow-600">
                        ฿{Math.round(monthlyData.totalRevenue / new Date(selectedMonth.year, selectedMonth.month, 0).getDate()).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">รายได้เฉลี่ย/คิว:</span>
                      <span className="ml-2 font-bold text-purple-600">
                        ฿{monthlyData.completedBookings > 0 ? 
                          Math.round(monthlyData.totalRevenue / monthlyData.completedBookings).toLocaleString() : 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Daily Breakdown */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  <h3 className="font-bold text-gray-800 mb-3">รายละเอียดรายวัน</h3>
                  {Object.entries(monthlyData.dailyBreakdown)
                    .filter(([day, data]) => data.bookings > 0)
                    .sort(([a], [b]) => parseInt(b) - parseInt(a))
                    .map(([day, data]) => (
                      <div key={day} className="glass p-3 flex justify-between items-center">
                        <div>
                          <span className="font-medium text-gray-800">
                            {day} {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('th-TH', { month: 'short' })}
                          </span>
                          <span className="text-sm text-gray-600 ml-2">({data.bookings} คิว)</span>
                        </div>
                        <div className="text-green-600 font-bold">
                          ฿{data.revenue.toLocaleString()}
                        </div>
                      </div>
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ChartBarIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>ไม่มีข้อมูลในเดือนนี้</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
