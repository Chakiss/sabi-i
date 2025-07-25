import React from 'react';

// Skeleton Loading Components
export const StatCardSkeleton = () => (
  <div className="glass p-6 animate-pulse">
    <div className="flex items-center">
      <div className="p-4 rounded-2xl bg-gray-200 w-16 h-16"></div>
      <div className="ml-4 flex-1">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
    </div>
  </div>
);

export const BookingCardSkeleton = () => (
  <div className="glass p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center space-x-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div>
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="text-right">
        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
    <div className="flex space-x-2">
      <div className="h-8 bg-gray-200 rounded w-20"></div>
      <div className="h-8 bg-gray-200 rounded w-16"></div>
      <div className="h-8 bg-gray-200 rounded w-16"></div>
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="glass overflow-hidden">
    <div className="animate-pulse">
      {/* Header */}
      <div className="px-6 py-4 bg-gray-100 border-b">
        <div className="flex space-x-4">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
          ))}
        </div>
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-6 py-4 border-b border-gray-100">
          <div className="flex space-x-4">
            {Array.from({ length: cols }).map((_, j) => (
              <div key={j} className="h-4 bg-gray-200 rounded flex-1"></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ChartSkeleton = () => (
  <div className="glass p-6 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

export const ListSkeleton = ({ items = 6 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="glass p-4 animate-pulse">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
          <div className="h-6 bg-gray-200 rounded w-16"></div>
        </div>
      </div>
    ))}
  </div>
);

// Loading Spinner Component
export const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 ${sizeClasses[size]} ${className}`}></div>
  );
};

// Loading Overlay Component
export const LoadingOverlay = ({ isLoading, children, text = 'กำลังโหลด...' }) => {
  if (!isLoading) return children;

  return (
    <div className="relative">
      {children}
      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 font-medium">{text}</p>
        </div>
      </div>
    </div>
  );
};

// Progress Bar Component
export const ProgressBar = ({ progress, className = '' }) => (
  <div className={`w-full bg-gray-200 rounded-full h-2 ${className}`}>
    <div 
      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
      style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
    ></div>
  </div>
);

// Button Loading State
export const LoadingButton = ({ 
  isLoading, 
  children, 
  loadingText = 'กำลังประมวลผล...', 
  className = '',
  ...props 
}) => (
  <button 
    className={`inline-flex items-center justify-center space-x-2 ${className}`}
    disabled={isLoading}
    {...props}
  >
    {isLoading && <LoadingSpinner size="sm" />}
    <span>{isLoading ? loadingText : children}</span>
  </button>
);
