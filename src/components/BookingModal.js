'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, PhoneIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { addBooking, getConfig, getBookingsByDate, getCustomers } from '@/lib/firestore';
import { toast } from 'react-hot-toast';

// Helper function to handle different date formats from Firebase
const parseFirebaseDate = (dateValue) => {
  if (!dateValue) return null;
  
  try {
    // Firebase Timestamp with toDate method
    if (typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // Firebase Timestamp with seconds/nanoseconds
    if (dateValue.seconds !== undefined) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Regular Date object or string
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  } catch (error) {
    console.warn('Failed to parse date:', dateValue, error);
    return null;
  }
};

export default function BookingModal({ isOpen, onClose, therapists, services, onBookingAdded }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    therapistId: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: 60,
    channel: '',
    notes: '',
    discountType: 'none',
    discountValue: ''
  });
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [dayBookings, setDayBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Helper function to get display name for channel
  const getChannelDisplayName = (channel) => {
    const channelMap = {
      'facebook': '🌐 Facebook',
      'tiktok': '🎵 TikTok',
      'line': '💬 Line',
      'friend': '👥 เพื่อนแนะนำ',
      'instagram': '📸 Instagram',
      'google': '🔍 Google Search',
      'walk-in': '🚶‍♀️ เดินผ่านมาเจอ',
      'return-customer': '🔄 ลูกค้าเก่า',
      'other': '📋 อื่น ๆ'
    };
    return channelMap[channel] || channel;
  };

  // Load config and customers
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [configData, customersData] = await Promise.all([
          getConfig(),
          getCustomers()
        ]);
        setConfig(configData);
        setCustomers(customersData);
        
        // Debug log to check customer data structure
        console.log('Loaded customers:', customersData);
        if (customersData.length > 0) {
          console.log('First customer lastVisit:', customersData[0].lastVisit, 'type:', typeof customersData[0].lastVisit);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    
    loadInitialData();
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerName: '',
        customerPhone: '',
        serviceId: '',
        therapistId: '',
        date: new Date().toISOString().split('T')[0],
        time: '',
        duration: 60,
        channel: '',
        notes: '',
        discountType: 'none',
        discountValue: ''
      });
      setFilteredCustomers([]);
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Handle ESC key to close modal and click outside suggestions
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (showSuggestions) {
          setShowSuggestions(false);
          setFilteredCustomers([]);
        } else {
          onClose();
        }
      }
    };

    const handleClickOutside = (e) => {
      if (showSuggestions && !e.target.closest('.customer-suggestions')) {
        setShowSuggestions(false);
        setFilteredCustomers([]);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleEscKey);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isOpen, onClose, showSuggestions]);

  // Load bookings for selected date
  useEffect(() => {
    const loadBookingsForDate = async () => {
      if (formData.date) {
        try {
          const bookings = await getBookingsByDate(formData.date);
          setDayBookings(bookings);
        } catch (error) {
          console.error('Error loading bookings:', error);
          setDayBookings([]);
        }
      }
    };

    loadBookingsForDate();
  }, [formData.date]);

  // Generate available time slots when therapist, date, or duration changes
  useEffect(() => {
    if (!formData.therapistId || !formData.date || !formData.duration) {
      setAvailableSlots([]);
      return;
    }

    const generateSlots = () => {
      const slots = [];
      const selectedDate = new Date(formData.date);
      
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

  // Reset time selection if it becomes unavailable
  useEffect(() => {
    if (formData.time && availableSlots.length > 0 && !availableSlots.find(slot => slot.value === formData.time)) {
      setFormData(prev => ({ ...prev, time: '' }));
    }
  }, [availableSlots, formData.time]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle phone number input with customer suggestions
    if (name === 'customerPhone') {
      setFormData(prev => ({ ...prev, [name]: value }));
      
      if (value.trim().length > 0) {
        // Filter customers based on phone number
        const filtered = customers.filter(customer => 
          customer.phone.includes(value) || customer.name.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredCustomers(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setFilteredCustomers([]);
        setShowSuggestions(false);
      }
      return;
    }
    
    // Reset discount value when changing discount type
    if (name === 'discountType') {
      setFormData(prev => ({
        ...prev,
        [name]: value,
        discountValue: '' // Reset discount value
      }));
      return;
    }
    
    // Special handling for discount value
    if (name === 'discountValue') {
      const numValue = parseFloat(value) || 0;
      // Validation for percentage discount
      if (formData.discountType === 'percentage' && numValue > 100) {
        return; // Don't update if percentage > 100
      }
      // Validation for amount discount  
      if (formData.discountType === 'amount' && selectedService) {
        const originalPrice = selectedService.priceByDuration?.[formData.duration] || 0;
        if (numValue > originalPrice) {
          return; // Don't update if discount amount > original price
        }
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle customer selection from suggestions
  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone,
      // Pre-fill channel if customer has preferred channel from previous visits
      channel: customer.preferredChannel || prev.channel
    }));
    setShowSuggestions(false);
    setFilteredCustomers([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName.trim()) {
      toast.error('กรุณาใส่ชื่อลูกค้า');
      return;
    }
    
    if (!formData.customerPhone.trim()) {
      toast.error('กรุณาใส่เบอร์โทรศัพท์');
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
    
    if (!formData.time) {
      toast.error('กรุณาเลือกเวลา');
      return;
    }

    // Validate discount if applied
    if (formData.discountType !== 'none') {
      if (!formData.discountValue || parseFloat(formData.discountValue) <= 0) {
        toast.error('กรุณาใส่ค่าส่วนลดที่ถูกต้อง');
        return;
      }
      
      if (formData.discountType === 'percentage' && parseFloat(formData.discountValue) > 100) {
        toast.error('เปอร์เซ็นต์ส่วนลดไม่ควรเกิน 100%');
        return;
      }
      
      const selectedService = services.find(s => s.id === formData.serviceId);
      const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
      if (formData.discountType === 'amount' && parseFloat(formData.discountValue) >= originalPrice) {
        toast.error('ส่วนลดจำนวนเงินไม่ควรเท่ากับหรือมากกว่าราคาเต็ม');
        return;
      }
    }

    setLoading(true);
    
    try {
      // Get selected service price
      const selectedService = services.find(s => s.id === formData.serviceId);
      const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
      let finalPrice = originalPrice;
      
      // Calculate discount if applied
      if (formData.discountType !== 'none' && formData.discountValue) {
        const discountValue = parseFloat(formData.discountValue);
        if (formData.discountType === 'percentage') {
          const discountAmount = Math.floor(originalPrice * (discountValue / 100));
          finalPrice = Math.max(0, originalPrice - discountAmount);
        } else if (formData.discountType === 'amount') {
          finalPrice = Math.max(0, originalPrice - discountValue);
        }
      }

      // Calculate commission and shop revenue for advance booking with discount
      const commissionRate = config?.commissionRate || 0.4;
      const therapistCommission = Math.floor(finalPrice * commissionRate);
      const shopRevenue = finalPrice - therapistCommission;

      // Create booking data
      const bookingData = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        serviceId: formData.serviceId,
        therapistId: formData.therapistId,
        startTime: new Date(`${formData.date}T${formData.time}`),
        duration: formData.duration,
        status: 'pending',
        channel: formData.channel,
        notes: formData.notes.trim() || '',
        // Add discount information if applied
        ...(formData.discountType !== 'none' && formData.discountValue && {
          discountType: formData.discountType,
          discountValue: parseFloat(formData.discountValue),
          finalPrice: finalPrice,
          therapistCommission: therapistCommission,
          shopRevenue: shopRevenue
        })
      };

      await addBooking(bookingData);
      
      // Success message with discount info
      let successMessage = 'จองคิวสำเร็จแล้ว! 🎉';
      if (formData.discountType !== 'none' && formData.discountValue) {
        const selectedService = services.find(s => s.id === formData.serviceId);
        const originalPrice = selectedService?.priceByDuration?.[formData.duration] || 0;
        successMessage += ` (ราคาเต็ม ฿${originalPrice.toLocaleString()} → ราคาสุทธิ ฿${finalPrice.toLocaleString()})`;
      }
      
      toast.success(successMessage);
      onBookingAdded();
      onClose();
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('เกิดข้อผิดพลาดในการจองคิว');
    } finally {
      setLoading(false);
    }
  };

  // Get selected service for pricing info
  const selectedService = services.find(s => s.id === formData.serviceId);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-black/40 via-purple-900/20 to-blue-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/30 transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/20 bg-gradient-to-r from-white/90 to-blue-50/80 backdrop-blur-sm rounded-t-2xl sticky top-0">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
              <SparklesIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">จองคิวใหม่</h2>
              <p className="text-sm text-gray-600 font-medium">กรอกข้อมูลการจองคิวของคุณ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100/80 hover:text-red-600 rounded-xl transition-all duration-200 text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 bg-gradient-to-br from-white/70 to-blue-50/50 backdrop-blur-sm rounded-b-2xl">
          
          {/* Customer Information Section */}
          <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 backdrop-blur-sm border border-blue-200/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2" />
              ข้อมูลลูกค้า
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  <UserIcon className="h-4 w-4 inline mr-1 text-blue-500" />
                  ชื่อลูกค้า *
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  placeholder="กรุณาใส่ชื่อ-นามสกุล"
                  required
                />
              </div>
              
              <div className="space-y-2 relative customer-suggestions">
                <label className="block text-sm font-semibold text-gray-700">
                  <PhoneIcon className="h-4 w-4 inline mr-1 text-green-500" />
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  onFocus={() => {
                    if (formData.customerPhone.trim().length > 0) {
                      const filtered = customers.filter(customer => 
                        customer.phone.includes(formData.customerPhone) || 
                        customer.name.toLowerCase().includes(formData.customerPhone.toLowerCase())
                      );
                      setFilteredCustomers(filtered);
                      setShowSuggestions(filtered.length > 0);
                    }
                  }}
                  className="w-full p-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  placeholder="08x-xxx-xxxx หรือชื่อลูกค้า"
                  required
                  autoComplete="off"
                />
                
                {/* Helper text */}
                <div className="text-xs text-gray-500 mt-1 flex items-center">
                  <InformationCircleIcon className="h-3 w-3 mr-1 text-blue-400" />
                  💡 พิมพ์เบอร์โทรหรือชื่อลูกค้าเพื่อค้นหาข้อมูลเดิม
                </div>
                
                {/* Customer Suggestions Dropdown */}
                {showSuggestions && filteredCustomers.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white/95 backdrop-blur-xl border border-green-200/50 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                    <div className="p-2 border-b border-gray-100/50">
                      <div className="text-xs font-semibold text-green-600 flex items-center">
                        <SparklesIcon className="h-3 w-3 mr-1" />
                        ลูกค้าในระบบ ({filteredCustomers.length} คน)
                      </div>
                    </div>
                    
                    {filteredCustomers.map((customer, index) => (
                      <div
                        key={customer.phone}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-3 hover:bg-green-50/80 cursor-pointer border-b border-gray-50 last:border-b-0 transition-colors duration-150"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 mr-3">
                            <div className="font-semibold text-gray-800 text-sm">
                              {customer.name}
                            </div>
                            <div className="text-xs text-gray-600 flex items-center mt-1">
                              <PhoneIcon className="h-3 w-3 mr-1 text-green-500" />
                              {customer.phone}
                            </div>
                            {customer.preferredChannel && (
                              <div className="text-xs text-blue-600 flex items-center mt-1">
                                <InformationCircleIcon className="h-3 w-3 mr-1 text-blue-400" />
                                รู้จักจาก: {getChannelDisplayName(customer.preferredChannel)}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 flex flex-col items-end">
                            {customer.totalVisits && (
                              <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium mb-1">
                                {customer.totalVisits} ครั้ง
                              </div>
                            )}
                            {(customer.lastVisit !== null && customer.lastVisit !== undefined) && (
                              <div className="text-xs text-gray-400">
                                มาล่าสุด: {(() => {
                                  const date = parseFirebaseDate(customer.lastVisit);
                                  if (!date) {
                                    console.log('Could not parse lastVisit for customer:', customer.name, 'value:', customer.lastVisit);
                                    return 'ไม่ระบุ';
                                  }
                                  
                                  return date.toLocaleDateString('th-TH', {
                                    day: 'numeric',
                                    month: 'short'
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Customer Channel - Moved here under customer information */}
            <div className="mt-4 space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                <InformationCircleIcon className="h-4 w-4 inline mr-1 text-blue-500" />
                ลูกค้ารู้จักร้านจากไหน
              </label>
              <select
                name="channel"
                value={formData.channel}
                onChange={handleInputChange}
                className="w-full p-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <option value="">📢 เลือกช่องทาง (ไม่บังคับ)</option>
                <option value="facebook">🌐 Facebook</option>
                <option value="tiktok">🎵 TikTok</option>
                <option value="line">💬 Line</option>
                <option value="friend">👥 เพื่อนแนะนำ</option>
                <option value="instagram">📸 Instagram</option>
                <option value="google">🔍 Google Search</option>
                <option value="walk-in">🚶‍♀️ เดินผ่านมาเจอ</option>
                <option value="return-customer">🔄 ลูกค้าเก่า</option>
                <option value="other">📋 อื่น ๆ</option>
              </select>
            </div>
          </div>

          {/* Service Information Section */}
          <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/60 backdrop-blur-sm border border-purple-200/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-purple-800 mb-4 flex items-center">
              <SparklesIcon className="h-5 w-5 mr-2" />
              เลือกบริการ
            </h3>
            
            <div className="space-y-4">
              {/* Service Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  บริการ *
                </label>
                <select
                  name="serviceId"
                  value={formData.serviceId}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                >
                  <option value="">🎯 เลือกบริการที่ต้องการ</option>
                  {services.map(service => (
                    <option key={service.id} value={service.id}>
                      ✨ {service.name} ({service.category})
                    </option>
                  ))}
                </select>
              </div>

              {/* Duration Selection */}
              {selectedService && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    ระยะเวลา *
                  </label>
                  <select
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full p-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                    required
                  >
                    {Object.entries(selectedService.priceByDuration || {}).map(([duration, price]) => (
                      <option key={duration} value={duration}>
                        ⏱️ {duration} นาที - ฿{price.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Therapist Selection */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  หมอนวด *
                </label>
                <select
                  name="therapistId"
                  value={formData.therapistId}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                >
                  <option value="">👩‍⚕️ เลือกหมอนวด</option>
                  {therapists.filter(t => t.status === 'active').map(therapist => (
                    <option key={therapist.id} value={therapist.id}>
                      🌟 {therapist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date and Time Section */}
          <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/60 backdrop-blur-sm border border-green-200/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              เวลานัดหมาย
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  <CalendarIcon className="h-4 w-4 inline mr-1 text-green-500" />
                  วันที่ *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-4 border border-green-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  <ClockIcon className="h-4 w-4 inline mr-1 text-green-500" />
                  เวลา * {!formData.therapistId && <span className="text-xs text-orange-500">(เลือกหมอนวดก่อน)</span>}
                </label>
                <select
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-green-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md disabled:opacity-50"
                  required
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
                </select>
                {availableSlots.length === 0 && formData.therapistId && formData.date && formData.duration && (
                  <p className="text-xs text-orange-600 mt-1">
                    💡 หมอนวดท่านนี้ไม่มีเวลาว่างในวันที่เลือก กรุณาเลือกวันอื่น
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Information Section */}
          <div className="bg-gradient-to-r from-orange-50/80 to-yellow-50/60 backdrop-blur-sm border border-orange-200/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-orange-800 mb-4 flex items-center">
              <InformationCircleIcon className="h-5 w-5 mr-2" />
              ข้อมูลเพิ่มเติม
            </h3>
            
            <div className="space-y-4">
              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  หมายเหตุ
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full p-4 border border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/90 backdrop-blur-sm resize-none shadow-sm transition-all duration-200 hover:shadow-md"
                  placeholder="💭 หมายเหตุเพิ่มเติม (ถ้ามี)"
                />
              </div>
            </div>
          </div>

          {/* Discount Section */}
          <div className="bg-gradient-to-r from-red-50/80 to-pink-50/60 backdrop-blur-sm border border-red-200/30 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              ส่วนลด (ไม่บังคับ)
            </h3>

            <div className="space-y-4">
              {/* Discount Type */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  ประเภทส่วนลด
                </label>
                <select
                  name="discountType"
                  value={formData.discountType}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-red-200/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <option value="none">🚫 ไม่มีส่วนลด</option>
                  <option value="percentage">📊 ส่วนลดเปอร์เซ็นต์</option>
                  <option value="amount">💸 ส่วนลดจำนวนเงิน</option>
                </select>
              </div>

              {/* Discount Value */}
              {formData.discountType !== 'none' && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    {formData.discountType === 'percentage' ? 'เปอร์เซ็นต์ส่วนลด (%)' : 'จำนวนเงินส่วนลด (บาท)'}
                  </label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleInputChange}
                    min="0"
                    max={formData.discountType === 'percentage' ? "100" : undefined}
                    step={formData.discountType === 'percentage' ? "1" : "10"}
                    className="w-full p-4 border border-red-200/50 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                    placeholder={formData.discountType === 'percentage' ? "เช่น 10 (%)" : "เช่น 50 (บาท)"}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Price Summary */}
          {selectedService && formData.duration && (() => {
            const originalPrice = selectedService.priceByDuration?.[formData.duration] || 0;
            let finalPrice = originalPrice;
            let discountAmount = 0;

            // Calculate discount if applied
            if (formData.discountType !== 'none' && formData.discountValue) {
              const discountValue = parseFloat(formData.discountValue);
              if (formData.discountType === 'percentage') {
                discountAmount = Math.floor(originalPrice * (discountValue / 100));
                finalPrice = Math.max(0, originalPrice - discountAmount);
              } else if (formData.discountType === 'amount') {
                discountAmount = Math.min(originalPrice, discountValue); // ป้องกันส่วนลดเกินราคาเต็ม
                finalPrice = Math.max(0, originalPrice - discountAmount);
              }
            }

            // Calculate commission preview if config is available
            const commissionRate = config?.commissionRate || 0.4;
            const therapistCommission = Math.floor(finalPrice * commissionRate);
            const shopRevenue = finalPrice - therapistCommission;

            return (
              <div className="bg-gradient-to-r from-emerald-100/90 to-green-100/80 backdrop-blur-sm border-2 border-emerald-300/50 rounded-xl p-5 shadow-lg">
                <div className="space-y-3">
                  {/* Original Price */}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">ราคาเต็ม:</span>
                    <span className="text-lg font-semibold text-gray-800">฿{originalPrice.toLocaleString()}</span>
                  </div>

                  {/* Discount (if applied) */}
                  {formData.discountType !== 'none' && discountAmount > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-red-600">
                        ส่วนลด ({formData.discountType === 'percentage' ? `${formData.discountValue}%` : 'จำนวนเงิน'}):
                      </span>
                      <span className="text-lg font-semibold text-red-600">-฿{discountAmount.toLocaleString()}</span>
                    </div>
                  )}

                  {/* Final Price */}
                  <div className="flex justify-between items-center pt-3 border-t border-emerald-300/50">
                    <span className="text-lg font-semibold text-emerald-800 flex items-center">
                      💰 ราคาสุทธิ:
                    </span>
                    <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      ฿{finalPrice.toLocaleString()}
                    </span>
                  </div>

                  {/* Service Info */}
                  <div className="text-sm text-emerald-700 bg-white/50 rounded-lg p-2">
                    ✨ {selectedService.name} • ⏱️ {formData.duration} นาที
                  </div>

                  {/* Commission Preview (if config available) */}
                  {config && finalPrice > 0 && (
                    <div className="bg-blue-50/50 rounded-lg p-3 mt-3 space-y-1">
                      <div className="text-xs font-medium text-gray-600 mb-2">💡 การแบ่งรายได้ (ตัวอย่าง):</div>
                      <div className="flex justify-between text-xs">
                        <span className="text-blue-600">หมอนวดได้ ({(commissionRate * 100).toFixed(0)}%):</span>
                        <span className="font-semibold text-blue-600">฿{therapistCommission.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-indigo-600">ร้านได้ ({(100 - commissionRate * 100).toFixed(0)}%):</span>
                        <span className="font-semibold text-indigo-600">฿{shopRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Actions */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-4 border-2 border-gray-300/50 text-gray-700 rounded-xl hover:bg-gray-50/80 hover:border-gray-400/50 font-semibold backdrop-blur-sm transition-all duration-200 transform hover:scale-[1.02]"
            >
              ❌ ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-700/90 hover:to-purple-700/90 disabled:from-gray-400/50 disabled:to-gray-500/50 text-white rounded-xl font-semibold backdrop-blur-sm transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:shadow-none flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                  กำลังจอง...
                </>
              ) : (
                <>
                  ✨ จองคิว
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
