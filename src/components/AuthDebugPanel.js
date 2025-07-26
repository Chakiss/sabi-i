'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const AuthDebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, userRole, isAuthenticated } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  const authStatus = [
    {
      name: 'Email/Password Login',
      status: 'available',
      message: 'Ready to use',
      icon: CheckCircleIcon,
      color: 'text-green-500'
    },
    {
      name: 'Google OAuth Login', 
      status: 'error',
      message: 'Error: auth/operation-not-allowed - Enable Google Sign-in in Firebase Console',
      icon: XCircleIcon,
      color: 'text-red-500'
    },
    {
      name: 'Phone OTP Login',
      status: 'warning', 
      message: 'Not configured - Optional feature',
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-500'
    }
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors"
        title="Authentication Debug Panel"
      >
        <InformationCircleIcon className="w-6 h-6" />
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white border border-gray-200 rounded-lg shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-800">🔐 Auth Debug Panel</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {/* Current User Status */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700 mb-2">Current User:</h4>
            {isAuthenticated ? (
              <div className="space-y-1 text-xs">
                <div>✅ <strong>Logged in:</strong> {user?.email || 'N/A'}</div>
                <div>👤 <strong>Role:</strong> {userRole}</div>
                <div>🆔 <strong>UID:</strong> {user?.uid?.substring(0, 8)}...</div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">❌ Not logged in</div>
            )}
          </div>

          {/* Authentication Methods Status */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-gray-700">Authentication Methods:</h4>
            {authStatus.map((method, index) => {
              const IconComponent = method.icon;
              return (
                <div key={index} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                  <IconComponent className={`w-4 h-4 mt-0.5 ${method.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs text-gray-800">{method.name}</div>
                    <div className="text-xs text-gray-600 break-words">{method.message}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 space-y-1">
              <div>🔧 <strong>To fix Google Login:</strong></div>
              <div className="ml-4">1. Go to Firebase Console</div>
              <div className="ml-4">2. Authentication → Sign-in method</div>
              <div className="ml-4">3. Enable Google provider</div>
              <div className="ml-4">4. Add support email</div>
            </div>
          </div>

          {/* Environment Info */}
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            <div>🌐 <strong>Environment:</strong> {process.env.NODE_ENV}</div>
            <div>🔥 <strong>Firebase Project:</strong> {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthDebugPanel;
