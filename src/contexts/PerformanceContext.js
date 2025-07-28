'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const PerformanceContext = createContext();

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

export const PerformanceProvider = ({ children }) => {
  const [performanceMode, setPerformanceMode] = useState('normal');
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [isVeryLowEndDevice, setIsVeryLowEndDevice] = useState(false);
  const [isIpadDevice, setIsIpadDevice] = useState(false);

  useEffect(() => {
    // Device detection
    const isIpad = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsIpadDevice(isIpad);

    // Low-end device detection
    const isLowEnd = isIpad && (
      !CSS.supports('backdrop-filter', 'blur(10px)') ||
      navigator.hardwareConcurrency <= 2 ||
      navigator.deviceMemory <= 4
    );
    setIsLowEndDevice(isLowEnd);

    // Very low-end device detection (iPad Air 2 iOS 15)
    const isVeryLowEnd = isIpad && (
      navigator.hardwareConcurrency <= 2 &&
      (navigator.deviceMemory <= 2 || !navigator.deviceMemory) &&
      !window.DeviceMotionEvent?.requestPermission
    );
    setIsVeryLowEndDevice(isVeryLowEnd);

    // Set performance mode
    if (isVeryLowEnd) {
      setPerformanceMode('ultra');
      document.documentElement.classList.add('ultra-performance');
    } else if (isLowEnd) {
      setPerformanceMode('high');
      document.documentElement.classList.add('high-performance');
    } else {
      setPerformanceMode('normal');
      document.documentElement.classList.add('normal-performance');
    }

    // Apply global optimizations
    if (isLowEnd) {
      // Disable animations for low-end devices
      const style = document.createElement('style');
      style.id = 'performance-optimizations';
      style.textContent = `
        * {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `;
      document.head.appendChild(style);

      return () => {
        const styleEl = document.getElementById('performance-optimizations');
        if (styleEl) styleEl.remove();
      };
    }
  }, []);

  const value = {
    performanceMode,
    isLowEndDevice,
    isVeryLowEndDevice,
    isIpadDevice,
    // Utility functions
    shouldReduceAnimations: () => performanceMode !== 'normal',
    shouldUseVirtualScrolling: () => performanceMode === 'ultra',
    shouldLazyLoadImages: () => performanceMode !== 'normal',
    getOptimalUpdateInterval: () => {
      switch (performanceMode) {
        case 'ultra': return 1000; // 1 second
        case 'high': return 500;   // 0.5 seconds
        default: return 100;       // 0.1 seconds
      }
    }
  };

  return (
    <PerformanceContext.Provider value={value}>
      {children}
    </PerformanceContext.Provider>
  );
};
