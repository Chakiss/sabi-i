'use client';

import { useState, useEffect } from 'react';
import { getTherapists, addTherapist, updateTherapist } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline';

export default function TherapistsPage() {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTherapist, setEditingTherapist] = useState(null);
  const [showDayOffModal, setShowDayOffModal] = useState(false);
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [dayOffDate, setDayOffDate] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'active',
    startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchTherapists();
  }, []);

  const fetchTherapists = async () => {
    try {
      const data = await getTherapists();
      setTherapists(data);
    } catch (error) {
      console.error('Error fetching therapists:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('กรุณากรอกชื่อหมอนวด');
      return;
    }

    try {
      if (editingTherapist) {
        // Update existing therapist
        await updateTherapist(editingTherapist.id, formData);
        toast.success('อัพเดทข้อมูลสำเร็จ!');
      } else {
        // Add new therapist
        await addTherapist(formData);
        toast.success('เพิ่มหมอนวดสำเร็จ!');
      }

      // Reset form
      setFormData({
        name: '',
        status: 'active',
        startDate: new Date().toISOString().split('T')[0]
      });
      setShowAddForm(false);
      setEditingTherapist(null);
      
      // Refresh data
      fetchTherapists();
      
    } catch (error) {
      console.error('Error saving therapist:', error);
      toast.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  const handleEdit = (therapist) => {
    setEditingTherapist(therapist);
    setFormData({
      name: therapist.name,
      status: therapist.status,
      startDate: therapist.startDate ? new Date(therapist.startDate).toISOString().split('T')[0] : ''
    });
    setShowAddForm(true);
  };

  const handleResign = async (therapist) => {
    if (!confirm(`ต้องการให้ ${therapist.name} ลาออกใช่หรือไม่?`)) {
      return;
    }

    try {
      await updateTherapist(therapist.id, {
        status: 'resigned',
        endDate: new Date()
      });
      toast.success('อัพเดทสถานะสำเร็จ!');
      fetchTherapists();
    } catch (error) {
      console.error('Error updating therapist status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

  const handleDayOff = async (therapist) => {
    if (therapist.status === 'day_off') {
      // กลับมาทำงาน - ไม่ต้องใส่วันที่
      if (!confirm(`ต้องการให้ ${therapist.name} กลับมาทำงานใช่หรือไม่?`)) {
        return;
      }

      try {
        await updateTherapist(therapist.id, {
          status: 'active',
          dayOffDate: null // ลบวันที่หยุด
        });
        toast.success('อัพเดทสถานะสำเร็จ!');
        fetchTherapists();
      } catch (error) {
        console.error('Error updating therapist status:', error);
        toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
      }
    } else {
      // หยุดงาน - ต้องใส่วันที่
      setSelectedTherapist(therapist);
      setDayOffDate(new Date().toISOString().split('T')[0]);
      setShowDayOffModal(true);
    }
  };

  const handleConfirmDayOff = async () => {
    if (!dayOffDate) {
      toast.error('กรุณาเลือกวันที่หยุด');
      return;
    }

    try {
      await updateTherapist(selectedTherapist.id, {
        status: 'day_off',
        dayOffDate: dayOffDate
      });
      toast.success('อัพเดทสถานะสำเร็จ!');
      setShowDayOffModal(false);
      setSelectedTherapist(null);
      setDayOffDate('');
      fetchTherapists();
    } catch (error) {
      console.error('Error updating therapist status:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
    }
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link
                href="/"
                className="mr-4 p-2 rounded-lg glass-button hover:bg-white/20 transition-all duration-200"
              >
                <ArrowLeftIcon className="h-6 w-6 text-gray-700" />
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-lg font-bold shadow-lg">
                  👥
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                    จัดการหมอนวด
                  </h1>
                  <p className="text-gray-600 mt-1 font-medium">
                    ข้อมูลพนักงานและตารางเวร
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="glass-button px-6 py-3 flex items-center text-white font-bold"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              เพิ่มหมอนวด
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="glass-card p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                {editingTherapist ? '✏️' : '➕'}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {editingTherapist ? 'แก้ไขข้อมูลหมอนวด' : 'เพิ่มหมอนวดใหม่'}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  ชื่อหมอนวด
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-3 glass-input text-gray-800 placeholder-gray-500"
                  placeholder="กรอกชื่อหมอนวด"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  สถานะ
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-4 py-3 glass-input text-gray-800"
                >
                  <option value="active">ทำงานอยู่</option>
                  <option value="day_off">วันหยุด</option>
                  <option value="resigned">ลาออกแล้ว</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  วันเริ่มงาน
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                  className="w-full px-4 py-3 glass-input text-gray-800"
                />
              </div>

              <div className="md:col-span-3 flex gap-4">
                <button
                  type="submit"
                  className="glass-button py-3 px-8 text-white font-bold"
                >
                  {editingTherapist ? '🔄 อัพเดท' : '✨ เพิ่ม'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingTherapist(null);
                    setFormData({
                      name: '',
                      status: 'active',
                      startDate: new Date().toISOString().split('T')[0]
                    });
                  }}
                  className="px-8 py-3 bg-gray-300/50 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-gray-400/50 transition-all duration-200 font-semibold"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Therapists List */}
        <div className="glass-card overflow-hidden">
          <div className="px-8 py-6 border-b border-white/20">
            <div className="flex items-center">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold mr-3">
                📝
              </div>
              <h2 className="text-2xl font-bold text-gray-800">รายชื่อหมอนวด</h2>
            </div>
          </div>
          
          {therapists.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-gray-500 text-lg">ยังไม่มีข้อมูลหมอนวด</p>
              <p className="text-gray-400 text-sm mt-2">เริ่มเพิ่มหมอนวดคนแรกกันเลย!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 backdrop-blur-sm">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      👤 ชื่อ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      📊 สถานะ
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      📅 วันเริ่มงาน
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      📅 วันลาออก
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      🏖️ วันหยุด
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                      ⚙️ การจัดการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {therapists.map((therapist, index) => (
                    <tr key={therapist.id} className="hover:bg-white/5 transition-colors duration-200">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold mr-3">
                            {therapist.name.charAt(0)}
                          </div>
                          <div className="text-lg font-bold text-gray-800">
                            {therapist.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-2 text-sm font-bold rounded-full shadow-sm ${
                          therapist.status === 'active' 
                            ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' 
                            : therapist.status === 'day_off'
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white'
                            : 'bg-gradient-to-r from-red-400 to-red-500 text-white'
                        }`}>
                          {therapist.status === 'active' 
                            ? '✅ ทำงานอยู่' 
                            : therapist.status === 'day_off' 
                            ? '🏖️ วันหยุด'
                            : '❌ ลาออกแล้ว'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-700">
                        {therapist.startDate ? new Date(therapist.startDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-700">
                        {therapist.endDate ? new Date(therapist.endDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-700">
                        {therapist.dayOffDate ? new Date(therapist.dayOffDate).toLocaleDateString('th-TH') : '-'}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-sm font-medium space-x-3">
                        <button
                          onClick={() => handleEdit(therapist)}
                          className="glass-button px-4 py-2 text-white text-sm font-bold inline-flex items-center"
                        >
                          <PencilIcon className="h-4 w-4 mr-2" />
                          แก้ไข
                        </button>
                        {(therapist.status === 'active' || therapist.status === 'day_off') && (
                          <button
                            onClick={() => handleDayOff(therapist)}
                            className={`px-4 py-2 backdrop-blur-sm text-white rounded-lg transition-all duration-200 text-sm font-bold ${
                              therapist.status === 'day_off' 
                                ? 'bg-green-400/80 hover:bg-green-500/80' 
                                : 'bg-yellow-400/80 hover:bg-yellow-500/80'
                            }`}
                          >
                            {therapist.status === 'day_off' ? '🏢 กลับมาทำงาน' : '🏖️ วันหยุด'}
                          </button>
                        )}
                        {therapist.status === 'active' && (
                          <button
                            onClick={() => handleResign(therapist)}
                            className="px-4 py-2 bg-red-400/80 backdrop-blur-sm text-white rounded-lg hover:bg-red-500/80 transition-all duration-200 text-sm font-bold"
                          >
                            ลาออก
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Day Off Modal */}
      {showDayOffModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 w-full max-w-md">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                🏖️ ตั้งวันหยุดสำหรับ {selectedTherapist?.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    📅 วันที่หยุด
                  </label>
                  <input
                    type="date"
                    value={dayOffDate}
                    onChange={(e) => setDayOffDate(e.target.value)}
                    className="w-full px-4 py-3 glass-input text-gray-800"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowDayOffModal(false);
                    setSelectedTherapist(null);
                    setDayOffDate('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-300/80 backdrop-blur-sm text-gray-700 rounded-lg hover:bg-gray-400/80 transition-all duration-200 font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmDayOff}
                  className="flex-1 px-4 py-3 bg-yellow-400/80 backdrop-blur-sm text-white rounded-lg hover:bg-yellow-500/80 transition-all duration-200 font-bold"
                >
                  ยืนยันวันหยุด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
