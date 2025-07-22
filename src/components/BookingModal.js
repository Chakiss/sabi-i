'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, PhoneIcon, SparklesIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { addBooking, getConfig } from '@/lib/firestore';
import { toast } from 'react-hot-toast';

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
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);

  // Load config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const configData = await getConfig();
        setConfig(configData);
      } catch (error) {
        console.error('Error loading config:', error);
      }
    };
    
    loadConfig();
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
        notes: ''
      });
    }
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [isOpen, onClose]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    setLoading(true);
    
    try {
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
        notes: formData.notes.trim() || ''
      };

      await addBooking(bookingData);
      
      toast.success('จองคิวสำเร็จแล้ว! 🎉');
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
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  <PhoneIcon className="h-4 w-4 inline mr-1 text-green-500" />
                  เบอร์โทรศัพท์ *
                </label>
                <input
                  type="tel"
                  name="customerPhone"
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  placeholder="08x-xxx-xxxx"
                  required
                />
              </div>
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
                  เวลา *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-green-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                  required
                />
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
              {/* Customer Channel */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  ลูกค้ารู้จักทางช่องทางไหน
                </label>
                <select
                  name="channel"
                  value={formData.channel}
                  onChange={handleInputChange}
                  className="w-full p-4 border border-orange-200/50 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <option value="">📢 เลือกช่องทาง (ไม่บังคับ)</option>
                  {config?.channels?.map(channel => (
                    <option key={channel} value={channel}>
                      📍 {channel}
                    </option>
                  ))}
                </select>
              </div>

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

          {/* Price Summary */}
          {selectedService && formData.duration && (
            <div className="bg-gradient-to-r from-emerald-100/90 to-green-100/80 backdrop-blur-sm border-2 border-emerald-300/50 rounded-xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-emerald-800 flex items-center">
                  💰 ราคารวม:
                </span>
                <span className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  ฿{(selectedService.priceByDuration?.[formData.duration] || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-emerald-700 bg-white/50 rounded-lg p-2">
                ✨ {selectedService.name} • ⏱️ {formData.duration} นาที
              </div>
            </div>
          )}

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
