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
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    therapistId: '',
    startTime: '',
    duration: 60,
    discountType: 'amount', // 'amount' or 'percentage'
    discountValue: 0,
    finalPrice: 0
  });
  
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

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
      
      // Reset loading state when modal opens
      setDataLoading(true);
      
      // Load booking data into form
      const startDateTime = new Date(booking.startTime);
      
      // Format for datetime-local input (consider timezone)
      const year = startDateTime.getFullYear();
      const month = String(startDateTime.getMonth() + 1).padStart(2, '0');
      const day = String(startDateTime.getDate()).padStart(2, '0');
      const hours = String(startDateTime.getHours()).padStart(2, '0');
      const minutes = String(startDateTime.getMinutes()).padStart(2, '0');
      const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      const newFormData = {
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        serviceId: booking.serviceId || '',
        therapistId: booking.therapistId || '',
        startTime: formattedDateTime,
        duration: booking.duration || 60,
        discountType: booking.discountType || 'amount',
        discountValue: booking.discountValue || 0,
        finalPrice: booking.finalPrice || 0
      };
      
      console.log('📊 EditBookingModal: Setting form data:', newFormData);
      setFormData(newFormData);
      
      // Load therapists and services
      loadData();
    } else if (!isOpen) {
      // Reset states when modal closes
      console.log('📊 EditBookingModal: Closing modal, resetting states');
      setDataLoading(true);
      setTherapists([]);
      setServices([]);
    }
  }, [isOpen, booking]);

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

      if (!formData.startTime) {
        toast.error('กรุณาเลือกวันที่และเวลา');
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
        startTime: new Date(formData.startTime),
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
      className="fixed inset-0 bg-gradient-to-br from-black/40 via-orange-900/20 to-pink-900/30 backdrop-blur-md flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-gradient-to-br from-white/95 to-orange-50/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/30 transform transition-all duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-white/20 bg-gradient-to-r from-white/90 to-orange-50/80 backdrop-blur-sm rounded-t-3xl sticky top-0">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-pink-600 flex items-center justify-center text-white shadow-xl">
              <PencilSquareIcon className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
                แก้ไขคิว
              </h2>
              <p className="text-gray-600 font-medium mt-1">ปรับแต่งข้อมูลการจองคิว</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/80 hover:bg-red-100/80 hover:text-red-600 transition-all duration-200 text-gray-500 shadow-md hover:shadow-lg transform hover:scale-105"
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
          <form onSubmit={handleSubmit} className="p-8 space-y-8 bg-gradient-to-br from-white/70 to-orange-50/50 backdrop-blur-sm rounded-b-3xl">
            
            {/* Customer Information Section */}
            <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/60 backdrop-blur-sm border border-blue-200/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-blue-800 mb-6 flex items-center">
                <UserIcon className="h-6 w-6 mr-3" />
                ข้อมูลลูกค้า
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    <UserIcon className="h-4 w-4 inline mr-2 text-blue-500" />
                    ชื่อลูกค้า
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                    className="w-full px-5 py-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
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
                    className="w-full px-5 py-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
                    placeholder="0812345678"
                    maxLength="10"
                    pattern="[0-9]{10}"
                  />
                </div>
              </div>
            </div>

            {/* Service Selection Section */}
            <div className="bg-gradient-to-r from-purple-50/80 to-pink-50/60 backdrop-blur-sm border border-purple-200/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-purple-800 mb-6 flex items-center">
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
                    className="w-full px-5 py-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
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
                    className="w-full px-5 py-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
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
            <div className="bg-gradient-to-r from-green-50/80 to-emerald-50/60 backdrop-blur-sm border border-green-200/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-green-800 mb-6 flex items-center">
                <CalendarIcon className="h-6 w-6 mr-3" />
                เวลานัดหมาย
              </h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  <ClockIcon className="h-4 w-4 inline mr-2 text-green-500" />
                  วันที่และเวลา
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full px-5 py-4 border border-green-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            </div>

            {/* Discount Section */}
            <div className="bg-gradient-to-r from-yellow-50/80 to-orange-50/60 backdrop-blur-sm border border-yellow-200/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-yellow-800 mb-6 flex items-center">
                <SparklesIcon className="h-6 w-6 mr-3" />
                ส่วนลดและราคา
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    className="w-full px-5 py-4 border border-yellow-200/50 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
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
                    className="w-full px-5 py-4 border border-yellow-200/50 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
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
                className="px-8 py-4 border-2 border-gray-300/50 text-gray-700 rounded-xl hover:bg-gray-50/80 hover:border-gray-400/50 font-semibold backdrop-blur-sm transition-all duration-200 transform hover:scale-[1.02]"
              >
                ❌ ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-4 bg-gradient-to-r from-orange-500/90 to-pink-600/90 hover:from-orange-600/90 hover:to-pink-700/90 disabled:from-gray-400/50 disabled:to-gray-500/50 text-white rounded-xl font-semibold backdrop-blur-sm transition-all duration-200 transform hover:scale-[1.02] shadow-lg disabled:shadow-none flex items-center justify-center space-x-2"
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
        )}
      </div>
    </div>
  );
}
