'use client';

import { useState, useEffect, useMemo } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { getConfig } from '@/lib/firestore';

export default function DiscountModal({ isOpen, onClose, booking, onComplete, services = [] }) {
  // iPad iOS 15 detection
  const [isOnIpad, setIsOnIpad] = useState(false);
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');
  const [finalPrice, setFinalPrice] = useState(0);
  const [config, setConfig] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // iPad detection
  useEffect(() => {
    const isIpadDevice = /iPad|Macintosh/i.test(navigator.userAgent) && 
      'ontouchend' in document ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    
    setIsOnIpad(isIpadDevice);
    
    if (isIpadDevice && isOpen) {
      // Prevent body scroll on iPad when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
    }
    
    return () => {
      if (isIpadDevice) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
      }
    };
  }, [isOpen]);

  // Get service price - prioritize booking.originalPrice if available
  const originalPrice = useMemo(() => {
    // Only calculate when modal is open and we have booking data
    if (!isOpen || !booking) {
      return 0;
    }

    // ✅ Priority 1: Use originalPrice from booking if available (most accurate)
    if (booking.originalPrice && booking.originalPrice > 0) {
      console.log('✅ Using originalPrice from booking:', booking.originalPrice);
      return booking.originalPrice;
    }

    // ✅ Priority 2: Use finalPrice as fallback if originalPrice is missing
    if (booking.finalPrice && booking.finalPrice > 0) {
      console.log('✅ Using finalPrice from booking as fallback:', booking.finalPrice);
      return booking.finalPrice;
    }

    // ✅ Priority 3: Calculate from services data only as last resort
    console.log('🔍 DiscountModal Debug - calculating from services:', {
      booking: booking,
      services: services,
      servicesLength: services?.length,
      bookingServiceId: booking?.serviceId
    });

    if (!services || services.length === 0) {
      console.warn('⚠️ No services data available - using booking fallbacks');
      return booking?.servicePrice || 0;
    }
    
    // Find service by ID
    const service = services.find(s => s.id === booking.serviceId);
    
    if (!service) {
      console.warn('⚠️ Service not found for booking:', booking.serviceId);
      return booking?.servicePrice || 0;
    }
    
    if (!service.priceByDuration) {
      console.warn('⚠️ Service priceByDuration not found:', service);
      return booking?.servicePrice || service.price || 0;
    }
    
    const priceForDuration = service.priceByDuration[booking.duration];
    if (!priceForDuration && priceForDuration !== 0) {
      console.warn('⚠️ Price not found for duration:', booking.duration);
      return booking?.servicePrice || 0;
    }
    
    console.log('✅ Price calculated from services:', priceForDuration, 'for service:', service.name);
    return priceForDuration;
  }, [isOpen, booking, services]); // Only recalculate when these dependencies change

  // Get service name - memoized to avoid recalculation
  const serviceName = useMemo(() => {
    if (!isOpen || !booking) return '';
    
    const service = services.find(s => s.id === booking.serviceId);
    if (service) {
      return service.name;
    } else {
      return booking.serviceName || 'ไม่พบข้อมูลบริการ';
    }
  }, [isOpen, booking, services]);

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
        originalPrice: originalPrice, // เก็บราคาเต็มก่อนลด
        discountType: discountType === 'none' ? null : discountType,
        discountValue: discountType === 'none' ? 0 : parseFloat(discountValue) || 0,
        finalPrice: finalPrice,
        // ✅ Calculate commission correctly - therapist gets commission from ORIGINAL price
        therapistCommission: Math.floor(originalPrice * (config?.commissionRate || 0.4)), // From original price
        shopRevenue: finalPrice - Math.floor(originalPrice * (config?.commissionRate || 0.4)) // What's left after paying therapist
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

  // Early return after all hooks to prevent unnecessary rendering
  if (!isOpen || !booking) return null;

  const handleBackdropClick = (e) => {
    // Close modal if clicked on backdrop (not on the modal content)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        isOnIpad ? 'bg-black/50' : 'bg-black/30 backdrop-blur-sm'
      }`}
      style={{
        backgroundColor: isOnIpad ? 'rgba(0, 0, 0, 0.5)' : undefined,
        backdropFilter: isOnIpad ? 'none' : 'blur(4px)',
        WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(4px)',
        height: isOnIpad ? '100vh' : '100vh',
        minHeight: isOnIpad ? '100vh' : '100vh',
        maxHeight: isOnIpad ? '100vh' : '100vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}
      onClick={handleBackdropClick}
    >
      <div 
        className={`rounded-2xl shadow-2xl w-full border transform transition-all duration-300 relative ${
          isOnIpad 
            ? 'bg-white max-w-2xl max-h-[95vh] border-gray-200' 
            : 'bg-white/95 backdrop-blur-md max-w-lg max-h-[90vh] border-white/20'
        }`}
        style={{
          backdropFilter: isOnIpad ? 'none' : 'blur(20px)',
          WebkitBackdropFilter: isOnIpad ? 'none' : 'blur(20px)',
          transform: isOnIpad ? 'translateZ(0)' : undefined,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b rounded-t-2xl ${
          isOnIpad 
            ? 'bg-white border-gray-200 sticky top-0 z-10' 
            : 'border-white/10 bg-gradient-to-r from-green-50/90 to-emerald-50/80 backdrop-blur-sm sticky top-0'
        }`}>
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg ${
              isOnIpad 
                ? 'bg-green-500' 
                : 'bg-gradient-to-br from-green-500 to-emerald-600'
            }`}>
              ✅
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${
                isOnIpad 
                  ? 'text-gray-800' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent'
              }`}>
                เสร็จสิ้นบริการ
              </h2>
              <p className="text-sm text-gray-600 font-medium">สรุปค่าใช้จ่ายสำหรับลูกค้า</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isOnIpad 
                ? 'hover:bg-gray-100 text-gray-500 hover:text-gray-700' 
                : 'hover:bg-red-100/50 hover:text-red-600 text-gray-500'
            }`}
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              touchAction: 'manipulation'
            }}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Body */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{
            WebkitOverflowScrolling: 'touch',
            height: isOnIpad ? 'calc(95vh - 120px)' : 'calc(90vh - 80px)',
            maxHeight: isOnIpad ? 'calc(95vh - 120px)' : 'calc(90vh - 80px)'
          }}
        >
          <form 
            onSubmit={handleSubmit} 
            className={`p-6 space-y-6 ${
              isOnIpad 
                ? 'bg-white' 
                : 'bg-gradient-to-br from-white/80 to-green-50/50 backdrop-blur-sm'
            } rounded-b-2xl`}
          >
          
          {/* Customer Service Summary */}
          <div className={`border rounded-xl p-4 ${
            isOnIpad 
              ? 'bg-gray-50 border-gray-200' 
              : 'bg-gradient-to-r from-blue-50/90 to-indigo-50/80 backdrop-blur-sm border-blue-200/30'
          }`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center ${
              isOnIpad ? 'text-gray-800' : 'text-blue-800'
            }`}>
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              ข้อมูลการบริการ
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">👤 ลูกค้า:</span>
                <span className="font-bold text-gray-800">{booking.customerName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">✨ บริการ:</span>
                <span className="font-bold text-gray-800">{serviceName}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">⏱️ ระยะเวลา:</span>
                <span className="font-bold text-gray-800">{booking.duration} นาที</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white/60 rounded-lg">
                <span className="text-gray-700 font-medium">🕐 เวลา:</span>
                <span className="font-bold text-gray-800">
                  {(() => {
                    const startTime = new Date(booking.startTime || Date.now());
                    const endTime = new Date(startTime.getTime() + (booking.duration * 60000));
                    
                    const formatTime = (date) => {
                      return date.toLocaleString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                      });
                    };
                    
                    const startFormatted = formatTime(startTime);
                    const endTimeOnly = endTime.toLocaleString('th-TH', {
                      hour: '2-digit', 
                      minute: '2-digit',
                      hour12: false
                    });
                    
                    return `${startFormatted} - ${endTimeOnly}`;
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Price Calculation Section */}
          <div className={`border rounded-xl p-4 ${
            isOnIpad 
              ? 'bg-gray-50 border-gray-200' 
              : 'bg-gradient-to-r from-yellow-50/90 to-orange-50/80 backdrop-blur-sm border-yellow-200/30'
          }`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center ${
              isOnIpad ? 'text-gray-800' : 'text-orange-800'
            }`}>
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              คำนวณค่าบริการ
            </h3>
            
            {/* Original Price Display with debug info */}
            <div className="mb-4 p-4 bg-white/70 rounded-lg border-l-4 border-blue-400">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-gray-700">💰 ราคาตามเมนู:</span>
                <span className="text-xl font-bold text-blue-600">
                  ฿{originalPrice.toLocaleString()}
                </span>
              </div>
              {originalPrice === 0 && (
                <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                  ⚠️ ไม่พบราคาในระบบ - กรุณาตรวจสอบข้อมูลบริการ
                </div>
              )}
            </div>

            {/* Discount Type Selection */}
            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                🎁 ส่วนลดพิเศษ (ถ้ามี)
              </label>
              <select
                value={discountType}
                onChange={(e) => {
                  setDiscountType(e.target.value);
                  setDiscountValue('');
                }}
                className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 shadow-sm transition-all duration-200 ${
                  isOnIpad 
                    ? 'bg-white border-gray-300 text-base' 
                    : 'border-yellow-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                }`}
                style={{
                  WebkitTapHighlightColor: 'transparent',
                  fontSize: isOnIpad ? '16px' : undefined,
                  touchAction: 'manipulation'
                }}
              >
                <option value="none">🚫 ไม่มีส่วนลด</option>
                <option value="percentage">📊 ส่วนลดเปอร์เซ็นต์ (%)</option>
                <option value="amount">💸 ส่วนลดจำนวนเงิน (บาท)</option>
              </select>
            </div>

            {/* Discount Value Input */}
            {discountType !== 'none' && (
              <div className="mb-4">
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
                    className={`w-full p-4 border rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 pr-12 shadow-sm transition-all duration-200 font-semibold ${
                      isOnIpad 
                        ? 'bg-white border-gray-300 text-base' 
                        : 'border-yellow-200/50 bg-white/90 backdrop-blur-sm hover:shadow-md'
                    }`}
                    style={{
                      WebkitTapHighlightColor: 'transparent',
                      fontSize: isOnIpad ? '16px' : undefined,
                      touchAction: 'manipulation'
                    }}
                    placeholder={discountType === 'percentage' ? 'เช่น 10' : 'เช่น 100'}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-orange-600 font-bold">
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

          {/* Final Price Summary */}
          <div className={`border-2 rounded-xl p-4 shadow-lg ${
            isOnIpad 
              ? 'bg-gray-50 border-green-300' 
              : 'bg-gradient-to-r from-green-50/90 to-emerald-50/80 backdrop-blur-sm border-green-300/50'
          }`}>
            <h3 className={`text-lg font-bold mb-4 flex items-center ${
              isOnIpad ? 'text-gray-800' : 'text-green-800'
            }`}>
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              สรุปค่าใช้จ่าย
            </h3>
            
            <div className="space-y-4">
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

              {/* Payment Method Note */}
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200/50">
                <div className="flex items-center text-blue-800">
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">💳 วิธีการชำระเงิน: เงินสด / โอนเงิน</span>
                </div>
              </div>

              {/* Commission Information */}
              {config?.commissionRate && (
                <div className="p-3 bg-purple-50/70 rounded-lg border border-purple-200/50">
                  <h4 className="font-semibold text-purple-800 mb-2">📊 การแบ่งรายได้:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-purple-700">👩‍⚕️ ค่าคอมมิชชั่นหมอนวด ({(config.commissionRate * 100).toFixed(0)}%):</span>
                      <span className="font-bold text-purple-800">
                        ฿{Math.floor(originalPrice * config.commissionRate).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-purple-700">🏪 รายได้ร้าน:</span>
                      <span className="font-bold text-purple-800">
                        ฿{(finalPrice - Math.floor(originalPrice * config.commissionRate)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-4 border-2 font-semibold rounded-xl transition-all duration-200 ${
                isOnIpad 
                  ? 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50' 
                  : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 hover:from-gray-200 hover:to-gray-300 border-gray-300/50'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: isOnIpad ? '48px' : undefined
              }}
            >
              ❌ ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex-1 px-6 py-4 font-bold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                isOnIpad 
                  ? 'bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400' 
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transform hover:scale-105'
              }`}
              style={{
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
                minHeight: isOnIpad ? '48px' : undefined
              }}
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
    </div>
  );
}
