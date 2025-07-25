'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import RoleBasedNavigation from '@/components/RoleBasedNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { LoadingSpinner } from '@/components/LoadingComponents';

/**
 * AppWrapper - จัดการการแสดงผลหลักของแอป
 * - แสดง Loading เมื่อกำลังตรวจสอบสถานะ Auth
 * - แสดง LoginPage เมื่อยังไม่ได้ login
 * - แสดง Main App พร้อม Navigation เมื่อ login แล้ว
 */
export default function AppWrapper({ children }) {
  const { user, loading } = useAuth();

  // กำลังโหลดสถานะ Authentication
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  // ยังไม่ได้ login - แสดงหน้า Login
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginPage />
      </div>
    );
  }

  // Login แล้ว - แสดง Main Application
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Navigation Sidebar */}
      <RoleBasedNavigation />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <ProtectedRoute>
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </ProtectedRoute>
      </main>
    </div>
  );
}
