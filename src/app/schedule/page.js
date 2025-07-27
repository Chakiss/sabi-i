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
  const [selectedTherapist, setSelectedTherapist] = useState('all'); // 'all' or therapist id
  const [showCalendar, setShowCalendar] = useState(false);

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

  const isToday = (date) => {
    const today = new Date();
    return date && date.toDateString() === today.toDateString();
  };

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

  const [currentMonth, setCurrentMonth] = useState(new Date());

  const navigateMonth = (direction) => {
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + direction);
      return newMonth;
    });
  };

  const isSelected = (date) => {
    return date && date.toDateString() === selectedDate.toDateString();
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
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

  // Filter bookings based on selected therapist
  const filteredBookings = selectedTherapist === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.therapistId === selectedTherapist);

  // Get therapists who have bookings for the selected date
  const therapistsWithBookings = therapists.filter(therapist => 
    bookings.some(booking => booking.therapistId === therapist.id)
  );

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

  const sortedBookings = filteredBookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

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

        {/* Date Selector & Stats */}
        <div className="mb-8">
          <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[#B89B85]/30">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              
              {/* Date Navigation */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    const prevDay = new Date(selectedDate);
                    prevDay.setDate(selectedDate.getDate() - 1);
                    setSelectedDate(prevDay);
                  }}
                  className="p-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200 shadow-sm"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-[#4E3B31] mb-1">
                    {dateTimeUtils.formatWeekdayDate(selectedDate)}
                  </h2>
                  <p className="text-[#7E7B77] text-sm">
                    {dateTimeUtils.formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    const nextDay = new Date(selectedDate);
                    nextDay.setDate(selectedDate.getDate() + 1);
                    setSelectedDate(nextDay);
                  }}
                  className="p-3 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200 shadow-sm"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Quick Date Selection */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedDate(new Date())}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isToday(selectedDate) 
                      ? 'bg-[#B89B85] text-white shadow-lg' 
                      : 'bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85]'
                  }`}
                >
                  📅 วันนี้
                </button>
                <button
                  onClick={() => {
                    const tomorrow = new Date();
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    setSelectedDate(tomorrow);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] text-sm font-medium transition-all duration-200"
                >
                  🔜 พรุ่งนี้
                </button>
                <button
                  onClick={() => setShowCalendar(true)}
                  className="px-4 py-2 rounded-xl bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] text-sm font-medium transition-all duration-200"
                >
                  📆 เลือกวันที่
                </button>
              </div>

              {/* Queue Statistics */}
              <div className="flex items-center gap-6">
                <div className="bg-gradient-to-r from-[#B89B85]/10 to-[#A1826F]/10 rounded-2xl p-4 border border-[#B89B85]/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#B89B85] flex items-center justify-center text-white text-sm font-bold">
                      📊
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-[#B89B85]">{filteredBookings.length}</div>
                      <div className="text-xs text-[#7E7B77] font-medium">
                        {selectedTherapist === 'all' ? 'คิวทั้งหมด' : 'คิวที่แสดง'}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-[#7E7B77]">รอคิว</span>
                    <span className="text-yellow-600 font-bold">
                      {filteredBookings.filter(b => b.status === 'pending').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-[#7E7B77]">กำลังนวด</span>
                    <span className="text-blue-600 font-bold">
                      {filteredBookings.filter(b => b.status === 'in_progress').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-[#7E7B77]">เสร็จแล้ว</span>
                    <span className="text-green-600 font-bold">
                      {filteredBookings.filter(b => b.status === 'done').length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-[#7E7B77]">ยกเลิก</span>
                    <span className="text-red-600 font-bold">
                      {filteredBookings.filter(b => b.status === 'cancelled').length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings for Selected Date - Full Width */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-white/95 to-[#F8F5F2]/85 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-[#B89B85]/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-[#4E3B31] flex items-center">
                <ClockIcon className="h-6 w-6 mr-3 text-[#B89B85]" />
                รายการคิววันที่ {dateTimeUtils.formatDate(selectedDate, { day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
            </div>

            {/* Therapist Filter */}
            {therapistsWithBookings.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-[#7E7B77] mb-3">กรองตามหมอนวด:</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedTherapist('all')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedTherapist === 'all'
                        ? 'bg-[#B89B85] text-white shadow-md' 
                        : 'bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85]'
                    }`}
                  >
                    👥 ทั้งหมด ({bookings.length})
                  </button>
                  {therapistsWithBookings.map(therapist => (
                    <button
                      key={therapist.id}
                      onClick={() => setSelectedTherapist(therapist.id)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        selectedTherapist === therapist.id
                          ? 'bg-[#B89B85] text-white shadow-md' 
                          : 'bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85]'
                      }`}
                    >
                      👤 {therapist.name} ({bookings.filter(b => b.therapistId === therapist.id).length})
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                <h3 className="text-xl font-bold text-[#4E3B31] mb-2">
                  {selectedTherapist === 'all' ? 'ไม่มีคิววันนี้' : 'ไม่มีคิวสำหรับหมอนวดที่เลือก'}
                </h3>
                <p className="text-[#7E7B77]">
                  {selectedTherapist === 'all' 
                    ? 'ยังไม่มีการจองคิวสำหรับวันที่เลือก' 
                    : 'ลองเลือกหมอนวดคนอื่นหรือดูทั้งหมด'
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Header Row */}
                <div className="flex items-center w-full gap-4 px-4 py-2 bg-[#F8F5F2] rounded-lg">
                  <div className="w-24 flex-shrink-0 text-xs font-semibold text-[#7E7B77] text-center">
                    เวลา
                  </div>
                  <div className="w-32 flex-shrink-0 text-xs font-semibold text-[#7E7B77]">
                    ลูกค้า
                  </div>
                  <div className="w-36 flex-shrink-0 text-xs font-semibold text-[#7E7B77]">
                    บริการ
                  </div>
                  <div className="w-24 flex-shrink-0 text-xs font-semibold text-[#7E7B77]">
                    หมอนวด
                  </div>
                  <div className="w-20 flex-shrink-0 text-xs font-semibold text-[#7E7B77]">
                    สถานะ
                  </div>
                  <div className="w-4 flex-shrink-0 text-xs font-semibold text-[#7E7B77] text-center">
                    📝
                  </div>
                </div>

                {/* Queue Items */}
                {sortedBookings.map(booking => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  const startTime = new Date(booking.startTime);
                  const endTime = new Date(startTime.getTime() + booking.duration * 60000);

                  return (
                    <div
                      key={booking.id}
                      className="bg-white/90 backdrop-blur-sm rounded-xl px-4 py-3 shadow-md border-l-4 border-[#B89B85] hover:shadow-lg transition-all duration-200 h-[60px] flex items-center"
                    >
                      <div className="flex items-center w-full gap-4">
                        
                        {/* Time Section - Compact */}
                        <div className="flex-shrink-0 w-24 text-center">
                          <div className="text-xs font-bold text-[#4E3B31]">
                            {dateTimeUtils.formatTime(startTime)} - {dateTimeUtils.formatTime(endTime)}
                          </div>
                        </div>

                        {/* Customer Name - Fixed width to prevent wrapping */}
                        <div className="w-32 flex-shrink-0">
                          <div className="font-semibold text-[#4E3B31] text-sm truncate">
                            {booking.customerName}
                          </div>
                          <div className="text-xs text-[#7E7B77] truncate">
                            {booking.customerPhone}
                          </div>
                        </div>

                        {/* Service - Fixed width */}
                        <div className="w-36 flex-shrink-0">
                          <div className="text-sm text-[#4E3B31] truncate" title={service?.name}>
                            {service?.name}
                          </div>
                        </div>

                        {/* Therapist - Fixed width */}
                        <div className="w-24 flex-shrink-0">
                          <div className="text-sm text-[#4E3B31] truncate" title={therapist?.name}>
                            {therapist?.name}
                          </div>
                        </div>

                        {/* Status - Fixed width */}
                        <div className="w-20 flex-shrink-0">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(booking.status)} truncate`}>
                            {getStatusText(booking.status)}
                          </span>
                        </div>

                        {/* Notes indicator - Only show if has notes */}
                        <div className="w-4 flex-shrink-0 text-center">
                          {booking.notes && (
                            <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center" title={booking.notes}>
                              <span className="text-xs">📝</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Calendar Modal */}
        {showCalendar && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-white rounded-3xl shadow-2xl p-8 m-4 max-w-md w-full">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={() => navigateMonth(-1)}
                  className="p-2 rounded-lg bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
                
                <h3 className="text-xl font-bold text-[#4E3B31]">
                  {dateTimeUtils.formatMonthYear(currentMonth)}
                </h3>
                
                <button
                  onClick={() => navigateMonth(1)}
                  className="p-2 rounded-lg bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#7E7B77] hover:text-[#B89B85] transition-all duration-200"
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

              <div className="grid grid-cols-7 gap-2 mb-6">
                {getDaysInMonth(currentMonth).map((date, index) => (
                  <button
                    key={index}
                    onClick={() => date && handleDateSelect(date)}
                    className={`
                      aspect-square flex items-center justify-center text-sm rounded-lg transition-all duration-200 font-medium
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

              {/* Calendar Footer */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCalendar(false)}
                  className="flex-1 px-4 py-2 bg-[#ECE8E4] hover:bg-[#B89B85]/10 text-[#4E3B31] hover:text-[#B89B85] rounded-xl font-medium transition-all duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => handleDateSelect(new Date())}
                  className="flex-1 px-4 py-2 bg-[#B89B85] hover:bg-[#A1826F] text-white rounded-xl font-medium transition-all duration-200"
                >
                  วันนี้
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
