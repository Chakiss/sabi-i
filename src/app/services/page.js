'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getServices, addService, updateService, deleteService } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  XMarkIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const servicesData = await getServices();
      setServices(servicesData);
    } catch (error) {
      console.error('Error fetching services:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลคอร์สนวด');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleEditService = (service) => {
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleDeleteService = async (serviceId) => {
    if (!confirm('คุณต้องการลบคอร์สนวดนี้ใช่หรือไม่?')) {
      return;
    }

    try {
      await deleteService(serviceId);
      setServices(services.filter(s => s.id !== serviceId));
      toast.success('ลบคอร์สนวดสำเร็จ!');
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error(error.message || 'เกิดข้อผิดพลาดในการลบคอร์สนวด');
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingService(null);
  };

  const handleServiceUpdate = () => {
    fetchServices(); // Refresh data
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center thai-pattern">
        <div className="glass-card p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">🔄 กำลังโหลดข้อมูลคอร์สนวด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen thai-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Service Button */}
        <div className="flex justify-end mb-6">
          <button
            onClick={handleAddService}
            className="glass-button px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-600 text-white font-medium hover:shadow-lg transition-all duration-200 flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            เพิ่มคอร์สใหม่
          </button>
        </div>

        {services.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <div className="text-6xl mb-4">💆‍♀️</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">ยังไม่มีคอร์สนวด</h2>
            <p className="text-gray-600 mb-6">เริ่มต้นด้วยการเพิ่มคอร์สนวดแรกของคุณ</p>
            <button
              onClick={handleAddService}
              className="inline-flex items-center px-6 py-3 glass-button bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              เพิ่มคอร์สใหม่
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard 
                key={service.id} 
                service={service}
                onEdit={handleEditService}
                onDelete={handleDeleteService}
              />
            ))}
          </div>
        )}
      </div>

      {/* Service Modal */}
      <ServiceModal
        service={editingService}
        isOpen={isModalOpen}
        onClose={handleModalClose}
        onUpdate={handleServiceUpdate}
        loading={formLoading}
        setLoading={setFormLoading}
      />
    </div>
  );
}

// Service Card Component
function ServiceCard({ service, onEdit, onDelete }) {
  const durations = Object.keys(service.priceByDuration).map(d => parseInt(d)).sort((a, b) => a - b);
  const minPrice = Math.min(...Object.values(service.priceByDuration));
  const maxPrice = Math.max(...Object.values(service.priceByDuration));

  return (
    <div className="glass-card p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-1">{service.name}</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {service.category}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => onEdit(service)}
            className="p-2 rounded-lg glass-button hover:bg-blue-50 text-blue-600 transition-colors"
            title="แก้ไข"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(service.id)}
            className="p-2 rounded-lg glass-button hover:bg-red-50 text-red-600 transition-colors"
            title="ลบ"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex items-center text-gray-600 mb-2">
          <CurrencyDollarIcon className="h-4 w-4 mr-1" />
          <span className="text-sm font-medium">ราคา</span>
        </div>
        <div className="text-lg font-bold text-gray-800">
          ฿{minPrice} - ฿{maxPrice}
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">ระยะเวลาและราคา:</h4>
        <div className="grid grid-cols-2 gap-2">
          {durations.map(duration => (
            <div key={duration} className="glass p-2 text-center text-sm">
              <div className="font-medium text-gray-800">{duration} นาที</div>
              <div className="text-purple-600 font-bold">฿{service.priceByDuration[duration]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Service Modal Component
function ServiceModal({ service, isOpen, onClose, onUpdate, loading, setLoading }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    priceByDuration: {
      30: '',
      60: '',
      90: '',
      120: ''
    }
  });

  useEffect(() => {
    if (service) {
      setFormData({
        name: service.name || '',
        category: service.category || '',
        priceByDuration: {
          30: service.priceByDuration['30'] || '',
          60: service.priceByDuration['60'] || '',
          90: service.priceByDuration['90'] || '',
          120: service.priceByDuration['120'] || ''
        }
      });
    } else {
      setFormData({
        name: '',
        category: '',
        priceByDuration: {
          30: '',
          60: '',
          90: '',
          120: ''
        }
      });
    }
  }, [service]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.category) {
      toast.error('กรุณากรอกชื่อคอร์สและหมวดหมู่');
      return;
    }

    // Filter out empty prices
    const priceByDuration = {};
    Object.entries(formData.priceByDuration).forEach(([duration, price]) => {
      if (price && parseFloat(price) > 0) {
        priceByDuration[duration] = parseFloat(price);
      }
    });

    if (Object.keys(priceByDuration).length === 0) {
      toast.error('กรุณาใส่ราคาอย่างน้อย 1 ระยะเวลา');
      return;
    }

    setLoading(true);
    
    try {
      const serviceData = {
        name: formData.name,
        category: formData.category,
        priceByDuration
      };

      if (service) {
        await updateService(service.id, serviceData);
        toast.success('แก้ไขคอร์สนวดสำเร็จ!');
      } else {
        await addService(serviceData);
        toast.success('เพิ่มคอร์สนวดสำเร็จ!');
      }

      onUpdate();
      onClose();
      
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-white/20">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
              💆‍♀️
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {service ? 'แก้ไขคอร์สนวด' : 'เพิ่มคอร์สนวดใหม่'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
          >
            <XMarkIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                ชื่อคอร์สนวด
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500"
                placeholder="เช่น นวดไทยประยุกต์"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                หมวดหมู่
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full px-4 py-3 glass-input text-gray-800"
                required
              >
                <option value="">เลือกหมวดหมู่</option>
                <option value="นวดไทย">นวดไทย</option>
                <option value="อโรม่า">อโรม่า</option>
                <option value="กดจุด">กดจุด</option>
                <option value="ฝ่าเท้า">ฝ่าเท้า</option>
                <option value="พิเศษ">พิเศษ</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              ราคาตามระยะเวลา (บาท)
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[30, 60, 90, 120].map(duration => (
                <div key={duration}>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    {duration} นาที
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={formData.priceByDuration[duration]}
                    onChange={(e) => setFormData({
                      ...formData,
                      priceByDuration: {
                        ...formData.priceByDuration,
                        [duration]: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 glass-input text-gray-800 placeholder-gray-500 text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              * ใส่ราคาเฉพาะระยะเวลาที่ต้องการเปิดบริการ
            </p>
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
              className="px-6 py-3 glass-button bg-gradient-to-r from-purple-400 to-purple-600 text-white font-semibold hover:shadow-lg transition-all duration-200 disabled:opacity-50"
            >
              {loading ? '🔄 กำลังบันทึก...' : (service ? '💾 บันทึกการเปลี่ยนแปลง' : '✨ เพิ่มคอร์สใหม่')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
