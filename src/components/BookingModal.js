'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, PhoneIcon } from '@heroicons/react/24/outline';
import { addBooking } from '@/lib/firestore';
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
    notes: ''
  });
  const [loading, setLoading] = useState(false);

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
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/80 backdrop-blur-sm rounded-t-xl sticky top-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white">
              📝
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">จองคิวใหม่</h2>
              <p className="text-sm text-gray-600">กรอกข้อมูลการจองคิว</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white/60 backdrop-blur-sm">
          
          {/* Customer Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                ชื่อลูกค้า *
              </label>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleInputChange}
                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                placeholder="ชื่อ-นามสกุล"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <PhoneIcon className="h-4 w-4 inline mr-1" />
                เบอร์โทรศัพท์ *
              </label>
              <input
                type="tel"
                name="customerPhone"
                value={formData.customerPhone}
                onChange={handleInputChange}
                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                placeholder="08x-xxx-xxxx"
                required
              />
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              บริการ *
            </label>
            <select
              name="serviceId"
              value={formData.serviceId}
              onChange={handleInputChange}
              className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
              required
            >
              <option value="">เลือกบริการ</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.category})
                </option>
              ))}
            </select>
          </div>

          {/* Duration Selection */}
          {selectedService && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                ระยะเวลา *
              </label>
              <select
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                required
              >
                {Object.entries(selectedService.priceByDuration || {}).map(([duration, price]) => (
                  <option key={duration} value={duration}>
                    {duration} นาที - ฿{price.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Therapist Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมอนวด *
            </label>
            <select
              name="therapistId"
              value={formData.therapistId}
              onChange={handleInputChange}
              className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
              required
            >
              <option value="">เลือกหมอนวด</option>
              {therapists.filter(t => t.status === 'active').map(therapist => (
                <option key={therapist.id} value={therapist.id}>
                  {therapist.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <CalendarIcon className="h-4 w-4 inline mr-1" />
                วันที่ *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <ClockIcon className="h-4 w-4 inline mr-1" />
                เวลา *
              </label>
              <input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
                required
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              หมายเหตุ
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm resize-none"
              placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"
            />
          </div>

          {/* Price Summary */}
          {selectedService && formData.duration && (
            <div className="p-4 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 backdrop-blur-sm border border-blue-200/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700">ราคารวม:</span>
                <span className="text-xl font-bold text-blue-600">
                  ฿{(selectedService.priceByDuration?.[formData.duration] || 0).toLocaleString()}
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {selectedService.name} • {formData.duration} นาที
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-white/40 text-gray-700 rounded-lg hover:bg-white/30 font-medium backdrop-blur-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600/90 hover:bg-blue-700/90 disabled:bg-gray-400/50 text-white rounded-lg font-medium backdrop-blur-sm transition-all flex items-center justify-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2"></div>
                  กำลังจอง...
                </>
              ) : (
                <>
                  📝 จองคิว
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
