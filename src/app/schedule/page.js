'use client';

import { useState, useEffect } from 'react';
import { getTodayBookings, getTherapists, getServices, getBookingsByDate } from '@/lib/firestore';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { 
  ArrowLeftIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [therapistsData, servicesData] = await Promise.all([
          getTherapists(),
          getServices()
        ]);
        
        setTherapists(therapistsData);
        setServices(servicesData);
        
        // Fetch bookings for selected date
        const bookingsData = await getBookingsByDate(selectedDate);
        setBookings(bookingsData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast.error('ไม่สามารถโหลดข้อมูลได้');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedDate]); // Re-run when selectedDate changes



  // Calendar helpers
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date && date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date && date.toDateString() === selectedDate.toDateString();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'done': return 'bg-green-100 text-green-800 border-green-300';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอคิว';
      case 'in_progress': return 'กำลังนวด';
      case 'done': return 'เสร็จแล้ว';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  if (loading && bookings.length === 0) {
    return (
      <div className="min-h-screen thai-pattern flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const sortedBookings = bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

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
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                📅
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  ตารางคิวล่วงหน้า
                </h1>
                <p className="text-gray-600 mt-1">
                  ดูคิวทั้งหมดในแต่ละวัน
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                <h2 className="text-xl font-bold text-gray-800">
                  {dateTimeUtils.formatMonthYear(currentMonth)}
                </h2>
                
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {getDaysInMonth(currentMonth).map((date, index) => (
                  <button
                    key={index}
                    onClick={() => date && setSelectedDate(date)}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200
                      ${!date ? 'invisible' : ''}
                      ${isToday(date) ? 'bg-blue-100 text-blue-800 font-bold' : ''}
                      ${isSelected(date) ? 'bg-purple-500 text-white' : 'hover:bg-white/50'}
                      ${!isToday(date) && !isSelected(date) ? 'text-gray-700' : ''}
                    `}
                    disabled={!date}
                  >
                    {date?.getDate()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Date Info & Bookings */}
          <div className="space-y-6">
            {/* Date Info */}
            <div className="glass-card p-6">
              <div className="flex items-center mb-4">
                <CalendarDaysIcon className="h-6 w-6 text-purple-600 mr-2" />
                <h3 className="text-lg font-bold text-gray-800">
                  {dateTimeUtils.formatWeekdayDate(selectedDate)}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">จำนวนคิว:</span>
                  <span className="font-semibold">{bookings.length} คิว</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">รอคิว:</span>
                  <span className="text-yellow-600 font-semibold">
                    {bookings.filter(b => b.status === 'pending').length} คิว
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">กำลังนวด:</span>
                  <span className="text-blue-600 font-semibold">
                    {bookings.filter(b => b.status === 'in_progress').length} คิว
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">เสร็จแล้ว:</span>
                  <span className="text-green-600 font-semibold">
                    {bookings.filter(b => b.status === 'done').length} คิว
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="glass-card p-4">
              <h4 className="font-semibold text-gray-800 mb-3">เลือกวันที่เร็ว</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="w-full text-left px-3 py-2 rounded-lg glass-button hover:bg-white/30 text-sm transition-all duration-200"
                >
                  📅 วันนี้
                </button>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg glass-button hover:bg-white/30 text-sm transition-all duration-200"
                >
                  🔜 พรุ่งนี้
                </button>
                <button
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setSelectedDate(nextWeek);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg glass-button hover:bg-white/30 text-sm transition-all duration-200"
                >
                  📆 สัปดาหห์หน้า
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings for Selected Date */}
        <div className="mt-8">
          <div className="glass-card p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6">
              คิววันที่ {dateTimeUtils.formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
            </h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600">กำลังโหลด...</p>
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">ไม่มีคิววันนี้</h3>
                <p className="text-gray-600">ยังไม่มีการจองคิวสำหรับวันที่เลือก</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedBookings.map(booking => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  const startTime = new Date(booking.startTime);
                  const endTime = new Date(startTime.getTime() + booking.duration * 60000);

                  return (
                    <div
                      key={booking.id}
                      className="glass p-4 border-l-4 border-purple-400 hover:shadow-lg transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-bold text-gray-800 text-lg">
                            {booking.customerName}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            📞 {booking.customerPhone}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">เวลา:</span>
                          <div className="font-semibold">
                            {dateTimeUtils.formatTime(startTime)} - {dateTimeUtils.formatTime(endTime)}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">บริการ:</span>
                          <div className="font-semibold">{service?.name}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">หมอนวด:</span>
                          <div className="font-semibold">{therapist?.name}</div>
                        </div>
                        <div>
                          <span className="text-gray-600">ระยะเวลา:</span>
                          <div className="font-semibold">{booking.duration} นาที</div>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <span className="text-gray-600 text-sm">หมายเหตุ: </span>
                          <span className="text-gray-800">{booking.notes}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
