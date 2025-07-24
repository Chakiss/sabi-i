'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getConfig } from '@/lib/firestore';

export default function DiscountModal({ isOpen, onClose, booking, onComplete }) {
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [finalPrice, setFinalPrice] = useState(0);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Get service price
  const originalPrice = booking?.servicePrice || 0;

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

  // Calculate discount amount and final price when discount changes
  const discountAmount = (() => {
    if (discountType === 'percentage' && discountValue) {
      return (originalPrice * parseFloat(discountValue)) / 100;
    } else if (discountType === 'amount' && discountValue) {
      return parseFloat(discountValue);
    }
    return 0;
  })();

  // Calculate final price when discount changes
  useEffect(() => {
    if (!booking) return;
    
    let calculatedPrice = originalPrice;
    
    if (discountType === 'percentage' && discountValue) {
      const discount = (originalPrice * parseFloat(discountValue)) / 100;
      calculatedPrice = Math.max(0, originalPrice - discount);
    } else if (discountType === 'amount' && discountValue) {
      calculatedPrice = Math.max(0, originalPrice - parseFloat(discountValue));
    }
    
    setFinalPrice(calculatedPrice);
  }, [discountType, discountValue, originalPrice, booking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const discountData = {
        discountType: discountType === 'none' ? null : discountType,
        discountValue: discountType === 'none' ? 0 : parseFloat(discountValue) || 0,
        finalPrice: finalPrice,
        // Calculate commission from ORIGINAL price (before discount)
        // แก้ไข: หมอนวดได้ค่าคอมจากราคาเต็ม ไม่ใช่ราคาหลังลด
        therapistCommission: Math.floor(originalPrice * (config?.commissionRate || 0.4)),
        // ร้านได้ = ราคาที่ลูกค้าจ่าย - ค่าคอมหมอนวด
        shopRevenue: finalPrice - Math.floor(originalPrice * (config?.commissionRate || 0.4))
      };
      
      await onComplete(booking.id, discountData);
    } catch (error) {
      console.error('Error completing booking:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen && booking) {
      // Check if booking already has discount data
      if (booking.discountType && booking.discountType !== 'none') {
        setDiscountType(booking.discountType);
        setDiscountValue(booking.discountValue?.toString() || '');
        setFinalPrice(booking.finalPrice || originalPrice);
      } else {
        setDiscountType('none');
        setDiscountValue('');
        setFinalPrice(originalPrice);
      }
    }
  }, [isOpen, originalPrice, booking]);

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

  if (!isOpen || !booking) return null;

  const handleBackdropClick = (e) => {
    // Close modal if clicked on backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-lg w-full mx-4 my-8 border border-white/20 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-green-50/90 to-emerald-50/80 backdrop-blur-sm rounded-t-xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white shadow-lg">
              ✅
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                เสร็จสิ้นบริการ
              </h2>
              <p className="text-xs text-gray-600 font-medium">สรุปค่าใช้จ่ายสำหรับลูกค้า</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-red-100/50 hover:text-red-600 rounded-lg transition-all duration-200 text-gray-500"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 bg-gradient-to-br from-white/80 to-green-50/50 backdrop-blur-sm rounded-b-xl space-y-4">
          
          {/* Customer Service Summary */}
          <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 backdrop-blur-sm border border-blue-200/30 rounded-lg p-4">
            <h3 className="text-base font-bold text-blue-800 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ข้อมูลการบริการ
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium text-sm">👤 ลูกค้า:</span>
                <span className="font-bold text-gray-800 text-sm">{booking.customerName}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium text-sm">✨ บริการ:</span>
                <span className="font-bold text-gray-800 text-sm">{booking.serviceName}</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium text-sm">⏱️ เวลา:</span>
                <span className="font-bold text-gray-800 text-sm">
                  {new Date(booking.startTime || Date.now()).toLocaleString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Price Calculation Section */}
          <div className="bg-gradient-to-r from-yellow-50/90 to-orange-50/80 backdrop-blur-sm border border-yellow-200/30 rounded-lg p-4">
            <h3 className="text-base font-bold text-orange-800 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              คำนวณค่าบริการ
            </h3>
            
            {/* Original Price Display */}
            <div className="mb-3 p-3 bg-white/70 rounded-lg border-l-4 border-blue-400">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700">💰 ราคาตามเมนู:</span>
                <span className="text-xl font-bold text-blue-600">
                  ฿{originalPrice.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Discount Type Selection */}
            <div className="mb-3">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎁 ส่วนลดพิเศษ (ถ้ามี)
              </label>
              <select
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setDiscountValue('');
                }}
                className="w-full p-3 border border-yellow-200/50 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md text-sm"
              >
                <option value="none">🚫 ไม่มีส่วนลด</option>
                <option value="percentage">📊 ส่วนลดเปอร์เซ็นต์ (%)</option>
                <option value="amount">💸 ส่วนลดจำนวนเงิน (บาท)</option>
              </select>
            </div>

            {/* Discount Value Input */}
            {discountType !== 'none' && (
              <div className="mb-3">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {discountType === 'percentage' ? '📊 ระบุเปอร์เซ็นต์ส่วนลด' : '💸 ระบุจำนวนเงินส่วนลด'}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    min="0"
                    max={discountType === 'percentage' ? '100' : originalPrice}
                    step={discountType === 'percentage' ? '1' : '10'}
                    className="w-full p-3 border border-yellow-200/50 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200 hover:shadow-md font-semibold text-sm"
                    placeholder={discountType === 'percentage' ? 'เช่น 10' : 'เช่น 100'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-orange-600 font-bold text-sm">
                      {discountType === 'percentage' ? '%' : '฿'}
                    </span>
                  </div>
                </div>
                {discountType === 'percentage' && (
                  <p className="text-xs text-orange-600 mt-1 flex items-center">
                    💡 ระบุเปอร์เซ็นต์ 0-100
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Final Price */}
                    {/* Final Price Summary */}
          <div className="bg-gradient-to-r from-green-50/90 to-emerald-50/80 backdrop-blur-sm border-2 border-green-300/50 rounded-lg p-4 shadow-lg">
            <h3 className="text-base font-bold text-green-800 mb-3 flex items-center">
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              สรุปค่าใช้จ่าย
            </h3>
            
            <div className="space-y-3">
              {/* Discount Applied Display */}
              {discountAmount > 0 && (
                <div className="p-3 bg-red-50/70 rounded-lg border-l-4 border-red-400">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-semibold text-red-700 flex items-center">
                      🎁 ส่วนลดที่ได้รับ:
                    </span>
                    <span className="text-lg font-bold text-red-600">
                      -฿{discountAmount.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-red-600 mt-1">
                    {discountType === 'percentage' 
                      ? `ส่วนลด ${discountValue}% จากราคาเดิม` 
                      : `ส่วนลดจำนวน ${discountValue} บาท`
                    }
                  </p>
                </div>
              )}

              {/* Net Amount */}
              <div className="p-4 bg-gradient-to-r from-green-100/80 to-emerald-100/70 rounded-lg border-2 border-green-400/40 shadow-inner">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-bold text-green-800 flex items-center">
                    💰 ยอดสุทธิที่ชำระ:
                  </span>
                  <div className="text-right">
                    <span className="text-2xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      ฿{finalPrice.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Commission Breakdown */}
              {config && (
                <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200/50">
                  <h4 className="text-sm font-bold text-purple-800 mb-2 flex items-center">
                    💼 การแบ่งรายได้ (จากราคาเต็ม ฿{originalPrice.toLocaleString()})
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center p-2 bg-blue-50/50 rounded">
                      <span className="text-blue-700 font-medium">
                        👨‍⚕️ หมอนวดได้ ({Math.round((config?.commissionRate || 0.4) * 100)}%):
                      </span>
                      <span className="font-bold text-blue-800">
                        ฿{Math.floor(originalPrice * (config?.commissionRate || 0.4)).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-orange-50/50 rounded">
                      <span className="text-orange-700 font-medium">
                        🏪 ร้านได้ (จากยอดที่ลูกค้าจ่าย):
                      </span>
                      <span className="font-bold text-orange-800">
                        ฿{(finalPrice - Math.floor(originalPrice * (config?.commissionRate || 0.4))).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 p-2 bg-yellow-50/70 rounded border-l-4 border-yellow-400">
                    <p className="text-xs text-yellow-700 font-medium">
                      💡 หมอนวดได้ค่าคอมจากราคาเต็ม ไม่ได้รับผลกระทบจากส่วนลด
                    </p>
                  </div>
                </div>
              )}

              {/* Payment Method Note */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200/50">
                <div className="flex items-center text-blue-800">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold text-sm">💳 วิธีการชำระเงิน: เงินสด / โอนเงิน</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 rounded-lg font-semibold hover:from-gray-200 hover:to-gray-300 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-300/50 text-sm"
            >
              ❌ ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 text-sm"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  กำลังบันทึก...
                </span>
              ) : (
                '✅ เสร็จสิ้นบริการ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
