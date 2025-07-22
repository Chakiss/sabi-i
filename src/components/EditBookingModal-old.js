'use client';

import { useState, useEffect } from 'react';
import { updateBooking, getTherapists, getServices, getTodayBookings } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { XMarkIcon, PencilSquareIcon, UserIcon, PhoneIcon, ClockIcon, CalendarIcon, SparklesIcon } from '@heroicons/react/24/outline';

export default function EditBookingModal({ booking, isOpen, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    therapistId: '',
    startTime: '',
    duration: 60
  });
  
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (isOpen && booking) {
      // Load booking data into form
      const startDateTime = new Date(booking.startTime);
      const formattedDateTime = startDateTime.toISOString().slice(0, 16); // Format for datetime-local input
      
      setFormData({
        customerName: booking.customerName || '',
        customerPhone: booking.customerPhone || '',
        serviceId: booking.serviceId || '',
        therapistId: booking.therapistId || '',
        startTime: formattedDateTime,
        duration: booking.duration || 60
      });
      
      // Load therapists and services
      loadData();
    }
  }, [isOpen, booking]);

  const loadData = async () => {
    try {
      const [therapistsData, servicesData] = await Promise.all([
        getTherapists(),
        getServices()
      ]);
      
      setTherapists(therapistsData.filter(t => t.status === 'active'));
      setServices(servicesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setDataLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.serviceId || !formData.therapistId || !formData.startTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    setLoading(true);
    
    try {
      const startDateTime = new Date(formData.startTime);
      
      // Check for conflicts (exclude current booking)
      const todayBookings = await getTodayBookings();
      const conflictBooking = todayBookings.find(b => {
        if (b.id === booking.id || b.therapistId !== formData.therapistId) return false;
        
        const bookingStart = new Date(b.startTime);
        const bookingEnd = new Date(bookingStart.getTime() + b.duration * 60000);
        const newBookingEnd = new Date(startDateTime.getTime() + formData.duration * 60000);
        
        return (startDateTime < bookingEnd && newBookingEnd > bookingStart);
      });

      if (conflictBooking) {
        toast.error('หมอนวดคนนี้มีคิวในเวลาดังกล่าวแล้ว');
        return;
      }

      await updateBooking(booking.id, {
        customerName: formData.customerName,
        customerPhone: formData.customerPhone,
        serviceId: formData.serviceId,
        therapistId: formData.therapistId,
        startTime: startDateTime,
        duration: formData.duration
      });

      toast.success('แก้ไขคิวสำเร็จ!');
      onUpdate(); // Refresh parent data
      onClose(); // Close modal
      
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('เกิดข้อผิดพลาดในการแก้ไขคิว');
    } finally {
      setLoading(false);
    }
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
              กำลังโหลดข้อมูล...
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
                    onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                    className="w-full px-5 py-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-medium"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                คอร์สนวด
              </label>
              <select
                value={formData.serviceId}
                onChange={(e) => setFormData({...formData, serviceId: e.target.value})}
                className="w-full px-4 py-3 glass-input text-gray-800"
              >
                <option value="">เลือกคอร์สนวด</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.category})
                  </option>
                ))}
              </select>
              
              {formData.serviceId && (
                <div className="mt-3 p-4 bg-blue-50 rounded-lg">
                  {(() => {
                    const selectedService = services.find(s => s.id === formData.serviceId);
                    return selectedService && (
                      <div>
                        <h4 className="font-semibold text-blue-900 mb-2">{selectedService.name}</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          {Object.entries(selectedService.priceByDuration).map(([duration, price]) => (
                            <button
                              key={duration}
                              type="button"
                              onClick={() => setFormData({...formData, duration: parseInt(duration)})}
                              className={`p-2 rounded border text-center transition-colors ${
                                formData.duration === parseInt(duration)
                                  ? 'bg-blue-500 text-white border-blue-500'
                                  : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50'
                              }`}
                            >
                              {duration} นาที<br/>
                              <span className="font-semibold">฿{price}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                หมอนวด
              </label>
              <select
                value={formData.therapistId}
                onChange={(e) => setFormData({...formData, therapistId: e.target.value})}
                className="w-full px-4 py-3 glass-input text-gray-800"
              >
                <option value="">เลือกหมอนวด</option>
                {therapists.map(therapist => (
                  <option key={therapist.id} value={therapist.id}>
                    {therapist.name} ({therapist.id})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                วันที่และเวลา
              </label>
              <input
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full px-4 py-3 glass-input text-gray-800"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="flex justify-end space-x-4 pt-6 border-t border-white/20">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 glass-button text-gray-700 hover:text-gray-900 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 glass-button bg-gradient-to-r from-orange-400 to-orange-600 text-white font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
              >
                {loading ? '🔄 กำลังบันทึก...' : '💾 บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
