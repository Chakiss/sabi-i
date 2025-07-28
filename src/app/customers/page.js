'use client';

import { useState, useEffect } from 'react';
import { getAllBookings, updateBooking } from '@/lib/firestore';
import { addDoc, collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dateTimeUtils } from '@/lib/dateTimeUtils';
import { 
  UserIcon, 
  PhoneIcon, 
  CalendarDaysIcon,
  EyeIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeCustomers, setMergeCustomers] = useState({ from: null, to: null });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const bookings = await getAllBookings();
      
      // Group bookings by customer name and phone
      const customerMap = new Map();
      
      bookings.forEach(booking => {
        const key = `${booking.customerName}-${booking.customerPhone}`;
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            id: booking.customerPhone, // Use phone as customer ID
            name: booking.customerName,
            phone: booking.customerPhone,
            firstVisit: booking.startTime,
            lastVisit: booking.startTime,
            totalVisits: 0,
            totalSpent: 0,
            bookings: []
          });
        }
        
        const customer = customerMap.get(key);
        customer.bookings.push(booking);
        customer.totalVisits++;
        
        // Update first and last visit dates
        if (new Date(booking.startTime) < new Date(customer.firstVisit)) {
          customer.firstVisit = booking.startTime;
        }
        if (new Date(booking.startTime) > new Date(customer.lastVisit)) {
          customer.lastVisit = booking.startTime;
        }
        
        // Calculate total spent
        if (booking.finalPrice || booking.finalAmount) {
          customer.totalSpent += (booking.finalPrice || booking.finalAmount);
        }
      });
      
      // Convert to array and sort by last visit
      const customersArray = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));
      
      setCustomers(customersArray);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า');
    } finally {
      setLoading(false);
    }
  };

  const handleEditStart = (customer) => {
    setEditingCustomer(customer);
    setEditForm({ name: customer.name, phone: customer.phone });
  };

  const handleEditCancel = () => {
    setEditingCustomer(null);
    setEditForm({ name: '', phone: '' });
  };

  const handleEditSave = async () => {
    try {
      const oldCustomerId = editingCustomer.id;
      const newCustomerId = editForm.phone;
      
      // Create new customer record with new phone as ID
      const newCustomerData = {
        name: editForm.name,
        phone: editForm.phone,
        createdAt: new Date(),
        updatedAt: new Date(),
        totalVisits: editingCustomer.totalVisits,
        totalSpent: editingCustomer.totalSpent,
        firstVisit: editingCustomer.firstVisit,
        lastVisit: editingCustomer.lastVisit
      };

      // Save new customer document with phone as ID
      const customerRef = doc(db, 'customers', newCustomerId);
      await setDoc(customerRef, newCustomerData, { merge: true });

      // Update all bookings for this customer
      const bookingsToUpdate = editingCustomer.bookings.map(booking => ({
        ...booking,
        customerName: editForm.name,
        customerPhone: editForm.phone
      }));

      // Update each booking
      for (const booking of bookingsToUpdate) {
        await updateBooking(booking.id, {
          customerName: editForm.name,
          customerPhone: editForm.phone
        });
      }

      // Delete old customer record if phone number changed
      if (oldCustomerId !== newCustomerId) {
        try {
          const oldCustomerRef = doc(db, 'customers', oldCustomerId);
          await deleteDoc(oldCustomerRef);
          console.log('Old customer record deleted:', oldCustomerId);
        } catch (deleteError) {
          console.warn('Could not delete old customer record:', deleteError);
          // Don't fail the whole operation if delete fails
        }
      }

      toast.success('อัพเดทข้อมูลลูกค้าสำเร็จ');
      setEditingCustomer(null);
      setEditForm({ name: '', phone: '' });
      await fetchCustomers(); // Refresh data
    } catch (error) {
      console.error('Error updating customer:', error);
      toast.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    }
  };

  const handleViewHistory = (customer) => {
    setSelectedCustomer(customer);
    setCustomerHistory(customer.bookings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)));
    setShowHistory(true);
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`คัดลอก${label}แล้ว: ${text}`);
    }).catch(() => {
      toast.error('ไม่สามารถคัดลอกได้');
    });
  };

  const handleMergeCustomers = async (fromCustomer, toCustomer) => {
    try {
      // Update all bookings from 'fromCustomer' to use 'toCustomer' info
      for (const booking of fromCustomer.bookings) {
        await updateBooking(booking.id, {
          customerName: toCustomer.name,
          customerPhone: toCustomer.phone
        });
      }

      toast.success(`รวมข้อมูลลูกค้าสำเร็จ: ย้ายจาก "${fromCustomer.name}" ไปยัง "${toCustomer.name}"`);
      setShowMergeModal(false);
      setMergeCustomers({ from: null, to: null });
      await fetchCustomers(); // Refresh data
    } catch (error) {
      console.error('Error merging customers:', error);
      toast.error('เกิดข้อผิดพลาดในการรวมข้อมูลลูกค้า');
    }
  };

  const closeHistory = () => {
    setShowHistory(false);
    setSelectedCustomer(null);
    setCustomerHistory([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ 
        background: 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
      }}>
        <div className="rounded-3xl shadow-2xl p-12 text-center border max-w-md mx-4" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(184, 155, 133, 0.2)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent mx-auto mb-4" style={{
            borderTopColor: '#B89B85',
            borderRightColor: '#A1826F'
          }}></div>
          <h2 className="text-2xl font-bold text-[#4E3B31] mb-2">กำลังโหลดข้อมูลลูกค้า</h2>
          <p className="text-[#7E7B77]">กรุณารอสักครู่...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #F8F5F2 0%, #ECE8E4 50%, #F0EBE7 100%)' 
    }}>
      <div className="w-full px-6 lg:px-12 py-12">
        <div className="rounded-3xl shadow-2xl p-8 border mb-8 relative overflow-hidden" style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderColor: 'rgba(184, 155, 133, 0.3)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-xl" style={{
                background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 50%, rgba(184, 155, 133, 0.8) 100%)'
              }}>
                <UserIcon className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-3xl font-bold" style={{
                  background: 'linear-gradient(90deg, #4E3B31 0%, #B89B85 50%, #A1826F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  color: '#4E3B31'
                }}>
                  ข้อมูลลูกค้า
                </h2>
                <p className="font-medium" style={{ color: '#7E7B77' }}>
                  จัดการข้อมูลและประวัติลูกค้าทั้งหมด ({customers.length} คน)
                </p>
              </div>
            </div>
          </div>

          {/* Customers List */}
          <div className="space-y-4">
            {customers.map((customer, index) => (
              <div
                key={`${customer.name}-${customer.phone}`}
                className="rounded-2xl p-6 shadow-lg border transition-all duration-200 hover:shadow-xl"
                style={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderColor: 'rgba(184, 155, 133, 0.2)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
                      background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 100%)'
                    }}>
                      {customer.name.charAt(0).toUpperCase()}
                    </div>
                    
                    {editingCustomer === customer ? (
                      <div className="flex-1 space-y-3">
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#B89B85] focus:border-transparent"
                            placeholder="ชื่อลูกค้า"
                            style={{ borderColor: 'rgba(184, 155, 133, 0.3)' }}
                          />
                          <input
                            type="text"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#B89B85] focus:border-transparent"
                            placeholder="เบอร์โทรศัพท์"
                            style={{ borderColor: 'rgba(184, 155, 133, 0.3)' }}
                          />
                        </div>
                        {editForm.phone !== editingCustomer.phone && (
                          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-center space-x-2">
                              <KeyIcon className="h-4 w-4 text-yellow-600" />
                              <p className="text-sm font-medium text-yellow-800">
                                การเปลี่ยนเบอร์โทร: Customer ID ใหม่จะเป็น &ldquo;{editForm.phone}&rdquo;
                              </p>
                            </div>
                            <p className="text-xs text-yellow-700 mt-1">
                              ระบบจะคัดลอกข้อมูลลูกค้าไปยัง Customer ID ใหม่, อัพเดทการจองทั้งหมด และลบ Customer ID เก่า &ldquo;{editingCustomer.id}&rdquo;
                            </p>
                          </div>
                        )}
                        <div className="flex space-x-2">
                          <button
                            onClick={handleEditSave}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center space-x-2"
                          >
                            <CheckIcon className="h-4 w-4" />
                            <span>บันทึก</span>
                          </button>
                          <button
                            onClick={handleEditCancel}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center space-x-2"
                          >
                            <XMarkIcon className="h-4 w-4" />
                            <span>ยกเลิก</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                                            <div className="flex-1">
                        <h3 className="text-xl font-bold text-[#4E3B31]">{customer.name}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-[#7E7B77]">
                          <div className="flex items-center space-x-1">
                            <PhoneIcon className="h-4 w-4" />
                            <span>{customer.phone}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CalendarDaysIcon className="h-4 w-4" />
                            <span>{customer.totalVisits} ครั้ง</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CurrencyDollarIcon className="h-4 w-4" />
                            <span>{customer.totalSpent.toLocaleString()} บาท</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ClockIcon className="h-4 w-4" />
                            <span>ล่าสุด: {new Date(customer.lastVisit).toLocaleDateString('th-TH')}</span>
                          </div>
                        </div>
                        {/* Customer Firebase ID */}
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <KeyIcon className="h-4 w-4 text-blue-600" />
                              <p className="text-sm font-medium text-blue-800">Customer ID:</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(customer.id, 'Customer ID')}
                              className="flex items-center space-x-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded text-xs transition-colors"
                              title={`คลิกเพื่อคัดลอก: ${customer.id}`}
                            >
                              <DocumentDuplicateIcon className="h-3 w-3 text-blue-600" />
                              <span className="font-mono text-blue-700">{customer.id}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {editingCustomer !== customer && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewHistory(customer)}
                        className="p-2 rounded-lg border hover:bg-[#F8F5F2] transition-colors"
                        style={{ borderColor: 'rgba(184, 155, 133, 0.3)' }}
                        title="ดูประวัติ"
                      >
                        <EyeIcon className="h-5 w-5 text-[#B89B85]" />
                      </button>
                      <button
                        onClick={() => handleEditStart(customer)}
                        className="p-2 rounded-lg border hover:bg-[#F8F5F2] transition-colors"
                        style={{ borderColor: 'rgba(184, 155, 133, 0.3)' }}
                        title="แก้ไข"
                      >
                        <PencilIcon className="h-5 w-5 text-[#B89B85]" />
                      </button>
                      <button
                        onClick={() => {
                          setMergeCustomers({ from: customer, to: null });
                          setShowMergeModal(true);
                        }}
                        className="p-2 rounded-lg border hover:bg-[#F8F5F2] transition-colors"
                        style={{ borderColor: 'rgba(184, 155, 133, 0.3)' }}
                        title="รวมข้อมูลกับลูกค้าอื่น"
                      >
                        <ClipboardDocumentIcon className="h-5 w-5 text-[#B89B85]" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {customers.length === 0 && (
              <div className="text-center py-12">
                <UserIcon className="h-16 w-16 text-[#B89B85] mx-auto mb-4" />
                <h3 className="text-xl font-bold text-[#4E3B31] mb-2">ยังไม่มีข้อมูลลูกค้า</h3>
                <p className="text-[#7E7B77]">ข้อมูลลูกค้าจะปรากฏเมื่อมีการจองบริการ</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Customer History Modal */}
      {showHistory && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.98)' }}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold" style={{
                    background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 100%)'
                  }}>
                    {selectedCustomer.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#4E3B31]">ประวัติการใช้บริการ</h3>
                    <p className="text-[#7E7B77]">{selectedCustomer.name} - {selectedCustomer.phone}</p>
                  </div>
                </div>
                <button
                  onClick={closeHistory}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-[#7E7B77]" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                {customerHistory.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="rounded-xl p-4 border"
                    style={{
                      background: 'rgba(248, 245, 242, 0.5)',
                      borderColor: 'rgba(184, 155, 133, 0.2)'
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          booking.status === 'done' ? 'bg-green-500' : 
                          booking.status === 'in_progress' ? 'bg-blue-500' : 'bg-yellow-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[#4E3B31]">
                            {new Date(booking.startTime).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          <p className="text-sm text-[#7E7B77]">
                            {new Date(booking.startTime).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          booking.status === 'done' ? 'bg-green-100 text-green-800' :
                          booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status === 'done' ? 'เสร็จแล้ว' :
                           booking.status === 'in_progress' ? 'กำลังใช้บริการ' : 'รอคิว'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-[#7E7B77]">บริการ:</p>
                        <p className="font-medium text-[#4E3B31]">{booking.serviceName || 'ไม่ระบุ'}</p>
                      </div>
                      <div>
                        <p className="text-[#7E7B77]">นักบำบัด:</p>
                        <p className="font-medium text-[#4E3B31]">{booking.therapistName || 'ไม่ระบุ'}</p>
                      </div>
                      <div>
                        <p className="text-[#7E7B77]">ระยะเวลา:</p>
                        <p className="font-medium text-[#4E3B31]">{booking.duration} นาที</p>
                      </div>
                      <div>
                        <p className="text-[#7E7B77]">ราคา:</p>
                        <p className="font-medium text-[#4E3B31]">
                          {(booking.finalPrice || booking.finalAmount || 0).toLocaleString()} บาท
                        </p>
                      </div>
                    </div>                    {booking.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-[#7E7B77] text-sm">หมายเหตุ:</p>
                        <p className="text-[#4E3B31] text-sm">{booking.notes}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Merge Customers Modal */}
      {showMergeModal && mergeCustomers.from && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div 
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
            style={{ background: 'rgba(255, 255, 255, 0.98)' }}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-[#4E3B31]">รวมข้อมูลลูกค้า</h3>
                  <p className="text-[#7E7B77] mt-1">
                    ย้ายข้อมูลจาก &ldquo;{mergeCustomers.from.name}&rdquo; ไปยังลูกค้าอื่น
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeCustomers({ from: null, to: null });
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XMarkIcon className="h-6 w-6 text-[#7E7B77]" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <ClipboardDocumentIcon className="h-5 w-5 text-yellow-600" />
                  <p className="font-semibold text-yellow-800">ข้อมูลที่จะถูกย้าย:</p>
                </div>
                <div className="text-sm text-yellow-700">
                  <p>• ลูกค้า: {mergeCustomers.from.name} ({mergeCustomers.from.phone})</p>
                  <p>• จำนวนการจอง: {mergeCustomers.from.totalVisits} ครั้ง</p>
                  <p>• ยอดรวม: {mergeCustomers.from.totalSpent.toLocaleString()} บาท</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm font-medium text-[#4E3B31] mb-3">เลือกลูกค้าปลายทาง:</p>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {customers
                    .filter(c => c !== mergeCustomers.from)
                    .map((customer) => (
                    <button
                      key={`${customer.name}-${customer.phone}`}
                      onClick={() => setMergeCustomers({ ...mergeCustomers, to: customer })}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        mergeCustomers.to === customer
                          ? 'border-[#B89B85] bg-[#F8F5F2]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{
                          background: 'linear-gradient(135deg, #B89B85 0%, #A1826F 100%)'
                        }}>
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#4E3B31]">{customer.name}</p>
                          <p className="text-sm text-[#7E7B77]">
                            {customer.phone} • {customer.totalVisits} ครั้ง
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => handleMergeCustomers(mergeCustomers.from, mergeCustomers.to)}
                  disabled={!mergeCustomers.to}
                  className="flex-1 px-4 py-3 bg-[#B89B85] text-white rounded-lg hover:bg-[#A1826F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  ยืนยันการรวมข้อมูล
                </button>
                <button
                  onClick={() => {
                    setShowMergeModal(false);
                    setMergeCustomers({ from: null, to: null });
                  }}
                  className="px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  ยกเลิก
                </button>
              </div>

              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">
                  <strong>คำเตือน:</strong> การดำเนินการนี้จะย้ายข้อมูลการจองทั้งหมดของ &ldquo;{mergeCustomers.from.name}&rdquo; 
                  ไปยัง &ldquo;{mergeCustomers.to?.name || '[ยังไม่เลือก]'}&rdquo; และไม่สามารถยกเลิกได้
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
