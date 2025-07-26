'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, updateBookingStatus } from '@/lib/firestore';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, PlayCircleIcon, PencilIcon, SparklesIcon, PhoneIcon } from '@heroicons/react/24/outline';
import EditBookingModal from '@/components/EditBookingModal';
import DiscountModal from '@/components/DiscountModal';
import BookingModal from '@/components/BookingModal';

export default function QueuePage() {
  const [bookings, setBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
    
    // Auto refresh every 10 seconds
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [bookingsData, therapistsData, servicesData] = await Promise.all([
        getTodayBookings(),
        getTherapists(),
        getServices()
      ]);
      
      setBookings(bookingsData);
      setTherapists(therapistsData);
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId, newStatus, discountData = null) => {
    try {
      await updateBookingStatus(bookingId, newStatus, discountData);
      
      // Update local state
      setBookings(prev => prev.map(booking => {
        if (booking.id === bookingId) {
          const updatedBooking = { ...booking, status: newStatus };
          
          // Add discount data if completing
          if (newStatus === 'done' && discountData) {
            updatedBooking.discountType = discountData.discountType;
            updatedBooking.discountValue = discountData.discountValue;
            updatedBooking.finalPrice = discountData.finalPrice;
            updatedBooking.completedAt = new Date();
          }
          
          return updatedBooking;
        }
        return booking;
      }));
      
      const statusText = {
        'pending': 'รอคิว',
        'in_progress': 'เริ่มนวด',
        'done': 'เสร็จแล้ว'
      };
      
      toast.success(`อัพเดทสถานะเป็น "${statusText[newStatus]}" แล้ว`);
      
      // Play notification sound (optional)
      try {
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => {}); // Ignore if sound fails
      } catch (e) {
        // Ignore sound errors
      }
      
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return ClockIcon;
      case 'in_progress': return PlayCircleIcon;
      case 'done': return CheckCircleIcon;
      default: return ClockIcon;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอคิว';
      case 'in_progress': return 'กำลังนวด';
      case 'done': return 'เสร็จแล้ว';
      default: return 'ไม่ทราบ';
    }
  };

  const handleEditBooking = (booking) => {
    setEditingBooking(booking);
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
    setEditingBooking(null);
  };

  const handleBookingUpdate = () => {
    fetchData(); // Refresh data after update
  };

  const handleCompleteBooking = (booking) => {
    setCompletingBooking(booking);
    setIsDiscountModalOpen(true);
  };

  const handleDiscountModalClose = () => {
    setIsDiscountModalOpen(false);
    setCompletingBooking(null);
  };

  const handleCompleteWithDiscount = async (bookingId, discountData) => {
    await handleStatusUpdate(bookingId, 'done', discountData);
    setIsDiscountModalOpen(false);
    setCompletingBooking(null);
  };

  const handleNewBooking = () => {
    setIsBookingModalOpen(true);
  };

  const handleBookingModalClose = () => {
    setIsBookingModalOpen(false);
  };

  const handleBookingAdded = () => {
    fetchData(); // Refresh data after new booking
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center thai-pattern">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">🔄 กำลังโหลดข้อมูลคิว...</p>
        </div>
      </div>
    );
  }

  // Sort bookings by start time
  const sortedBookings = bookings.sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  
  // Group by status
  const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
  const inProgressBookings = sortedBookings.filter(b => b.status === 'in_progress');
  const doneBookings = sortedBookings.filter(b => b.status === 'done');

  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-50/90 via-indigo-50/80 to-purple-50/70 backdrop-blur-xl border-b border-white/20 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="p-3 rounded-xl bg-white/80 hover:bg-white/90 text-gray-600 hover:text-gray-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </Link>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-xl">
                <SparklesIcon className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  จัดการคิววันนี้
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  อัพเดทสถานะและติดตามคิว ({sortedBookings.length} คิว)
                  <span className="block text-sm text-gray-500 mt-1 font-normal">
                    ✨ คิวที่เสร็จแล้วไม่สามารถแก้ไขได้
                  </span>
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleNewBooking}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <SparklesIcon className="h-5 w-5" />
                <span>จองคิวใหม่</span>
              </button>
              <button
                onClick={fetchData}
                className="px-6 py-3 bg-white/80 hover:bg-white/90 text-gray-700 hover:text-gray-900 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>รีเฟรช</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sortedBookings.length === 0 ? (
          <div className="bg-gradient-to-br from-white/90 to-blue-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-16 text-center border border-white/30">
            <div className="text-8xl mb-6">🌸</div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-700 to-gray-600 bg-clip-text text-transparent mb-4">
              ยังไม่มีคิววันนี้
            </h2>
            <p className="text-gray-600 mb-8 text-lg">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 space-x-2"
              >
                <SparklesIcon className="h-6 w-6" />
                <span>จองคิวใหม่</span>
              </Link>
              <button
                onClick={fetchData}
                className="inline-flex items-center justify-center px-8 py-4 bg-white/80 hover:bg-white/90 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 space-x-2"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>รีเฟรชข้อมูล</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* รอคิว */}
            <div className="bg-gradient-to-br from-yellow-50/90 to-orange-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-yellow-200/50">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg">
                  ⏳
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-yellow-800">รอคิว</h2>
                  <p className="text-yellow-600 font-medium">{pendingBookings.length} คิว</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {pendingBookings.map((booking) => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  const startTime = new Date(booking.startTime);
                  
                  return (
                    <BookingCard 
                      key={booking.id}
                      booking={booking}
                      therapist={therapist}
                      service={service}
                      startTime={startTime}
                      onStatusUpdate={handleStatusUpdate}
                      onEdit={handleEditBooking}
                    />
                  );
                })}
                
                {pendingBookings.length === 0 && (
                  <div className="text-center py-12 text-yellow-600">
                    <ClockIcon className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
                    <p className="text-lg font-medium">ไม่มีคิวที่รอ</p>
                    <p className="text-sm text-yellow-500 mt-2">คิวใหม่จะปรากฏที่นี่</p>
                  </div>
                )}
              </div>
            </div>

            {/* กำลังนวด */}
            <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-blue-200/50">
              <div className="flex items-center mb-8">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg font-bold mr-4 shadow-lg">
                  💆‍♀️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-blue-800">กำลังนวด</h2>
                  <p className="text-blue-600 font-medium">{inProgressBookings.length} คิว</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {inProgressBookings.map((booking) => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  const startTime = new Date(booking.startTime);
                  
                  return (
                    <BookingCard 
                      key={booking.id}
                      booking={booking}
                      therapist={therapist}
                      service={service}
                      startTime={startTime}
                      onStatusUpdate={handleStatusUpdate}
                      onEdit={handleEditBooking}
                      onComplete={handleCompleteBooking}
                    />
                  );
                })}
                
                {inProgressBookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <PlayCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>ไม่มีคิวที่กำลังนวด</p>
                  </div>
                )}
              </div>
            </div>

            {/* เสร็จแล้ว */}
            <div className="glass-card p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  ✅
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">เสร็จแล้ว</h2>
                  <p className="text-sm text-gray-600">{doneBookings.length} คิว</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {doneBookings.map((booking) => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  const startTime = new Date(booking.startTime);
                  
                  return (
                    <BookingCard 
                      key={booking.id}
                      booking={booking}
                      therapist={therapist}
                      service={service}
                      startTime={startTime}
                      onStatusUpdate={handleStatusUpdate}
                      onEdit={handleEditBooking}
                    />
                  );
                })}
                
                {doneBookings.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircleIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>ยังไม่มีคิวที่เสร็จ</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Booking Modal */}
      <EditBookingModal
        booking={editingBooking}
        isOpen={isEditModalOpen}
        onClose={handleEditModalClose}
        onUpdate={handleBookingUpdate}
      />

      {/* Discount Modal */}
      <DiscountModal
        booking={completingBooking}
        isOpen={isDiscountModalOpen}
        onClose={handleDiscountModalClose}
        onComplete={handleCompleteWithDiscount}
      />

      {/* New Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={handleBookingModalClose}
        therapists={therapists}
        services={services}
        onBookingAdded={handleBookingAdded}
      />
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, therapist, service, startTime, onStatusUpdate, onEdit, onComplete }) {
  const endTime = new Date(startTime.getTime() + booking.duration * 60000);
  
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return 'in_progress';
      case 'in_progress': return 'done';
      case 'done': return null;
      default: return null;
    }
  };
  
  const getNextStatusText = (currentStatus) => {
    switch (currentStatus) {
      case 'pending': return '🚀 เริ่มนวด';
      case 'in_progress': return '✨ เสร็จแล้ว';
      case 'done': return null;
      default: return null;
    }
  };

  const getCardGradient = (status) => {
    switch (status) {
      case 'pending': return 'bg-gradient-to-br from-white/95 to-yellow-50/90';
      case 'in_progress': return 'bg-gradient-to-br from-white/95 to-blue-50/90';
      case 'done': return 'bg-gradient-to-br from-white/95 to-green-50/90';
      default: return 'bg-gradient-to-br from-white/95 to-gray-50/90';
    }
  };

  const getBorderColor = (status) => {
    switch (status) {
      case 'pending': return 'border-l-yellow-400';
      case 'in_progress': return 'border-l-blue-400';
      case 'done': return 'border-l-green-400';
      default: return 'border-l-gray-400';
    }
  };
  
  const nextStatus = getNextStatus(booking.status);
  const nextStatusText = getNextStatusText(booking.status);

  // Handle status update - if completing, use onComplete function
  const handleStatusClick = () => {
    if (booking.status === 'in_progress' && nextStatus === 'done') {
      // Create booking object with service price for discount calculation
      const servicePrice = service?.priceByDuration?.[booking.duration] || 0;
      const bookingWithPrice = {
        ...booking,
        serviceName: service?.name,
        servicePrice: servicePrice
      };
      onComplete(bookingWithPrice);
    } else if (nextStatus) {
      onStatusUpdate(booking.id, nextStatus);
    }
  };

  return (
    <div className={`${getCardGradient(booking.status)} backdrop-blur-xl rounded-2xl shadow-xl p-6 border-l-4 ${getBorderColor(booking.status)} border-white/30 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]`}>
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg">
              {booking.customerName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
              {booking.customerPhone && (
                <div className="flex items-center text-gray-600 text-sm mt-1">
                  <PhoneIcon className="h-4 w-4 mr-1 text-green-500" />
                  {booking.customerPhone}
                </div>
              )}
            </div>
          </div>
          {booking.channel && (
            <span className="inline-block px-3 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs font-semibold rounded-full border border-purple-200">
              📍 {booking.channel}
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="bg-white/80 rounded-xl p-3 shadow-md">
            <p className="text-sm text-gray-600 font-bold flex items-center justify-end">
              <ClockIcon className="h-4 w-4 mr-1 text-blue-500" />
              {dateTimeUtils.formatTime(startTime)}
              <span className="mx-1">-</span>
              {dateTimeUtils.formatTime(endTime)}
            </p>
            <p className="text-xs text-gray-500 text-center mt-1">⏱️ {booking.duration} นาที</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white/70 rounded-xl p-4 mb-4 shadow-sm">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium flex items-center">
              <SparklesIcon className="h-4 w-4 mr-1 text-purple-500" />
              คอร์ส:
            </span>
            <div className="text-right">
              <span className="font-bold text-gray-800">{service?.name}</span>
              {service?.priceByDuration?.[booking.duration] && (
                <div className="text-green-600 font-bold text-lg">
                  {dateTimeUtils.formatCurrency(service.priceByDuration[booking.duration])}
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-medium flex items-center">
              <UserIcon className="h-4 w-4 mr-1 text-blue-500" />
              หมอนวด:
            </span>
            <span className="font-bold text-gray-800">🌟 {therapist?.name}</span>
          </div>
        </div>
        
        {/* Show discount info for completed bookings */}
        {booking.status === 'done' && booking.discountType && (
          <div className="mt-4 p-4 bg-gradient-to-r from-green-50/90 to-emerald-50/80 rounded-xl border border-green-200/50 shadow-sm">
            <h4 className="font-semibold text-green-800 mb-3 flex items-center">
              💰 สรุปการชำระเงิน
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">ราคาเดิม:</span>
                <span className="font-medium">{dateTimeUtils.formatCurrency(service?.priceByDuration?.[booking.duration] || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">ส่วนลด:</span>
                <span className="text-red-600 font-medium">
                  {booking.discountType === 'percentage' 
                    ? `${booking.discountValue}%` 
                    : dateTimeUtils.formatCurrency(booking.discountValue)
                  }
                  {' (-'}{dateTimeUtils.formatCurrency((service?.priceByDuration?.[booking.duration] || 0) - (booking.finalPrice || 0))})
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-green-300 pt-2">
                <span className="text-green-800">ราคาสุทธิ:</span>
                <span className="text-green-600">{dateTimeUtils.formatCurrency(booking.finalPrice || 0)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex space-x-3">
        {nextStatus ? (
          <>
            <button
              onClick={handleStatusClick}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <span>{nextStatusText}</span>
            </button>
            <button
              onClick={() => onEdit(booking)}
              className="px-4 py-3 bg-white/80 hover:bg-white/90 text-gray-700 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
          </>
        ) : (
          /* คิวที่เสร็จแล้ว - ไม่สามารถแก้ไขได้ */
          <div className="w-full text-center">
            <div className="px-6 py-4 bg-gradient-to-r from-green-100/90 to-emerald-100/80 border-2 border-green-300/50 text-green-700 font-bold rounded-xl flex items-center justify-center shadow-md">
              <CheckCircleIcon className="h-6 w-6 mr-2" />
              เสร็จสิ้นแล้ว
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
