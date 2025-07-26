'use client';

import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import AdminNavigation from '@/components/AdminNavigation';
import ViewerNavigation from '@/components/ViewerNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import PublicRoute from '@/components/PublicRoute';
import { LoadingSpinner } from '@/components/LoadingComponents';

/**
 * AppWrapper - จัดการการแสดงผลหลักของแอป
 * - แสดง Loading เมื่อกำลังตรวจสอบสถานะ Auth
 * - แสดง LoginPage เมื่อยังไม่ได้ login
 * - แสดง Main App พร้อม Navigation เมื่อ login แล้ว
 */
export default function AppWrapper({ children }) {
  const { user, role, loading } = useAuth();

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

  // ยังไม่ได้ login - แสดงหน้าแรกแบบ viewer (ไม่ต้อง login ทันที)
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {/* แสดง ViewerNavigation เสมอเมื่อยังไม่ได้ login */}
        <ViewerNavigation />
        
        {/* Main Content Area - ใช้ PublicRoute แทน ProtectedRoute */}
        <main className="flex-1 overflow-auto">
          <PublicRoute>
            <div className="w-full">
              {children}
            </div>
          </PublicRoute>
        </main>
      </div>
    );
  }

  // Login แล้ว - แสดง Main Application
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation - แสดงตาม role ที่ login */}
      {role === 'admin' ? <AdminNavigation /> : <ViewerNavigation />}
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <ProtectedRoute>
          <div className="w-full">
            {children}
          </div>
        </ProtectedRoute>
      </main>
    </div>
  );
}
