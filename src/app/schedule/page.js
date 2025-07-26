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
      <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-[#ECE8E4] to-[#F0EBE7] flex items-center justify-center">
        <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 text-center border border-[#B89B85]/20 max-w-md mx-4">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-[#B89B85] border-r-[#A1826F] mx-auto"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-b-[#B89B85]/60 border-l-[#A1826F]/60 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-[#7E7B77] font-medium">กำลังโหลดตารางงาน...</p>
        </div>
      </div>
    );
  }

  const sortedBookings = bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-[#ECE8E4] to-[#F0EBE7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B89B85] via-[#A1826F] to-[#B89B85]/80 flex items-center justify-center text-white shadow-lg">
              <CalendarDaysIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4E3B31] via-[#B89B85] to-[#A1826F] bg-clip-text text-transparent">
                ตารางงาน
              </h1>
              <p className="text-[#7E7B77] font-medium">
                <span className="w-2 h-2 bg-[#B89B85] rounded-full mr-2 animate-pulse inline-block"></span>
                จัดการและดูตารางการจองทั้งหมด
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[#B89B85]/30">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200 shadow-sm"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                <h2 className="text-xl font-bold text-[#4E3B31]">
                  {dateTimeUtils.formatMonthYear(currentMonth)}
                </h2>
                
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200 shadow-sm"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'].map(day => (
                  <div key={day} className="text-center text-sm font-semibold text-[#7E7B77] py-2">
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
                      aspect-square flex items-center justify-center text-sm rounded-xl transition-all duration-200 font-medium
                      ${!date ? 'invisible' : ''}
                      ${isToday(date) ? 'bg-[#B89B85]/20 text-[#B89B85] font-bold border border-[#B89B85]/30' : ''}
                      ${isSelected(date) ? 'bg-[#B89B85] text-white shadow-lg' : 'hover:bg-[#B89B85]/10'}
                      ${!isToday(date) && !isSelected(date) ? 'text-[#4E3B31] hover:text-[#B89B85]' : ''}
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
            {/* Date Info - Enhanced Stats Card */}
            <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#B89B85]/30">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#B89B85] to-[#A1826F] flex items-center justify-center text-white mr-3 shadow-lg">
                  <CalendarDaysIcon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#4E3B31]">
                    {dateTimeUtils.formatWeekdayDate(selectedDate)}
                  </h3>
                  <p className="text-[#7E7B77] text-sm">สรุปคิววันที่เลือก</p>
                </div>
              </div>
              
              {/* Queue Statistics */}
              <div className="space-y-4">
                {/* Total Queue Count - Prominent Display */}
                <div className="bg-gradient-to-r from-[#B89B85]/10 to-[#A1826F]/10 rounded-2xl p-4 border border-[#B89B85]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-lg bg-[#B89B85] flex items-center justify-center text-white mr-3 text-sm font-bold">
                        📊
                      </div>
                      <span className="font-semibold text-[#4E3B31]">จำนวนคิวทั้งหมด</span>
                    </div>
                    <span className="text-2xl font-bold text-[#B89B85]">{bookings.length}</span>
                  </div>
                </div>

                {/* Status Breakdown */}
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                      <span className="text-[#7E7B77] text-sm">รอคิว</span>
                    </div>
                    <span className="text-yellow-600 font-bold">
                      {bookings.filter(b => b.status === 'pending').length} คิว
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                      <span className="text-[#7E7B77] text-sm">กำลังนวด</span>
                    </div>
                    <span className="text-blue-600 font-bold">
                      {bookings.filter(b => b.status === 'in_progress').length} คิว
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                      <span className="text-[#7E7B77] text-sm">เสร็จแล้ว</span>
                    </div>
                    <span className="text-green-600 font-bold">
                      {bookings.filter(b => b.status === 'done').length} คิว
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-6 border border-[#B89B85]/30">
              <h4 className="font-semibold text-[#4E3B31] mb-4 flex items-center">
                <SparklesIcon className="h-4 w-4 mr-2 text-[#B89B85]" />
                เลือกวันที่เร็ว
              </h4>
              <div className="space-y-3">
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] text-sm transition-all duration-200 font-medium"
                >
                  📅 วันนี้
                </button>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] text-sm transition-all duration-200 font-medium"
                >
                  🔜 พรุ่งนี้
                </button>
                <button
                  onClick={() => {
                    const nextWeek = new Date();
                    nextWeek.setDate(nextWeek.getDate() + 7);
                    setSelectedDate(nextWeek);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] text-sm transition-all duration-200 font-medium"
                >
                  📆 สัปดาห์หน้า
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings for Selected Date */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[#B89B85]/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#4E3B31] flex items-center">
                <ClockIcon className="h-6 w-6 mr-3 text-[#B89B85]" />
                คิววันที่ {dateTimeUtils.formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <div className="bg-[#B89B85]/10 px-4 py-2 rounded-xl">
                <span className="text-[#B89B85] font-bold">{sortedBookings.length} คิว</span>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <div className="relative mb-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-[#B89B85] border-r-[#A1826F] mx-auto"></div>
                  <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-b-[#B89B85]/60 border-l-[#A1826F]/60 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                </div>
                <p className="text-[#7E7B77] font-medium">กำลังโหลดข้อมูล...</p>
              </div>
            ) : sortedBookings.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-[#F8F5F2] to-[#ECE8E4] rounded-full flex items-center justify-center mb-6 shadow-lg">
                  <CalendarDaysIcon className="h-12 w-12 text-[#B89B85]" />
                </div>
                <h3 className="text-xl font-bold text-[#4E3B31] mb-2">ไม่มีคิววันนี้</h3>
                <p className="text-[#7E7B77]">ยังไม่มีการจองคิวสำหรับวันที่เลือก</p>
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
                      className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 shadow-lg border-l-4 border-[#B89B85] hover:shadow-xl transition-all duration-200"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-bold text-[#4E3B31] text-lg">
                            {booking.customerName}
                          </h4>
                          <p className="text-[#7E7B77] text-sm flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            {booking.customerPhone}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)}`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="bg-[#F8F5F2] rounded-lg p-3">
                          <span className="text-[#7E7B77] block mb-1">เวลา</span>
                          <div className="font-semibold text-[#4E3B31]">
                            {dateTimeUtils.formatTime(startTime)} - {dateTimeUtils.formatTime(endTime)}
                          </div>
                        </div>
                        <div className="bg-[#F8F5F2] rounded-lg p-3">
                          <span className="text-[#7E7B77] block mb-1">บริการ</span>
                          <div className="font-semibold text-[#4E3B31]">{service?.name}</div>
                        </div>
                        <div className="bg-[#F8F5F2] rounded-lg p-3">
                          <span className="text-[#7E7B77] block mb-1">หมอนวด</span>
                          <div className="font-semibold text-[#4E3B31]">{therapist?.name}</div>
                        </div>
                        <div className="bg-[#F8F5F2] rounded-lg p-3">
                          <span className="text-[#7E7B77] block mb-1">ระยะเวลา</span>
                          <div className="font-semibold text-[#4E3B31]">{booking.duration} นาที</div>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                          <span className="text-[#7E7B77] text-sm font-medium">หมายเหตุ: </span>
                          <span className="text-[#4E3B31]">{booking.notes}</span>
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
