'use client';

import { useState, useEffect } from 'react';
import { getTherapists, getServices, addBooking, getTodayBookings, getCustomers, getCustomerByPhone } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function BookingPage() {
  const [therapists, setTherapists] = useState([]);
  const [services, setServices] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [phoneSearchResults, setPhoneSearchResults] = useState([]);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    serviceId: '',
    therapistId: '',
    startTime: '',
    duration: 60
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Fetching booking page data...');
        const [therapistsData, servicesData, bookingsData, customersData] = await Promise.all([
          getTherapists(),
          getServices(),
          getTodayBookings(),
          getCustomers()
        ]);
        
        console.log('👥 Therapists:', therapistsData);
        console.log('🛍️ Services:', servicesData);
        console.log('📅 Bookings:', bookingsData);
        console.log('👤 Customers:', customersData);
        
        setTherapists(therapistsData.filter(t => t.status === 'active'));
        setServices(servicesData);
        setTodayBookings(bookingsData);
        setCustomers(customersData);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Handle phone number input and search
  const handlePhoneChange = async (value) => {
    setFormData(prev => ({ ...prev, customerPhone: value }));
    
    if (value.length >= 3) {
      const results = customers.filter(customer =>
        customer.phone.includes(value) || customer.name.includes(value)
      );
      setPhoneSearchResults(results);
      setShowPhoneSuggestions(results.length > 0);
    } else {
      setPhoneSearchResults([]);
      setShowPhoneSuggestions(false);
    }
  };

  // Handle customer selection from suggestions
  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({
      ...prev,
      customerName: customer.name,
      customerPhone: customer.phone
    }));
    setShowPhoneSuggestions(false);
    setPhoneSearchResults([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.customerName || !formData.customerPhone || !formData.serviceId || !formData.therapistId || !formData.startTime) {
      toast.error('กรุณากรอกข้อมูลให้ครบทุกช่อง');
      return;
    }

    try {
      const startDateTime = new Date(formData.startTime);
      
      console.log('📝 Submitting booking:', {
        ...formData,
        startTime: startDateTime,
        duration: formData.duration
      });
      
      // ตรวจสอบการชนกันของเวลา
      const conflictBooking = todayBookings.find(booking => {
        if (booking.therapistId !== formData.therapistId) return false;
        
        const bookingStart = new Date(booking.startTime);
        const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60000);
        const newBookingEnd = new Date(startDateTime.getTime() + formData.duration * 60000);
        
        return (startDateTime < bookingEnd && newBookingEnd > bookingStart);
      });

      if (conflictBooking) {
        toast.error('หมอนวดคนนี้มีคิวในเวลาดังกล่าวแล้ว');
        return;
      }

      const bookingId = await addBooking({
        ...formData,
        startTime: startDateTime,
        duration: formData.duration
      });
      
      console.log('✅ Booking created with ID:', bookingId);

      toast.success('จองคิวสำเร็จ!');
      
      // รีเซ็ตฟอร์ม
      setFormData({
        customerName: '',
        customerPhone: '',
        serviceId: '',
        therapistId: '',
        startTime: '',
        duration: 60
      });

      // โหลดข้อมูลใหม่
      console.log('🔄 Refreshing today bookings...');
      const updatedBookings = await getTodayBookings();
      console.log('📅 Updated bookings:', updatedBookings);
      setTodayBookings(updatedBookings);
      
    } catch (error) {
      console.error('Error adding booking:', error);
      toast.error('เกิดข้อผิดพลาดในการจองคิว');
    }
  };

  const selectedService = services.find(s => s.id === formData.serviceId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center thai-pattern">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-yellow-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">🌸 กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen thai-pattern">
      {/* Header */}
      <div className="glass-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <Link
              href="/"
              className="mr-4 p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
            >
              <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
            </Link>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                📅
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  จองคิวลูกค้า
                </h1>
                <p className="text-gray-600 mt-1 font-medium">
                  ลงคิวและจัดหมอนวดให้ลูกค้า
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                📝
              </div>
              <h2 className="text-2xl font-bold text-gray-800">ข้อมูลการจอง</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ชื่อลูกค้า
                </label>
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                  className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500"
                  placeholder="กรอกชื่อลูกค้า"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  เบอร์ติดต่อ
                </label>
                <input
                  type="tel"
                  value={formData.customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  onFocus={() => {
                    if (phoneSearchResults.length > 0) {
                      setShowPhoneSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    // Delay hiding to allow click on suggestions
                    setTimeout(() => setShowPhoneSuggestions(false), 200);
                  }}
                  className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500"
                  placeholder="กรอกเบอร์ติดต่อ (เช่น 081-234-5678)"
                />
                {showPhoneSuggestions && phoneSearchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg max-h-60 overflow-auto border border-gray-200">
                    <div className="px-3 py-2 bg-gray-50 text-xs text-gray-600 font-semibold border-b">
                      ลูกค้าเดิม ({phoneSearchResults.length} คน)
                    </div>
                    {phoneSearchResults.map(customer => (
                      <div
                        key={customer.phone}
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50 transition-all border-b border-gray-100 last:border-b-0"
                        onClick={() => handleCustomerSelect(customer)}
                      >
                        <div className="font-semibold text-gray-800">{customer.name}</div>
                        <div className="text-sm text-gray-500">{customer.phone}</div>
                        {customer.totalVisits && (
                          <div className="text-xs text-blue-600 mt-1">
                            มาใช้บริการ {customer.totalVisits} ครั้ง
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
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
              </div>

              {selectedService && (
                <>
                  <div className="glass p-4 mb-4 border-l-4 border-blue-400">
                    <h4 className="font-bold text-gray-800 mb-2">รายละเอียดคอร์ส</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">ชื่อคอร์ส:</span>
                        <span className="ml-2 font-semibold text-gray-800">{selectedService.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">หมวดหมู่:</span>
                        <span className="ml-2 font-semibold text-gray-800">{selectedService.category}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      ระยะเวลา (นาที)
                    </label>
                    <select
                      value={formData.duration}
                      onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                      className="w-full px-4 py-3 glass-input text-gray-800"
                    >
                      {Object.entries(selectedService.priceByDuration || {}).map(([duration, price]) => (
                        <option key={duration} value={duration}>
                          {duration} นาที - ฿{price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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
                      {therapist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  วันที่และเวลาเริ่ม
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                  className="w-full px-4 py-3 glass-input text-gray-800"
                />
              </div>

              <button
                type="submit"
                className="w-full glass-button py-4 px-6 text-lg font-bold"
              >
                🌸 จองคิว
              </button>
            </form>
          </div>

          {/* Today's Bookings */}
          <div className="glass-card p-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                📋
              </div>
              <h2 className="text-2xl font-bold text-gray-800">คิววันนี้</h2>
            </div>
            
            {todayBookings.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-500 text-lg">ยังไม่มีคิววันนี้</p>
                <p className="text-gray-400 text-sm mt-2">เริ่มจองคิวแรกของวันกันเลย!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {todayBookings.map((booking, index) => {
                  const therapist = therapists.find(t => t.id === booking.therapistId);
                  const service = services.find(s => s.id === booking.serviceId);
                  
                  return (
                    <div key={booking.id} className="glass p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-gray-800 text-lg">{booking.customerName}</h3>
                          {booking.customerPhone && (
                            <p className="text-gray-500 text-sm font-medium">📞 {booking.customerPhone}</p>
                          )}
                          <p className="text-gray-600 font-medium">
                            {service?.name} ({booking.duration} นาที)
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                          booking.status === 'pending' ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                          booking.status === 'in_progress' ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                          'bg-gradient-to-r from-green-400 to-green-500 text-white'
                        }`}>
                          {booking.status === 'pending' ? '⏳ รอคิว' :
                           booking.status === 'in_progress' ? '💆‍♀️ กำลังนวด' : '✅ เสร็จแล้ว'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <p className="text-gray-600">
                          <span className="font-semibold">หมอนวด:</span> {therapist?.name}
                        </p>
                        <p className="text-gray-600">
                          <span className="font-semibold">เวลา:</span> {new Date(booking.startTime).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
