// 🎯 Role-based Navigation Component
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePermissions, RoleBadge } from '@/components/PermissionGate';
import { useAuth } from '@/contexts/AuthContext';
import { 
  HomeIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ChartBarIcon, 
  CogIcon,
  UserIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';

const RoleBasedNavigation = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { isAdmin, isStaff, canManageUsers, canManageSettings } = usePermissions();

  // Admin Navigation Items
  const adminNavItems = [
    { href: '/', label: 'Dashboard', icon: HomeIcon, permission: null },
    { href: '/bookings', label: 'การจองทั้งหมด', icon: CalendarDaysIcon, permission: null },
    { href: '/therapists', label: 'จัดการนักบำบัด', icon: UserGroupIcon, permission: 'manage_therapists' },
    { href: '/services', label: 'บริการ & ราคา', icon: CurrencyDollarIcon, permission: 'manage_services' },
    { href: '/reports', label: 'รายงาน', icon: ChartBarIcon, permission: 'view_all_reports' },
    { href: '/users', label: 'จัดการผู้ใช้', icon: UserIcon, permission: 'manage_users' },
    { href: '/settings', label: 'ตั้งค่าระบบ', icon: CogIcon, permission: 'manage_settings' }
  ];

  // Staff Navigation Items
  const staffNavItems = [
    { href: '/', label: 'แดชบอร์ดของฉัน', icon: HomeIcon, permission: null },
    { href: '/my-bookings', label: 'คิวของฉัน', icon: CalendarDaysIcon, permission: 'view_own_bookings' },
    { href: '/my-profile', label: 'ข้อมูลส่วนตัว', icon: UserIcon, permission: null },
    { href: '/my-reports', label: 'รายงานของฉัน', icon: ChartBarIcon, permission: 'view_own_reports' },
    { href: '/my-earnings', label: 'รายได้ของฉัน', icon: CurrencyDollarIcon, permission: 'view_own_reports' }
  ];

  const navItems = isAdmin() ? adminNavItems : staffNavItems;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-lg border-r border-gray-200 h-full">
      <div className="p-6">
        {/* Logo & Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">
            Sabai Massage
          </h1>
          <p className="text-sm text-gray-600 mt-1">Management System</p>
        </div>

        {/* User Info */}
        <div className="mb-8 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
              {user?.name?.charAt(0) || user?.email?.charAt(0)}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name || 'User'}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
          </div>
          <RoleBadge role={user?.role} />
        </div>

        {/* Navigation Items */}
        <div className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Logout Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">ออกจากระบบ</span>
          </button>
        </div>

        {/* Version Info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-400">Version 2.0.0</p>
        </div>
      </div>
    </nav>
  );
};

export default RoleBasedNavigation;
