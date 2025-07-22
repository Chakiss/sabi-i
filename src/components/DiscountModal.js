'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

export default function DiscountModal({ isOpen, onClose, booking, onComplete }) {
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [finalPrice, setFinalPrice] = useState(0);

  // Get service price
  const originalPrice = booking?.servicePrice || 0;

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

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const discountData = {
      discountType: discountType === 'none' ? null : discountType,
      discountValue: discountType === 'none' ? 0 : parseFloat(discountValue) || 0,
      finalPrice: finalPrice
    };
    
    onComplete(booking.id, discountData);
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setDiscountType('none');
      setDiscountValue('');
      setFinalPrice(originalPrice);
    }
  }, [isOpen, originalPrice]);

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
        className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-md w-full mx-4 border border-white/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/80 backdrop-blur-sm rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">เสร็จสิ้นบริการ</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 bg-white/60 backdrop-blur-sm rounded-b-xl">
          {/* Customer Info */}
          <div className="mb-4 p-4 bg-white/60 backdrop-blur-sm rounded-lg border border-white/20">
            <h3 className="font-semibold text-gray-800">{booking.customerName}</h3>
            <p className="text-sm text-gray-600">บริการ: {booking.serviceName}</p>
          </div>

          {/* Original Price */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ราคาเดิม
            </label>
            <div className="text-2xl font-bold text-gray-800">
              ฿{originalPrice.toLocaleString()}
            </div>
          </div>

          {/* Discount Type */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ประเภทส่วนลด
            </label>
            <select
              value={discountType}
              onChange={(e) => {
                setDiscountType(e.target.value);
                setDiscountValue('');
              }}
              className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/70 backdrop-blur-sm"
            >
              <option value="none">ไม่มีส่วนลด</option>
              <option value="percentage">เปอร์เซ็นต์ (%)</option>
              <option value="amount">จำนวนเงิน (บาท)</option>
            </select>
          </div>

          {/* Discount Value */}
          {discountType !== 'none' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {discountType === 'percentage' ? 'เปอร์เซ็นต์ส่วนลด' : 'จำนวนเงินส่วนลด'}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  min="0"
                  max={discountType === 'percentage' ? '100' : originalPrice}
                  step={discountType === 'percentage' ? '1' : '1'}
                  className="w-full p-3 border border-white/30 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12 bg-white/70 backdrop-blur-sm"
                  placeholder={discountType === 'percentage' ? '0-100' : '0'}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 text-sm">
                    {discountType === 'percentage' ? '%' : '฿'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Final Price */}
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50/80 to-emerald-50/80 backdrop-blur-sm border border-green-200/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">ราคาหลังหักส่วนลด:</span>
              <span className="text-2xl font-bold text-green-600">
                ฿{finalPrice.toLocaleString()}
              </span>
            </div>
            {discountType !== 'none' && discountValue && (
              <div className="text-sm text-gray-500 mt-1">
                ส่วนลด: {discountType === 'percentage' ? `${discountValue}%` : `฿${parseFloat(discountValue).toLocaleString()}`} 
                (-฿{(originalPrice - finalPrice).toLocaleString()})
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-white/40 text-gray-700 rounded-lg hover:bg-white/30 font-medium backdrop-blur-sm transition-all"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600/90 hover:bg-green-700/90 text-white rounded-lg font-medium backdrop-blur-sm transition-all"
            >
              ✅ เสร็จสิ้น
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
