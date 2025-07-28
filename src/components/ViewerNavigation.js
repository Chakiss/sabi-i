'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, ClockIcon, ArrowRightOnRectangleIcon, UserIcon, Bars3Icon, XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, ClockIcon as ClockIconSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect } from 'react';
import LoginPage from './LoginPage';

const menuItems = [
  { id: 'home', name: 'หน้าแรก', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { id: 'schedule', name: 'ตารางงาน', href: '/schedule', icon: ClockIcon, activeIcon: ClockIconSolid }
];

const ViewerNavigation = memo(function ViewerNavigation() {
  const { user, logout, getUserDisplayName } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [isOnIpad, setIsOnIpad] = useState(false);
  const pathname = usePathname();

  // Detect iPad
  useEffect(() => {
    const isIpadDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    setIsOnIpad(isIpadDevice);
  }, []);

  // Handle outside click for iPad
  useEffect(() => {
    if (isOnIpad && sidebarExpanded) {
      const handleOutsideClick = (e) => {
        // Check if click is outside sidebar
        const sidebar = document.querySelector('.viewer-sidebar');
        if (sidebar && !sidebar.contains(e.target)) {
          setSidebarExpanded(false);
        }
      };

      document.addEventListener('touchstart', handleOutsideClick);
      document.addEventListener('click', handleOutsideClick);

      return () => {
        document.removeEventListener('touchstart', handleOutsideClick);
        document.removeEventListener('click', handleOutsideClick);
      };
    }
  }, [isOnIpad, sidebarExpanded]);

  const toggleSidebar = () => {
    setSidebarExpanded(!sidebarExpanded);
  };

  const handleMouseEnter = () => {
    if (!isOnIpad) {
      setSidebarExpanded(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isOnIpad) {
      setSidebarExpanded(false);
    }
  };

  return (
    <>
      {/* Sidebar Navigation */}
      <div 
        className={`viewer-sidebar fixed left-0 top-0 h-full bg-gradient-to-b from-white via-[#F8F5F2] to-white shadow-xl border-r border-[#B89B85]/20 transition-all duration-300 ease-in-out z-50 ${
          sidebarExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#B89B85]/10">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-md border border-primary/20 group-hover:shadow-lg transition-shadow flex-shrink-0">
                <Image 
                  src="/logo.jpg" 
                  alt="Saba-i Massage Logo" 
                  width={32} 
                  height={32} 
                  className="object-cover" 
                  priority 
                />
              </div>
              {sidebarExpanded && (
                <div className="overflow-hidden">
                  <h1 className="text-lg font-semibold font-heading bg-gradient-to-r from-[#B89B85] to-[#A1826F] bg-clip-text text-transparent whitespace-nowrap">
                    Saba-i Massage
                  </h1>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-4">
          <nav className="space-y-2 px-3">
            {menuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = isActive ? item.activeIcon : item.icon;
              
              return (
                <Link 
                  key={item.id} 
                  href={item.href} 
                  className={`
                    relative flex items-center px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 group
                    ${isActive 
                      ? 'bg-gradient-to-r from-[#B89B85]/10 to-[#A1826F]/10 text-[#B89B85] border border-[#B89B85]/20 shadow-sm' 
                      : 'text-[#7E7B77] hover:text-[#4E3B31] hover:bg-[#F8F5F2] hover:shadow-sm'
                    }
                  `}
                  title={!sidebarExpanded ? item.name : undefined}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${
                    isActive ? 'text-[#B89B85]' : 'text-[#A5A5A5] group-hover:text-[#4E3B31]'
                  } transition-colors`} />
                  
                  {sidebarExpanded && (
                    <span className="ml-3 whitespace-nowrap overflow-hidden">
                      {item.name}
                    </span>
                  )}
                  
                  {isActive && (
                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-1 h-6 bg-[#B89B85] rounded-l-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className="border-t border-[#B89B85]/10 p-3">
          {user && user.uid ? (
            <div className="space-y-3">
              {/* User Info */}
              <div className="flex items-center px-3 py-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B89B85] to-[#A1826F] text-white flex items-center justify-center text-sm font-semibold shadow-md flex-shrink-0">
                  {getUserDisplayName ? getUserDisplayName().charAt(0).toUpperCase() : 'U'}
                </div>
                {sidebarExpanded && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm text-[#4E3B31] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                      {getUserDisplayName ? getUserDisplayName() : 'User'}
                    </p>
                  </div>
                )}
              </div>
              
              {/* Logout Button */}
              <button 
                onClick={logout} 
                className="w-full flex items-center px-3 py-2 text-[#7E7B77] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                title={!sidebarExpanded ? "ออกจากระบบ" : undefined}
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5 flex-shrink-0" />
                {sidebarExpanded && (
                  <span className="ml-3 text-sm font-medium">ออกจากระบบ</span>
                )}
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="w-full flex items-center px-3 py-2.5 bg-[#B89B85] text-white text-sm font-semibold rounded-lg hover:bg-[#A1826F] transition-all duration-200 shadow-md border border-[#B89B85] hover:shadow-lg hover:border-[#A1826F]"
              title={!sidebarExpanded ? "เข้าสู่ระบบ" : undefined}
            >
              <UserIcon className="h-5 w-5 flex-shrink-0" />
              {sidebarExpanded && (
                <span className="ml-3">เข้าสู่ระบบ</span>
              )}
            </button>
          )}
        </div>

        {/* Toggle Button */}
        <div className="absolute -right-3 top-4">
          <button
            onClick={toggleSidebar}
            className="w-6 h-6 bg-white border border-[#B89B85]/30 rounded-full shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center text-[#B89B85] hover:text-[#A1826F]"
          >
            {sidebarExpanded ? (
              <XMarkIcon className="h-3 w-3" />
            ) : (
              <Bars3Icon className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Overlay for iPad when expanded */}
      {isOnIpad && sidebarExpanded && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setSidebarExpanded(false)}
        />
      )}

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
});

export default ViewerNavigation;
