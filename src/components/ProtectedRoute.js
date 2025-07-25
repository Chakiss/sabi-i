// 🔄 Protected Route Wrapper
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import LoginPage from '@/components/LoginPage';
import { LoadingSpinner } from '@/components/LoadingComponents';

const ProtectedRoute = ({ 
  children, 
  requireRole = null, 
  requirePermission = null,
  fallback = null 
}) => {
  const { user, loading } = useAuth();
  const { can } = usePermissions();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" />
          <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Check role requirements
  if (requireRole && user.role !== requireRole) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center glass p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h3>
          <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์ในการเข้าถึงหน้านี้</p>
          <p className="text-sm text-gray-500">ต้องการสิทธิ์: {requireRole}</p>
        </div>
      </div>
    );
  }

  // Check permission requirements
  if (requirePermission && !can(requirePermission)) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center glass p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีสิทธิ์</h3>
          <p className="text-gray-600 mb-4">คุณไม่มีสิทธิ์ในการดำเนินการนี้</p>
          <p className="text-sm text-gray-500">ต้องการสิทธิ์: {requirePermission}</p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
