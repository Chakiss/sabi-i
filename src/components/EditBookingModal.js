'use client';

import { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  PhoneIcon, 
  SparklesIcon, 
  CalendarIcon, 
  ClockIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import { updateBooking, getTherapists, getServices } from '@/lib/firestore';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import { toast } from 'react-hot-toast';

export default function EditBookingModal({ booking, isOpen, onClose, onUpdate }) {
  // iPad iOS 15 detection
  const [isOnIpad, setIsOnIpad] = useState(false);
  
  useEffect(() => {
    const isIpadDevice = /iPad|Macintosh/i.test(navigator.userAgent) && 
      'ontouchend' in document ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    setIsOnIpad(isIpadDevice);
    
    if (isIpadDevice && isOpen) {
      // Prevent body scroll on iPad when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }
    
    return () => {
      if (isIpadDevice) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
    };
  }, [isOpen]);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    therapistId: '',
    date: '',
    time: '',
    duration: 60,
    discountType: 'amount', // 'amount' or 'percentage'
    discountValue: 0,
    finalPrice: 0
  });
  
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [dayBookings, setDayBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasBeenOpened, setHasBeenOpened] = useState(false); // Track if modal has been opened

  // Auto-calculate final price when discount or service changes
  useEffect(() => {
    if (formData.serviceId && formData.duration) {
      const selectedService = services.find(s => s.id === formData.serviceId);
      const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
      
      if (originalPrice > 0) {
        let discountAmount = 0;
        if (formData.discountType === 'percentage') {
          discountAmount = originalPrice * (formData.discountValue / 100);
        } else {
          discountAmount = formData.discountValue;
        }
        
        const calculatedFinal = Math.max(0, originalPrice - discountAmount);
        
        // Always update finalPrice to calculated value
        setFormData(prev => ({ ...prev, finalPrice: calculatedFinal }));
      }
    }
  }, [formData.serviceId, formData.duration, formData.discountType, formData.discountValue, services]);

  useEffect(() => {
    if (isOpen && booking) {
      console.log('📊 EditBookingModal: Opening with booking data:', booking);
      setHasBeenOpened(true); // Mark that modal has been opened
      
      // Reset loading state when modal opens
      setDataLoading(true);
      
      // Load booking data into form
      const startDateTime = new Date(booking.startTime);
      
      // Split into separate date and time for better iPad compatibility
      const year = startDateTime.getFullYear();
      const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(startDateTime.getDate()).padStart(2, '0');
      const hours = String(startDateTime.getHours()).padStart(2, '0');
      const minutes = String(startDateTime.getMinutes()).padStart(2, '0');
      
      const date = `${year}-${month}-${day}`;
      const time = `${hours}:${minutes}`;
      
      const newFormData = {
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        serviceId: booking.serviceId || '',
        therapistId: booking.therapistId || '',
        date: date,
        time: time,
        duration: booking.duration || 60,
        discountType: booking.discountType || 'amount',
        discountValue: booking.discountValue || 0,
        finalPrice: booking.finalPrice || 0
      };
      
      console.log('📊 EditBookingModal: Setting form data:', newFormData);
      setFormData(newFormData);
      
      // Load therapists and services
      loadData();
    } else if (!isOpen && hasBeenOpened) {
      // Only reset states when modal closes after being opened
      console.log('📊 EditBookingModal: Closing modal, resetting states');
      setDataLoading(true);
      setTherapists([]);
      setServices([]);
      setHasBeenOpened(false); // Reset the flag
    }
  }, [isOpen, booking, hasBeenOpened]);

  const loadData = async () => {
    try {
      console.log('📊 EditBookingModal: Loading therapists and services...');
      
      const [therapistsData, servicesData] = await Promise.all([
        getTherapists(),
        getServices()
      ]);
      
      console.log('📊 EditBookingModal: Loaded data:', {
        therapists: therapistsData.length,
        services: servicesData.length
      });
      
      setTherapists(therapistsData); // Show all therapists for editing (including day_off)
      setServices(servicesData);
      
      console.log('📊 EditBookingModal: Data loaded successfully');
    } catch (error) {
      console.error('❌ EditBookingModal: Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + error.message);
    } finally {
      setDataLoading(false);
      console.log('📊 EditBookingModal: Loading completed');
    }
  };

  // Load bookings for selected date to check availability
  useEffect(() => {
    const loadBookingsForDate = async () => {
      if (formData.date) {
        try {
          const { getBookingsByDate } = await import('@/lib/firestore');
          const bookings = await getBookingsByDate(formData.date);
          // Filter out current booking being edited
          const otherBookings = bookings.filter(b => b.id !== booking?.id);
          setDayBookings(otherBookings);
        } catch (error) {
          console.error('Error loading bookings:', error);
          setDayBookings([]);
        }
      }
    };

    loadBookingsForDate();
  }, [formData.date, booking?.id]);

  // Generate available time slots when therapist, date, or duration changes
  useEffect(() => {
    if (!formData.therapistId || !formData.date || !formData.duration) {
      setAvailableSlots([]);
      return;
    }

    const generateSlots = () => {
      const slots = [];
      
      // Generate slots from 9:00 to 22:00 in 15-minute intervals
      for (let hour = 9; hour < 22; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotStart = new Date(`${formData.date}T${timeStr}`);
          const slotEnd = new Date(slotStart.getTime() + formData.duration * 60000);
          
          // Check if this slot conflicts with existing bookings
          const hasConflict = dayBookings.some(booking => {
            if (booking.therapistId !== formData.therapistId) return false;
            if (booking.status === 'cancelled' || booking.status === 'done') return false;
            
            const bookingStart = new Date(booking.startTime);
            const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);
            
            // Check for time overlap
            return (slotStart < bookingEnd && slotEnd > bookingStart);
          });
          
          if (!hasConflict) {
            const slotDate = new Date(`${formData.date}T${timeStr}`);
            slots.push({
              value: timeStr,
              label: slotDate.toLocaleTimeString('th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
              })
            });
          }
        }
      }
      
      setAvailableSlots(slots);
    };

    generateSlots();
  }, [formData.therapistId, formData.date, formData.duration, dayBookings]);

  // Reset time selection if it becomes unavailable (but keep current time if editing)
  useEffect(() => {
    if (formData.time && availableSlots.length > 0) {
      const isTimeAvailable = availableSlots.find(slot => slot.value === formData.time);
      // If time is not available and it's not the original booking time, clear it
      if (!isTimeAvailable && booking) {
        const originalTime = new Date(booking.startTime).toTimeString().slice(0, 5);
        if (formData.time !== originalTime) {
          setFormData(prev => ({ ...prev, time: '' }));
        }
      }
    }
  }, [availableSlots, formData.time, booking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validation
      if (!formData.customerName.trim()) {
        toast.error('กรุณากรอกชื่อลูกค้า');
        return;
      }

      if (!formData.customerPhone.trim()) {
        toast.error('กรุณาใส่เบอร์โทรศัพท์');
        return;
      }

      // ตรวจสอบเบอร์โทรศัพท์ให้มี 10 หลัก
      if (formData.customerPhone.length !== 10) {
        toast.error('เบอร์โทรศัพท์ต้องมี 10 หลักเท่านั้น');
        return;
      }

      if (!formData.serviceId) {
        toast.error('กรุณาเลือกบริการ');
        return;
      }

      if (!formData.therapistId) {
        toast.error('กรุณาเลือกหมอนวด');
        return;
      }

      if (!formData.date) {
        toast.error('กรุณาเลือกวันที่');
        return;
      }

      if (!formData.time) {
        toast.error('กรุณาเลือกเวลา');
        return;
      }

      // Prepare update data
      const selectedService = services.find(s => s.id === formData.serviceId);
      const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
      
      const updateData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        serviceId: formData.serviceId,
        therapistId: formData.therapistId,
        startTime: new Date(`${formData.date}T${formData.time}`),
        duration: formData.duration,
        originalPrice: originalPrice, // เก็บราคาเต็มก่อนลด
        discountType: formData.discountType || 'amount',
        discountValue: formData.discountValue || 0,
        finalPrice: formData.finalPrice || 0
      };

      await updateBooking(booking.id, updateData);
      
      toast.success('แก้ไขคิวสำเร็จแล้ว! 🎉');
      onUpdate(); // Refresh parent data
      onClose(); // Close modal
      
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขคิว');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate and display discount information
  const getDiscountInfo = () => {
    if (!formData.serviceId || !formData.duration) return null;
    
    const selectedService = services.find(s => s.id === formData.serviceId);
    const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
    
    if (originalPrice === 0) return null;
    
    let discountAmount = 0;
    if (formData.discountType === 'percentage') {
      discountAmount = originalPrice * (formData.discountValue / 100);
    } else {
      discountAmount = formData.discountValue;
    }
    
    const calculatedFinal = Math.max(0, originalPrice - discountAmount);
    
    return {
      originalPrice,
      discountAmount,
      calculatedFinal,
      hasDiscount: formData.discountValue > 0
    };
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOnIpad ? 'bg-black/50' : 'bg-gradient-to-br from-black/40 via-orange-900/20 to-pink-900/30 backdrop-blur-md'
      }`}
      style={{
        backgroundColor: isOnIpad ? 'rgba(0, 0, 0, 0.5)' : undefined,
        backdropFilter: isOnIpad ? 'none' : 'blur(10px)',
        WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(10px)',
        height: isOnIpad ? '100vh' : '100vh',
        minHeight: isOnIpad ? '100vh' : '100vh',
        maxHeight: isOnIpad ? '100vh' : '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`rounded-3xl shadow-2xl w-full border transform transition-all duration-300 ${
          isOnIpad 
            ? 'bg-white max-w-3xl max-h-[95vh] border-gray-200' 
            : 'bg-gradient-to-br from-white/95 to-orange-50/90 backdrop-blur-xl max-w-2xl max-h-[90vh] border-white/30'
        }`}
        style={{
          backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
          transform: isOnIpad ? 'translateZ(0)' : undefined,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-8 border-b rounded-t-3xl sticky top-0 ${
          isOnIpad 
            ? 'bg-white border-gray-200 z-10' 
            : 'border-white/20 bg-gradient-to-r from-white/90 to-orange-50/80 backdrop-blur-sm'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl ${
              isOnIpad 
                ? 'bg-orange-500' 
                : 'bg-gradient-to-br from-orange-500 to-pink-600'
            }`}>
              <PencilSquareIcon className="h-7 w-7" />
            </div>
            <div>
              <h2 className={`text-3xl font-bold ${
                isOnIpad 
                  ? 'text-gray-800' 
                  : 'bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent'
              }`}>
                แก้ไขคิว
              </h2>
              <p className="text-gray-600 font-medium mt-1">ปรับแต่งข้อมูลการจองคิว</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-3 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 ${
              isOnIpad 
                ? 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700' 
                : 'bg-white/80 hover:bg-red-100/80 hover:text-red-600 text-gray-500'
            }`}
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {dataLoading ? (
          <div className="p-16 text-center">
            <div className="relative mb-8">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-orange-500 border-r-pink-500 mx-auto"></div>
              <div className="absolute inset-0 animate-spin rounded-full h-16 w-16 border-4 border-transparent border-b-orange-300 border-l-pink-300 mx-auto" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            </div>
            <p className="text-gray-600 font-medium text-lg">
              <SparklesIcon className="h-5 w-5 inline mr-2" />
              กำลังโหลดข้อมูลจาก Firebase...
            </p>
            <p className="text-gray-500 text-sm mt-2">
              โหลดข้อมูลหมอนวดและบริการ
            </p>
          </div>
        ) : (
          <div 
            className="flex-1 overflow-y-auto"
            style={{
              WebkitOverflowScrolling: 'touch',
              height: isOnIpad ? 'calc(95vh - 140px)' : 'calc(90vh - 120px)',
              maxHeight: isOnIpad ? 'calc(95vh - 140px)' : 'calc(90vh - 120px)'
            }}
          >
            <form 
              onSubmit={handleSubmit} 
              className={`p-8 space-y-8 ${
                isOnIpad 
                  ? 'bg-white' 
                  : 'bg-gradient-to-br from-white/70 to-orange-50/50 backdrop-blur-sm'
              } rounded-b-3xl`}
            >
            
            {/* Customer Information Section */}
            <div className={`border rounded-2xl p-6 ${
              isOnIpad 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-gradient-to-r from-blue-50/80 to-indigo-50/60 backdrop-blur-sm border-blue-200/30'
            }`}>
              <h3 className={`text-xl font-semibold mb-6 flex items-center ${
                isOnIpad ? 'text-gray-800' : 'text-blue-800'
              }`}>
                <UserIcon className="h-6 w-6 mr-3" />
                ข้อมูลลูกค้า
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <UserIcon className="h-4 w-4 inline mr-2 text-blue-500" />
                    ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-blue-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    placeholder="กรุณาใส่ชื่อลูกค้า"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <PhoneIcon className="h-4 w-4 inline mr-2 text-green-500" />
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => {
                      // ตรวจสอบให้มีแค่ตัวเลขและไม่เกิน 10 หลัก
                      const phoneNumber = e.target.value.replace(/\D/g, '');
                      if (phoneNumber.length <= 10) {
                        setFormData({...formData, customerPhone: phoneNumber});
                      }
                    }}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-blue-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    placeholder="0812345678"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
              </div>
            </div>

            {/* Service Selection Section */}
            <div className={`border rounded-2xl p-6 ${
              isOnIpad 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-gradient-to-r from-purple-50/80 to-pink-50/60 backdrop-blur-sm border-purple-200/30'
            }`}>
              <h3 className={`text-xl font-semibold mb-6 flex items-center ${
                isOnIpad ? 'text-gray-800' : 'text-purple-800'
              }`}>
                <SparklesIcon className="h-6 w-6 mr-3" />
                เลือกบริการ
              </h3>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    บริการ
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-purple-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                  >
                    <option value="">🎯 เลือกบริการที่ต้องการ</option>
                    {services.length === 0 ? (
                      <option disabled>ไม่มีข้อมูลบริการ</option>
                    ) : (
                      services.map(service => (
                        <option key={service.id} value={service.id}>
                          ✨ {service.name} ({service.category})
                        </option>
                      ))
                    )}
                  </select>
                  {services.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ ไม่สามารถโหลดข้อมูลบริการได้
                    </p>
                  )}
                </div>

                {/* Duration Selection */}
                {(() => {
                  const selectedService = services.find(s => s.id === formData.serviceId);
                  if (!selectedService?.priceByDuration) return null;

                  return (
                    <div className="space-y-3">
                      <label className="block text-sm font-semibold text-gray-700">
                        ระยะเวลาและราคา
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {Object.entries(selectedService.priceByDuration).map(([duration, price]) => (
                          <button
                            key={duration}
                            type="button"
                            onClick={() => setFormData({...formData, duration: parseInt(duration)})}
                            className={`p-4 rounded-xl border-2 transition-all duration-200 text-center font-semibold shadow-sm hover:shadow-md ${
                              formData.duration === parseInt(duration)
                                ? 'border-purple-500 bg-purple-100/80 text-purple-700 shadow-lg transform scale-105'
                                : 'border-purple-200/50 bg-white/80 text-gray-700 hover:border-purple-300/70 hover:bg-purple-50/60'
                            }`}
                          >
                            ⏱️ {duration} นาที<br/>
                            <span className="text-lg font-bold">{dateTimeUtils.formatCurrency(price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    หมอนวด
                  </label>
                  <select
                    value={formData.therapistId}
                    onChange={(e) => setFormData({...formData, therapistId: e.target.value})}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-purple-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                  >
                    <option value="">👩‍⚕️ เลือกหมอนวด</option>
                    {therapists.length === 0 ? (
                      <option disabled>ไม่มีข้อมูลหมอนวด</option>
                    ) : (
                      therapists.map(therapist => (
                        <option key={therapist.id} value={therapist.id}>
                          🌟 {therapist.name}
                        </option>
                      ))
                    )}
                  </select>
                  {therapists.length === 0 && (
                    <p className="text-sm text-red-600 mt-1">
                      ⚠️ ไม่สามารถโหลดข้อมูลหมอนวดได้
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Date and Time Section */}
            <div className={`border rounded-2xl p-6 ${
              isOnIpad 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-gradient-to-r from-green-50/80 to-emerald-50/60 backdrop-blur-sm border-green-200/30'
            }`}>
              <h3 className={`text-xl font-semibold mb-6 flex items-center ${
                isOnIpad ? 'text-gray-800' : 'text-green-800'
              }`}>
                <CalendarIcon className="h-6 w-6 mr-3" />
                เวลานัดหมาย
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <CalendarIcon className="h-4 w-4 inline mr-2 text-green-500" />
                    วันที่ *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-green-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <ClockIcon className="h-4 w-4 inline mr-2 text-green-500" />
                    เวลา * {!formData.therapistId && <span className="text-xs text-orange-500">(เลือกหมอนวดก่อน)</span>}
                  </label>
                  <select
                    value={formData.time}
                    onChange={(e) => setFormData({...formData, time: e.target.value})}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 shadow-sm transition-all duration-200 disabled:opacity-50 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-green-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    disabled={!formData.therapistId || !formData.date || !formData.duration}
                  >
                    <option value="">🕐 เลือกเวลา</option>
                    {availableSlots.length === 0 && formData.therapistId && formData.date && formData.duration ? (
                      <option value="" disabled>⏰ ไม่มีเวลาว่างในวันนี้</option>
                    ) : (
                      availableSlots.map(slot => (
                        <option key={slot.value} value={slot.value}>
                          ⏰ {slot.label}
                        </option>
                      ))
                    )}
                    {/* Show current booking time even if it conflicts */}
                    {booking && formData.time && !availableSlots.find(slot => slot.value === formData.time) && (
                      <option value={formData.time}>
                        ⏰ {formData.time} (เวลาปัจจุบัน)
                      </option>
                    )}
                  </select>
                  {availableSlots.length === 0 && formData.therapistId && formData.date && formData.duration && (
                    <p className="text-xs text-orange-600 mt-1">
                      💡 หมอนวดท่านนี้ไม่มีเวลาว่างในวันที่เลือก กรุณาเลือกวันอื่น
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Discount Section */}
            <div className={`border rounded-2xl p-6 ${
              isOnIpad 
                ? 'bg-gray-50 border-gray-200' 
                : 'bg-gradient-to-r from-yellow-50/80 to-orange-50/60 backdrop-blur-sm border-yellow-200/30'
            }`}>
              <h3 className={`text-xl font-semibold mb-6 flex items-center ${
                isOnIpad ? 'text-gray-800' : 'text-yellow-800'
              }`}>
                <SparklesIcon className="h-6 w-6 mr-3" />
                ส่วนลดและราคา
              </h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    📊 ประเภทส่วนลด
                  </label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => {
                      const discountType = e.target.value;
                      setFormData({...formData, discountType, discountValue: 0});
                    }}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-yellow-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                  >
                    <option value="amount">💰 ลดเป็นจำนวนเงิน (บาท)</option>
                    <option value="percentage">📊 ลดเป็นเปอร์เซ็นต์ (%)</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {formData.discountType === 'percentage' ? '📊 ส่วนลด (%)' : '💰 ส่วนลด (บาท)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={formData.discountType === 'percentage' ? "100" : undefined}
                    value={formData.discountValue}
                    onChange={(e) => {
                      const discountValue = parseFloat(e.target.value) || 0;
                      setFormData({...formData, discountValue});
                    }}
                    className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 shadow-sm transition-all duration-200 font-medium ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-yellow-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    placeholder={formData.discountType === 'percentage' ? "0-100" : "0"}
                  />
                </div>
              </div>
              
              {/* Real-time Discount Calculation Display */}
              {(() => {
                const discountInfo = getDiscountInfo();
                
                if (discountInfo) {
                  return (
                    <div className="mt-4 p-4 bg-white/60 rounded-xl border border-yellow-200/40">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex justify-between">
                          <span>💵 ราคาเต็ม:</span>
                          <span className="font-semibold">{dateTimeUtils.formatCurrency(discountInfo.originalPrice)}</span>
                        </div>
                        {discountInfo.hasDiscount && (
                          <div className="flex justify-between text-red-600">
                            <span>🎯 ส่วนลด ({formData.discountType === 'percentage' ? `${formData.discountValue}%` : 'จำนวนเงิน'}):</span>
                            <span className="font-semibold">-{dateTimeUtils.formatCurrency(discountInfo.discountAmount)}</span>
                          </div>
                        )}
                        <hr className="border-yellow-200" />
                        <div className="flex justify-between text-xl font-bold text-green-700">
                          <span>💳 ราคาสุดท้าย:</span>
                          <span>{dateTimeUtils.formatCurrency(discountInfo.calculatedFinal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div className="mt-4 p-4 bg-gray-50/60 rounded-xl border border-gray-200/40">
                      <div className="text-sm text-gray-500 text-center">
                        📋 กรุณาเลือกบริการและระยะเวลาเพื่อดูการคำนวณราคา
                      </div>
                    </div>
                  );
                }
              })()}
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
              <button
                type="button"
                onClick={onClose}
                className={`px-8 py-4 border-2 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] ${
                  isOnIpad 
                    ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50 text-lg min-h-[52px]' 
                    : 'border-gray-300/50 text-gray-700 hover:bg-gray-50/80 hover:border-gray-400/50 backdrop-blur-sm'
                }`}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                ❌ ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading || !formData.customerName || !formData.customerPhone || !formData.serviceId || !formData.therapistId || !formData.date || !formData.time || !formData.duration}
                className={`px-8 py-4 font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center space-x-2 ${
                  isOnIpad 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 text-lg min-h-[52px] disabled:bg-gray-400' 
                    : 'bg-gradient-to-r from-orange-500/90 to-pink-600/90 hover:from-orange-600/90 hover:to-pink-700/90 disabled:from-gray-400/50 disabled:to-gray-500/50 text-white shadow-lg backdrop-blur-sm'
                }`}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  touchAction: 'manipulation'
                }}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-5 w-5" />
                    <span>บันทึกการเปลี่ยนแปลง</span>
                  </>
                )}
              </button>
            </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
