'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { 
  HomeIcon, 
  CalendarDaysIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  UserIcon,
  ArrowRightOnRectangleIcon,
  Cog6ToothIcon,
  LockClosedIcon,
  Bars3Icon,
  XMarkIcon,
  CogIcon,
  ChevronDownIcon,
  QueueListIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import LoginPage from './LoginPage';
import toast from 'react-hot-toast';

const RoleBasedNavigation = () => {
  const { user, role, permissions, logout, getUserDisplayName } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isManageDropdownOpen, setIsManageDropdownOpen] = useState(false);
  const [isReportDropdownOpen, setIsReportDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const reportDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsManageDropdownOpen(false);
      }
      if (reportDropdownRef.current && !reportDropdownRef.current.contains(event.target)) {
        setIsReportDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const result = await logout();
      if (result && result.success) {
        setIsMobileMenuOpen(false);
        // Don't show toast here since AuthContext already shows it
      } else {
        setIsMobileMenuOpen(false);
      }
    } catch (error) {
      console.error('Logout error:', error);
      setIsMobileMenuOpen(false);
    }
  };

  // Define menu items based on roles
  const menuItems = [
    {
      id: 'home',
      name: 'หน้าแรก',
      href: '/',
      icon: HomeIcon,
      roles: ['viewer', 'admin'],
      description: 'ภาพรวมของระบบ'
    },
    {
      id: 'schedule',
      name: 'ตารางงาน',
      href: '/schedule',
      icon: ClockIcon,
      roles: ['viewer', 'admin'],
      description: 'ตารางการทำงานของนักบำบัด'
    },
    {
      id: 'queue',
      name: 'จัดการคิว',
      href: '/queue',
      icon: QueueListIcon,
      roles: ['admin'],
      description: 'จัดการคิววันนี้'
    },
    {
      id: 'booking',
      name: 'จองนวด',
      href: '/booking',
      icon: CalendarDaysIcon,
      roles: ['admin'],
      description: 'จองการนวด'
    }
  ];

  // Define management submenu items
  const manageItems = [
    {
      id: 'therapists',
      name: 'นักบำบัด',
      href: '/therapists',
      icon: UserGroupIcon,
      description: 'จัดการข้อมูลนักบำบัด'
    },
    {
      id: 'services',
      name: 'บริการ',
      href: '/services',
      icon: WrenchScrewdriverIcon,
      description: 'จัดการประเภทการนวด'
    }
  ];

  // Define report submenu items
  const reportItems = [
    {
      id: 'reports',
      name: 'รายงาน',
      href: '/reports',
      icon: ChartBarIcon,
      description: 'สถิติและรายงานการดำเนินงาน'
    },
    {
      id: 'dashboard',
      name: 'แดชบอร์ด',
      href: '/dashboard',
      icon: Cog6ToothIcon,
      description: 'จัดการระบบและการตั้งค่า'
    }
  ];

  // Filter menu items based on current user role
  const visibleMenuItems = user 
    ? menuItems.filter(item => 
        item.roles.includes(role || 'viewer') && 
        !['queue', 'booking'].includes(item.id) // Hide queue and booking menus when logged in
      )
    : menuItems.filter(item => item.roles.includes('viewer')); // Show viewer items when not logged in

  return (
    <>
      {/* Glassmorphism Navigation Header */}
      <nav className="bg-gradient-to-r from-white/90 via-purple-50/80 to-blue-50/70 backdrop-blur-xl border-b border-white/30 shadow-2xl sticky top-0 z-50 overflow-visible">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-r from-pink-300/10 via-purple-300/10 to-blue-300/10"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-pink-400/20 to-yellow-400/20 rounded-full blur-2xl animate-pulse delay-1000"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex justify-between items-center h-20 gap-4">
            
            {/* Logo & Brand */}
            <Link href="/" className="flex items-center space-x-4 hover:opacity-80 transition-all duration-300 cursor-pointer min-w-0 group">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-white/95 to-purple-50/80 backdrop-blur-xl shadow-2xl border border-white/40 relative flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 group-hover:from-blue-500/20 group-hover:to-purple-500/20 transition-all duration-300"></div>
                <Image 
                  src="/logo.jpg" 
                  alt="Saba-i Massage Logo" 
                  width={56}
                  height={56}
                  className="object-cover relative z-10"
                  priority
                />
              </div>
              <div className="hidden lg:block min-w-0">
                <h1 className="text-2xl font-bold font-heading bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm whitespace-nowrap group-hover:scale-105 transition-transform duration-300">
                  Saba-i Massage
                </h1>
                <p className="text-xs text-gray-600 font-medium font-body tracking-wide whitespace-nowrap opacity-80">Traditional Thai Massage</p>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden xl:flex items-center space-x-6 flex-1 justify-center max-w-2xl">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 hover:bg-white/80 hover:text-blue-600 hover:shadow-lg hover:scale-105 transition-all duration-300 group whitespace-nowrap shadow-lg"
                    title={item.description}
                  >
                    <Icon className="h-4 w-4 group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300" />
                    <span className="text-sm font-medium tracking-wide">{item.name}</span>
                    {item.adminOnly && (
                      <LockClosedIcon className="h-3 w-3 text-red-400 opacity-70" />
                    )}
                  </a>
                );
              })}
              
              {/* Management Dropdown - Admin Only */}
              {user && role === 'admin' && (
                <div className="relative nav-dropdown" ref={dropdownRef}>
                  <button
                    onClick={() => setIsManageDropdownOpen(!isManageDropdownOpen)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 hover:bg-white/80 hover:text-purple-600 hover:shadow-lg hover:scale-105 transition-all duration-300 group whitespace-nowrap shadow-lg"
                    title="จัดการระบบ"
                  >
                    <CogIcon className="h-4 w-4 group-hover:scale-110 group-hover:text-purple-600 transition-all duration-300" />
                    <span className="text-sm font-medium tracking-wide">จัดการ</span>
                    <ChevronDownIcon className={`h-3 w-3 transition-transform duration-300 ${isManageDropdownOpen ? 'rotate-180' : ''}`} />
                    <LockClosedIcon className="h-3 w-3 text-red-400 opacity-70" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isManageDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gradient-to-br from-white/95 to-purple-50/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl py-3 z-[9999] overflow-hidden dropdown-menu">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5"></div>
                      {manageItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            className="relative z-10 flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-white/60 hover:text-purple-600 hover:shadow-lg transition-all duration-300 mx-2 rounded-xl"
                            title={item.description}
                            onClick={() => setIsManageDropdownOpen(false)}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{item.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Report Dropdown - Admin Only */}
              {user && role === 'admin' && (
                <div className="relative nav-dropdown" ref={reportDropdownRef}>
                  <button
                    onClick={() => setIsReportDropdownOpen(!isReportDropdownOpen)}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 hover:bg-white/80 hover:text-blue-600 hover:shadow-lg hover:scale-105 transition-all duration-300 group whitespace-nowrap shadow-lg"
                    title="รายงานและแดชบอร์ด"
                  >
                    <ChartBarIcon className="h-4 w-4 group-hover:scale-110 group-hover:text-blue-600 transition-all duration-300" />
                    <span className="text-sm font-medium tracking-wide">Report</span>
                    <ChevronDownIcon className={`h-3 w-3 transition-transform duration-300 ${isReportDropdownOpen ? 'rotate-180' : ''}`} />
                    <LockClosedIcon className="h-3 w-3 text-red-400 opacity-70" />
                  </button>
                  
                  {/* Dropdown Menu */}
                  {isReportDropdownOpen && (
                    <div className="absolute top-full left-0 mt-2 w-48 bg-gradient-to-br from-white/95 to-blue-50/80 backdrop-blur-xl border border-white/40 rounded-2xl shadow-2xl py-3 z-[9999] overflow-hidden dropdown-menu">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
                      {reportItems.map((item) => {
                        const Icon = item.icon;
                        
                        return (
                          <a
                            key={item.id}
                            href={item.href}
                            className="relative z-10 flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-lg transition-all duration-300 mx-2 rounded-xl"
                            title={item.description}
                            onClick={() => setIsReportDropdownOpen(false)}
                          >
                            <Icon className="h-4 w-4" />
                            <span className="text-sm font-medium">{item.name}</span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User Section */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              {user ? (
                <>
                  <div className="hidden lg:block text-right">
                    <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{getUserDisplayName ? getUserDisplayName() : 'Unknown'}</p>
                    <p className="text-xs text-gray-600 font-medium whitespace-nowrap">{role === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้'}</p>
                  </div>
                  
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm shadow-2xl backdrop-blur-xl border border-white/30 hover:scale-110 transition-transform duration-300">
                    {getUserDisplayName ? getUserDisplayName().charAt(0).toUpperCase() : 'U'}
                  </div>
                  
                  <button
                    onClick={handleLogout}
                    className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 text-gray-600 hover:text-red-500 hover:bg-red-50/80 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                    title="ออกจากระบบ"
                  >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-semibold rounded-xl shadow-2xl hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center space-x-2 backdrop-blur-xl border border-white/30"
                >
                  <UserIcon className="h-4 w-4" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="xl:hidden p-3 bg-white/60 backdrop-blur-sm border border-white/30 text-gray-600 hover:text-gray-800 hover:bg-white/80 rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Glassmorphism Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden bg-gradient-to-br from-white/95 to-purple-50/85 backdrop-blur-xl border-t border-white/30 shadow-2xl relative overflow-hidden">
            {/* Mobile Menu Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-pink-300/5 via-purple-300/5 to-blue-300/5"></div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"></div>
            
            <div className="max-w-7xl mx-auto px-4 py-6 space-y-3 relative z-10">
              
              {/* Mobile User Info */}
              {user && (
                <div className="flex items-center space-x-3 p-4 bg-gradient-to-r from-white/80 to-purple-50/60 backdrop-blur-sm rounded-2xl mb-4 shadow-lg border border-white/40">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold shadow-lg">
                    {getUserDisplayName ? getUserDisplayName().charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{getUserDisplayName ? getUserDisplayName() : 'Unknown User'}</p>
                    <p className="text-xs text-gray-600">{role === 'admin' ? 'ผู้ดูแล' : 'ผู้ใช้'}</p>
                  </div>
                </div>
              )}

              {/* Mobile Login Button - Show when not logged in */}
              {!user && (
                <button
                  onClick={() => {
                    setShowLoginModal(true);
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-2xl hover:shadow-xl transition-all duration-300 w-full mb-4 backdrop-blur-xl border border-white/30"
                >
                  <UserIcon className="h-5 w-5" />
                  <span className="font-semibold">เข้าสู่ระบบ</span>
                </button>
              )}

              {/* Mobile Menu Items */}
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center space-x-3 p-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/40 text-gray-700 hover:bg-white/90 hover:text-blue-600 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 shadow-lg"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <Icon className="h-5 w-5 text-gray-600" />
                    <span className="font-medium">{item.name}</span>
                    {item.adminOnly && (
                      <LockClosedIcon className="h-3 w-3 text-red-500 ml-auto" />
                    )}
                  </a>
                );
              })}

              {/* Mobile Report Section - Admin Only */}
              {user && role === 'admin' && (
                <div className="bg-gradient-to-r from-white/60 to-blue-50/40 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg pt-4 mt-4">
                  <div className="px-4 py-2">
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">รายงาน</p>
                  </div>
                  {reportItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <a
                        key={item.id}
                        href={item.href}
                        className="flex items-center space-x-3 p-4 text-gray-700 hover:bg-white/60 hover:text-blue-600 hover:shadow-lg transition-all duration-300 mx-2 mb-2 rounded-xl"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-5 w-5 text-gray-600" />
                        <span className="font-medium">{item.name}</span>
                        <LockClosedIcon className="h-3 w-3 text-red-500 ml-auto" />
                      </a>
                    );
                  })}
                </div>
              )}

              {/* Mobile Management Section - Admin Only */}
              {user && role === 'admin' && (
                <>
                  <div className="bg-gradient-to-r from-white/60 to-purple-50/40 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg pt-4 mt-4">
                    <div className="px-4 py-2">
                      <p className="text-xs font-bold text-purple-600 uppercase tracking-wide">จัดการระบบ</p>
                    </div>
                    {manageItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <a
                          key={item.id}
                          href={item.href}
                          className="flex items-center space-x-3 p-4 text-gray-700 hover:bg-white/60 hover:text-purple-600 hover:shadow-lg transition-all duration-300 mx-2 mb-2 rounded-xl"
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <Icon className="h-5 w-5 text-gray-600" />
                          <span className="font-medium">{item.name}</span>
                        </a>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Mobile Logout */}
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center space-x-3 p-4 rounded-2xl bg-gradient-to-r from-red-50/80 to-red-100/60 backdrop-blur-sm border border-red-200/40 text-red-600 hover:bg-red-100/80 hover:shadow-lg hover:scale-[1.02] transition-all duration-300 w-full shadow-lg"
                >
                  <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  <span className="font-semibold">ออกจากระบบ</span>
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
};

export default RoleBasedNavigation;
