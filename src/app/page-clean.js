'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, updateBookingStatus, getConfig } from '@/lib/firestore';
import { CalendarDaysIcon, ClipboardDocumentListIcon, CurrencyDollarIcon, ChartBarIcon, UserGroupIcon, SparklesIcon, ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, PlayCircleIcon, PencilIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import EditBookingModal from '@/components/EditBookingModal';
import DiscountModal from '@/components/DiscountModal';
import BookingModal from '@/components/BookingModal';
import { debugLog } from '@/lib/debugConfig';

export default function HomePage() {
  // Dashboard states
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
  const [showRevenueDetails, setShowRevenueDetails] = useState(false);
  const [todayBookings, setTodayBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  
  // Queue management states
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [completingBooking, setCompletingBooking] = useState(null);
  const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [dragOverZone, setDragOverZone] = useState(null);

  // Main data fetching function
  const fetchDashboardData = async () => {
    try {
      const [bookings, therapists, services, config] = await Promise.all([
        getTodayBookings(),
        getTherapists(),
        getServices(),
        getConfig()
      ]);

      const activeTherapists = therapists.filter(t => t.status === 'active');
      const completedBookings = bookings.filter(b => b.status === 'done');
      
      // Calculate shop revenue (after commission)
      const totalRevenue = completedBookings.reduce((sum, booking) => {
        const service = services.find(s => s.id === booking.serviceId);
        const originalPrice = service?.priceByDuration?.[booking.duration] || 0;
        const finalPrice = booking.finalPrice || originalPrice;
        
        // If booking already has shopRevenue stored, use it
        if (booking.shopRevenue !== undefined) {
          return sum + booking.shopRevenue;
        }
        
        // ✅ Calculate correctly: therapist commission from ORIGINAL price
        const commissionRate = config?.commissionRate || 0.4;
        const therapistCommission = Math.floor(originalPrice * commissionRate); // From original price
        const shopRevenue = finalPrice - therapistCommission; // What's left after paying therapist
        
        return sum + shopRevenue;
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
            therapistStatus.set(booking.therapistId, 'busy');
          }
        });

      const availableTherapists = activeTherapists.filter(t => 
        !therapistStatus.has(t.id)
      );
      
      const busyTherapists = activeTherapists.filter(t => 
        therapistStatus.has(t.id)
      );

      setTodayStats({
        bookings: bookings.length,
        activeTherapists: activeTherapists.length,
        totalRevenue: totalRevenue,
        completedSessions: completedBookings.length,
        availableTherapists: availableTherapists,
        availableCount: availableTherapists.length,
        busyTherapists: busyTherapists,
        busyCount: busyTherapists.length
      });

      setTodayBookings(bookings);
      setTherapists(therapists);
      setServices(services);
      
      // Debug logging
      debugLog('booking', '🔄 Fetched dashboard data:', {
        bookings: bookings.length,
        bookingStatuses: bookings.map(b => ({ id: b.id, status: b.status, customer: b.customerName }))
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial data load only
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Event handlers
  const handleStatusUpdate = async (bookingId, newStatus, discountData = null) => {
    try {
      debugLog('booking', '🔄 Updating booking status:', { bookingId, newStatus, discountData });
      
      await updateBookingStatus(bookingId, newStatus, discountData);
      toast.success('อัพเดทสถานะสำเร็จ! ✨');
      
      debugLog('booking', '✅ Status updated successfully, refreshing data...');
      
      // Refresh data
      fetchDashboardData();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast.error('เกิดข้อผิดพลาด: ' + error.message);
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
    fetchDashboardData(); // Refresh data after update
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
    fetchDashboardData(); // Refresh data after new booking
  };

  // Drag and drop handlers
  const handleDragStart = (e, booking) => {
    e.dataTransfer.setData('bookingId', booking.id);
    e.dataTransfer.setData('currentStatus', booking.status);
    
    // Add drag effect
    e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = '1';
  };

  const handleDragOver = (e, targetStatus) => {
    e.preventDefault();
    setDragOverZone(targetStatus);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverZone(null);
    }
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    setDragOverZone(null);
    
    const bookingId = e.dataTransfer.getData('bookingId');
    const currentStatus = e.dataTransfer.getData('currentStatus');
    
    if (bookingId && currentStatus !== targetStatus) {
      if (targetStatus === 'done') {
        // For completing, show discount modal
        const booking = todayBookings.find(b => b.id === bookingId);
        if (booking) {
          handleCompleteBooking(booking);
        }
      } else {
        // For other status changes, update directly
        await handleStatusUpdate(bookingId, targetStatus);
      }
    }
  };

  // Calculate statistics for queue display
  const sortedBookings = [...todayBookings].sort((a, b) => {
    const statusPriority = { pending: 1, in_progress: 2, done: 3 };
    if (statusPriority[a.status] !== statusPriority[b.status]) {
      return statusPriority[a.status] - statusPriority[b.status];
    }
    return new Date(a.startTime) - new Date(b.startTime);
  });

  // Group by status
  const pendingBookings = sortedBookings.filter(b => b.status === 'pending');
  const inProgressBookings = sortedBookings.filter(b => b.status === 'in_progress');
  const doneBookings = sortedBookings.filter(b => b.status === 'done');

  // Debug logging
  debugLog('booking', '📊 Dashboard Booking Status:', {
    total: sortedBookings.length,
    pending: pendingBookings.length,
    inProgress: inProgressBookings.length,
    done: doneBookings.length,
    allBookings: sortedBookings.map(b => ({ id: b.id, status: b.status, customer: b.customerName }))
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-textMuted">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-heading text-text mb-2">
            จัดการคิววันนี้
          </h1>
          <p className="text-textMuted">
            {dateTimeUtils.formatThaiDate(new Date())}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-secondary/30 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <CalendarDaysIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-textMuted">การจองวันนี้</p>
                <p className="text-2xl font-bold text-text">{todayStats.bookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-secondary/30 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-textMuted">เสร็จแล้ว</p>
                <p className="text-2xl font-bold text-text">{todayStats.completedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-secondary/30 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-primary/20">
                <CurrencyDollarIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-textMuted">รายได้วันนี้</p>
                <p className="text-2xl font-bold text-text">{todayStats.totalRevenue.toLocaleString()} ฿</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-secondary/30 shadow-sm">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <UserGroupIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-textMuted">นักบำบัดว่าง</p>
                <p className="text-2xl font-bold text-text">{todayStats.availableCount}/{todayStats.activeTherapists}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add New Booking Button */}
        <div className="mb-8 text-center">
          <button
            onClick={handleNewBooking}
            className="px-8 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-200 flex items-center space-x-2 mx-auto"
          >
            <CalendarDaysIcon className="h-5 w-5" />
            <span>เพิ่มการจองใหม่</span>
          </button>
        </div>

        {/* Queue Management Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pending Bookings */}
          <div 
            className={`bg-white rounded-xl p-6 border-2 transition-all duration-200 ${
              dragOverZone === 'pending' ? 'border-yellow-400 bg-yellow-50' : 'border-secondary/30'
            }`}
            onDragOver={(e) => handleDragOver(e, 'pending')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'pending')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text flex items-center">
                <ClockIcon className="h-5 w-5 mr-2 text-yellow-500" />
                รอเริ่ม ({pendingBookings.length})
              </h3>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  therapists={therapists}
                  services={services}
                  onEdit={handleEditBooking}
                  onStatusUpdate={handleStatusUpdate}
                  onComplete={handleCompleteBooking}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  status="pending"
                />
              ))}
              {pendingBookings.length === 0 && (
                <p className="text-textMuted text-center py-8">ไม่มีการจองที่รอเริ่ม</p>
              )}
            </div>
          </div>

          {/* In Progress Bookings */}
          <div 
            className={`bg-white rounded-xl p-6 border-2 transition-all duration-200 ${
              dragOverZone === 'in_progress' ? 'border-blue-400 bg-blue-50' : 'border-secondary/30'
            }`}
            onDragOver={(e) => handleDragOver(e, 'in_progress')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'in_progress')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text flex items-center">
                <PlayCircleIcon className="h-5 w-5 mr-2 text-blue-500" />
                กำลังดำเนินการ ({inProgressBookings.length})
              </h3>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {inProgressBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  therapists={therapists}
                  services={services}
                  onEdit={handleEditBooking}
                  onStatusUpdate={handleStatusUpdate}
                  onComplete={handleCompleteBooking}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  status="in_progress"
                />
              ))}
              {inProgressBookings.length === 0 && (
                <p className="text-textMuted text-center py-8">ไม่มีการจองที่กำลังดำเนินการ</p>
              )}
            </div>
          </div>

          {/* Completed Bookings */}
          <div 
            className={`bg-white rounded-xl p-6 border-2 transition-all duration-200 ${
              dragOverZone === 'done' ? 'border-green-400 bg-green-50' : 'border-secondary/30'
            }`}
            onDragOver={(e) => handleDragOver(e, 'done')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'done')}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text flex items-center">
                <CheckCircleIcon className="h-5 w-5 mr-2 text-green-500" />
                เสร็จแล้ว ({doneBookings.length})
              </h3>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {doneBookings.map((booking) => (
                <BookingCard 
                  key={booking.id} 
                  booking={booking} 
                  therapists={therapists}
                  services={services}
                  onEdit={handleEditBooking}
                  onStatusUpdate={handleStatusUpdate}
                  onComplete={handleCompleteBooking}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  status="done"
                />
              ))}
              {doneBookings.length === 0 && (
                <p className="text-textMuted text-center py-8">ยังไม่มีการจองที่เสร็จ</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isEditModalOpen && editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          therapists={therapists}
          services={services}
          onClose={handleEditModalClose}
          onUpdate={handleBookingUpdate}
        />
      )}

      {isDiscountModalOpen && completingBooking && (
        <DiscountModal
          booking={completingBooking}
          onClose={handleDiscountModalClose}
          onComplete={handleCompleteWithDiscount}
        />
      )}

      {isBookingModalOpen && (
        <BookingModal
          therapists={therapists}
          services={services}
          onClose={handleBookingModalClose}
          onBookingAdded={handleBookingAdded}
        />
      )}
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, therapists, services, onEdit, onStatusUpdate, onComplete, onDragStart, onDragEnd, status }) {
  const therapist = therapists.find(t => t.id === booking.therapistId);
  const service = services.find(s => s.id === booking.serviceId);
  
  const formatTime = (dateString) => {
    return dateTimeUtils.formatTime(new Date(dateString));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอเริ่ม';
      case 'in_progress': return 'กำลังดำเนินการ';
      case 'done': return 'เสร็จแล้ว';
      default: return status;
    }
  };

  const handleStatusClick = () => {
    if (status === 'pending') {
      onStatusUpdate(booking.id, 'in_progress');
    } else if (status === 'in_progress') {
      onComplete(booking);
    }
  };

  return (
    <div
      className="bg-gray-50 rounded-lg p-4 border border-gray-200 cursor-move hover:shadow-md transition-shadow duration-200"
      draggable
      onDragStart={(e) => onDragStart(e, booking)}
      onDragEnd={onDragEnd}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h4 className="font-semibold text-text">{booking.customerName}</h4>
          <p className="text-sm text-textMuted flex items-center">
            <PhoneIcon className="h-3 w-3 mr-1" />
            {booking.customerPhone}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(status)}`}>
          {getStatusText(status)}
        </span>
      </div>
      
      <div className="space-y-1 text-sm text-textMuted mb-3">
        <p className="flex items-center">
          <UserIcon className="h-3 w-3 mr-1" />
          {therapist?.name || 'ไม่ระบุ'}
        </p>
        <p className="flex items-center">
          <SparklesIcon className="h-3 w-3 mr-1" />
          {service?.name || 'ไม่ระบุ'} ({booking.duration} นาที)
        </p>
        <p className="flex items-center">
          <ClockIcon className="h-3 w-3 mr-1" />
          {formatTime(booking.startTime)}
        </p>
        <p className="font-medium text-primary">
          {booking.finalPrice ? booking.finalPrice.toLocaleString() : (service?.priceByDuration?.[booking.duration] || 0).toLocaleString()} ฿
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onEdit(booking)}
          className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 text-text rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center"
        >
          <PencilIcon className="h-3 w-3 mr-1" />
          แก้ไข
        </button>
        
        {status !== 'done' && (
          <button
            onClick={handleStatusClick}
            className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors duration-200 flex items-center justify-center ${
              status === 'pending' 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
          >
            {status === 'pending' ? (
              <>
                <PlayCircleIcon className="h-3 w-3 mr-1" />
                เริ่ม
              </>
            ) : (
              <>
                <CheckCircleIcon className="h-3 w-3 mr-1" />
                เสร็จ
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
