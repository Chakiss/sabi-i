'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices, updateBookingStatus } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { ArrowLeftIcon, ClockIcon, UserIcon, CheckCircleIcon, PlayCircleIcon, PencilIcon } from '@heroicons/react/24/outline';
import EditBookingModal from '@/components/EditBookingModal';

export default function QueuePage() {
  const [bookings, setBookings] = useState([]);
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      
      // Update local state
      setBookings(prev => prev.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus }
          : booking
      ));
      
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
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                📋
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  จัดการคิววันนี้
                </h1>
                <p className="text-gray-600 mt-1">
                  อัพเดทสถานะและติดตามคิว ({sortedBookings.length} คิว)
                  <span className="block text-sm text-gray-500 mt-1">
                    * คิวที่เสร็จแล้วไม่สามารถแก้ไขได้
                  </span>
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Link
                href="/booking"
                className="glass-button px-4 py-2 bg-gradient-to-r from-blue-400 to-blue-600 text-white font-medium hover:shadow-lg transition-all duration-200 flex items-center"
              >
                📝 จองคิวใหม่
              </Link>
              <button
                onClick={fetchData}
                className="glass-button px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                🔄 รีเฟรช
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {sortedBookings.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีคิววันนี้</h2>
            <p className="text-gray-600 mb-6">เมื่อมีการจองคิว รายการจะปรากฏที่นี่</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/booking"
                className="inline-flex items-center justify-center px-6 py-3 glass-button bg-gradient-to-r from-blue-400 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
              >
                📝 จองคิวใหม่
              </Link>
              <button
                onClick={fetchData}
                className="inline-flex items-center justify-center px-6 py-3 glass-button bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
              >
                🔄 รีเฟรชข้อมูล
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* รอคิว */}
            <div className="glass-card p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  ⏳
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">รอคิว</h2>
                  <p className="text-sm text-gray-600">{pendingBookings.length} คิว</p>
                </div>
              </div>
              
              <div className="space-y-4">
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
                  <div className="text-center py-8 text-gray-500">
                    <ClockIcon className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                    <p>ไม่มีคิวที่รอ</p>
                  </div>
                )}
              </div>
            </div>

            {/* กำลังนวด */}
            <div className="glass-card p-6">
              <div className="flex items-center mb-6">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                  💆‍♀️
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800">กำลังนวด</h2>
                  <p className="text-sm text-gray-600">{inProgressBookings.length} คิว</p>
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
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, therapist, service, startTime, onStatusUpdate, onEdit }) {
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
      case 'pending': return '▶️ เริ่มนวด';
      case 'in_progress': return '✅ เสร็จแล้ว';
      case 'done': return null;
      default: return null;
    }
  };
  
  const nextStatus = getNextStatus(booking.status);
  const nextStatusText = getNextStatusText(booking.status);

  return (
    <div className="glass p-4 border-l-4 border-blue-400">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
          {booking.customerPhone && (
            <p className="text-gray-500 text-sm">📞 {booking.customerPhone}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600 font-medium">
            {startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
            -
            {endTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <p className="text-xs text-gray-500">{booking.duration} นาที</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-2 text-sm mb-4">
        <div>
          <span className="text-gray-600">คอร์ส:</span>
          <span className="ml-2 font-semibold text-gray-800">{service?.name}</span>
        </div>
        <div>
          <span className="text-gray-600">หมอนวด:</span>
          <span className="ml-2 font-semibold text-gray-800">{therapist?.name}</span>
        </div>
      </div>
      
      <div className="flex space-x-2">
        {nextStatus ? (
          <>
            <button
              onClick={() => onStatusUpdate(booking.id, nextStatus)}
              className="flex-1 px-4 py-2 glass-button bg-gradient-to-r from-blue-400 to-blue-600 text-white text-sm font-semibold rounded-lg hover:shadow-md transition-all duration-200"
            >
              {nextStatusText}
            </button>
            <button
              onClick={() => onEdit(booking)}
              className="px-3 py-2 glass-button bg-gray-100 text-gray-800 text-sm font-semibold rounded-lg hover:shadow-md transition-all duration-200 flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-1" />
              แก้ไข
            </button>
          </>
        ) : (
          /* คิวที่เสร็จแล้ว - ไม่สามารถแก้ไขได้ */
          <div className="w-full text-center">
            <div className="px-4 py-3 glass bg-green-50 border border-green-200 text-green-700 text-sm font-medium rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              เสร็จสิ้นแล้ว - ไม่สามารถแก้ไขได้
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
