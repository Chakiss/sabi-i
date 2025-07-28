// Improved AdminNavigation component - iPad Landscape Collapsible Sidebar
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, CalendarDaysIcon, UserGroupIcon, WrenchScrewdriverIcon,
  ChartBarIcon, Cog6ToothIcon, QueueListIcon, ClockIcon,
  CogIcon, ChevronDownIcon, LockClosedIcon, ArrowRightOnRectangleIcon,
  UsersIcon, Bars3Icon, XMarkIcon, UserIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid, CalendarDaysIcon as CalendarDaysIconSolid, 
  UserGroupIcon as UserGroupIconSolid, WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  ChartBarIcon as ChartBarIconSolid, Cog6ToothIcon as Cog6ToothIconSolid, 
  QueueListIcon as QueueListIconSolid, ClockIcon as ClockIconSolid,
  UsersIcon as UsersIconSolid, UserIcon as UserIconSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const MENU = [
  { id: 'home', name: 'หน้าแรก', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { id: 'schedule', name: 'ตารางงาน', href: '/schedule', icon: ClockIcon, activeIcon: ClockIconSolid },
];

const DROPDOWNS = [
 
  {
    label: 'Report',
    icon: ChartBarIcon,
    items: [
      { id: 'reports', name: 'รายงาน', href: '/reports', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
      { id: 'dashboard', name: 'แดชบอร์ด', href: '/dashboard', icon: Cog6ToothIcon, activeIcon: Cog6ToothIconSolid }
    ],
    lock: true
  },
  {
    label: 'จัดการ',
    icon: CogIcon,
    items: [
      { id: 'therapists', name: 'นักบำบัด', href: '/therapists', icon: UserGroupIcon, activeIcon: UserGroupIconSolid },
      { id: 'services', name: 'บริการ', href: '/services', icon: WrenchScrewdriverIcon, activeIcon: WrenchScrewdriverIconSolid },
      { id: 'customers', name: 'ข้อมูลลูกค้า', href: '/customers', icon: UserIcon, activeIcon: UserIconSolid },
      { id: 'users', name: 'จัดการผู้ใช้', href: '/admin/users', icon: UsersIcon, activeIcon: UsersIconSolid }
    ],
    lock: true
  }
];

const AdminNavigation = memo(function AdminNavigation() {
  const { logout, getUserDisplayName } = useAuth();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [isOnIpad, setIsOnIpad] = useState(false);
  const pathname = usePathname();
  const dropdownRefs = useRef([]);

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
        const sidebar = document.querySelector('.admin-sidebar');
        if (sidebar && !sidebar.contains(e.target)) {
          setSidebarExpanded(false);
          setOpenDropdown(null);
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
      setOpenDropdown(null);
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      dropdownRefs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target)) {
          setOpenDropdown((prev) => (prev === i ? null : prev));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Sidebar Navigation */}
      <div 
        className={`admin-sidebar fixed left-0 top-0 h-full bg-gradient-to-b from-[#F8F5F2] via-white to-[#F8F5F2] shadow-xl border-r border-[#B89B85]/20 transition-all duration-300 ease-in-out z-50 ${
          sidebarExpanded ? 'w-64' : 'w-16'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#B89B85]/10">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-[#B89B85] to-[#A1826F] shadow-md border border-[#B89B85]/20 group-hover:shadow-lg transition-shadow flex-shrink-0">
                <Image 
                  src="/logo.jpg" 
                  alt="Saba-i Admin Logo" 
                  width={32} 
                  height={32} 
                  className="object-cover" 
                  priority 
                />
              </div>
              {sidebarExpanded && (
                <div className="overflow-hidden">
                  <h1 className="text-lg font-semibold font-heading bg-gradient-to-r from-[#4E3B31] to-[#B89B85] bg-clip-text text-transparent whitespace-nowrap">
                    Saba-i Admin
                  </h1>
                </div>
              )}
            </Link>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 py-4">
          <nav className="space-y-2 px-3">
            {/* Direct Menu Items */}
            {MENU.map((item) => {
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

            {/* Dropdown Sections */}
            {DROPDOWNS.map((dropdown, dropdownIndex) => {
              const hasActiveItem = dropdown.items.some(item => 
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
              );
              const DropdownIcon = dropdown.icon;
              
              return (
                <div key={dropdown.label} className="relative" ref={el => dropdownRefs.current[dropdownIndex] = el}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === dropdownIndex ? null : dropdownIndex)}
                    className={`
                      w-full flex items-center px-3 py-3 rounded-xl font-medium text-sm transition-all duration-200 group
                      ${hasActiveItem 
                        ? 'bg-gradient-to-r from-[#B89B85]/10 to-[#A1826F]/10 text-[#B89B85] border border-[#B89B85]/20 shadow-sm' 
                        : 'text-[#7E7B77] hover:text-[#4E3B31] hover:bg-[#F8F5F2] hover:shadow-sm'
                      }
                    `}
                    title={!sidebarExpanded ? dropdown.label : undefined}
                  >
                    <DropdownIcon className={`h-5 w-5 flex-shrink-0 ${
                      hasActiveItem ? 'text-[#B89B85]' : 'text-[#A5A5A5] group-hover:text-[#4E3B31]'
                    } transition-colors`} />
                    
                    {sidebarExpanded && (
                      <>
                        <span className="ml-3 whitespace-nowrap overflow-hidden flex-1 text-left">
                          {dropdown.label}
                        </span>
                        <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${
                          openDropdown === dropdownIndex ? 'rotate-180' : ''
                        }`} />
                      </>
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {openDropdown === dropdownIndex && sidebarExpanded && (
                    <div className="mt-2 ml-3 space-y-1 border-l border-[#B89B85]/20 pl-3">
                      {dropdown.items.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                        const Icon = isActive ? item.activeIcon : item.icon;
                        
                        return (
                          <Link
                            key={item.id}
                            href={item.href}
                            className={`
                              flex items-center px-3 py-2 rounded-lg text-sm transition-all duration-200 group
                              ${isActive 
                                ? 'bg-[#B89B85] text-white font-semibold shadow-sm' 
                                : 'text-[#7E7B77] hover:text-[#4E3B31] hover:bg-[#B89B85]/5'
                              }
                            `}
                            onClick={() => setOpenDropdown(null)}
                          >
                            <Icon className={`h-4 w-4 flex-shrink-0 ${
                              isActive ? 'text-white' : 'text-[#A5A5A5] group-hover:text-[#4E3B31]'
                            } transition-colors`} />
                            <span className="ml-3 whitespace-nowrap overflow-hidden">
                              {item.name}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Section */}
        <div className="border-t border-[#B89B85]/10 p-3">
          <div className="space-y-3">
            {/* User Info */}
            <div className="flex items-center px-3 py-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#B89B85] to-[#A1826F] text-white flex items-center justify-center text-sm font-semibold shadow-md flex-shrink-0">
                {getUserDisplayName ? getUserDisplayName().charAt(0).toUpperCase() : 'A'}
              </div>
              {sidebarExpanded && (
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm text-[#4E3B31] font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {getUserDisplayName ? getUserDisplayName() : 'Admin'}
                  </p>
                  <p className="text-xs text-[#7E7B77] whitespace-nowrap">Administrator</p>
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
          onClick={() => {
            setSidebarExpanded(false);
            setOpenDropdown(null);
          }}
        />
      )}
    </>
  );
});

export default AdminNavigation;
