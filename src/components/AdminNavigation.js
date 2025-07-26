// Improved AdminNavigation component (UI + structure enhancements)
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  HomeIcon, CalendarDaysIcon, UserGroupIcon, WrenchScrewdriverIcon,
  ChartBarIcon, Cog6ToothIcon, QueueListIcon, ClockIcon,
  CogIcon, ChevronDownIcon, LockClosedIcon, ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid, CalendarDaysIcon as CalendarDaysIconSolid, 
  UserGroupIcon as UserGroupIconSolid, WrenchScrewdriverIcon as WrenchScrewdriverIconSolid,
  ChartBarIcon as ChartBarIconSolid, Cog6ToothIcon as Cog6ToothIconSolid, 
  QueueListIcon as QueueListIconSolid, ClockIcon as ClockIconSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';

const MENU = [
  { id: 'home', name: 'หน้าแรก', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { id: 'schedule', name: 'ตารางงาน', href: '/schedule', icon: ClockIcon, activeIcon: ClockIconSolid },
];

const DROPDOWNS = [
  {
    label: 'จัดการ',
    icon: CogIcon,
    items: [
      { id: 'therapists', name: 'นักบำบัด', href: '/therapists', icon: UserGroupIcon, activeIcon: UserGroupIconSolid },
      { id: 'services', name: 'บริการ', href: '/services', icon: WrenchScrewdriverIcon, activeIcon: WrenchScrewdriverIconSolid }
    ],
    lock: true
  },
  {
    label: 'Report',
    icon: ChartBarIcon,
    items: [
      { id: 'reports', name: 'รายงาน', href: '/reports', icon: ChartBarIcon, activeIcon: ChartBarIconSolid },
      { id: 'dashboard', name: 'แดชบอร์ด', href: '/dashboard', icon: Cog6ToothIcon, activeIcon: Cog6ToothIconSolid }
    ],
    lock: true
  }
];

const AdminNavigation = memo(function AdminNavigation() {
  const { logout, getUserDisplayName } = useAuth();
  const [openDropdown, setOpenDropdown] = useState(null);
  const pathname = usePathname();
  const refs = useRef([]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      refs.current.forEach((ref, i) => {
        if (ref && !ref.contains(e.target)) setOpenDropdown((prev) => (prev === i ? null : prev));
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-[#F8F5F2]/95 backdrop-blur-lg border-b border-[#B89B85]/30 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo Section */}
          <Link href="/" className="flex items-center gap-4 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-[#B89B85] via-[#B89B85]/90 to-[#B89B85]/70 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
                <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="object-cover" priority />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-[#B89B85]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-xl font-bold bg-gradient-to-r from-[#4E3B31] via-[#B89B85] to-[#A1826F] bg-clip-text text-transparent">
                Saba-i
              </h1>
              <p className="text-xs text-[#7E7B77] font-medium -mt-1">Admin Panel</p>
            </div>
          </Link>

          {/* Center Navigation */}
          <div className="hidden xl:flex items-center gap-1 flex-1 justify-center">
            {MENU.map(({ id, name, href, icon, activeIcon }) => {
              const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
              const Icon = isActive ? activeIcon : icon;
              return (
                <Link 
                  key={id} 
                  href={href} 
                  className={`
                    relative group px-5 py-3 rounded-2xl font-medium text-sm transition-all duration-300 flex items-center gap-3
                    ${isActive 
                      ? 'text-[#B89B85] bg-[#B89B85]/10 shadow-sm' 
                      : 'text-[#7E7B77] hover:text-[#4E3B31] hover:bg-[#B89B85]/5'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-xl transition-all duration-300
                    ${isActive 
                      ? 'bg-[#B89B85]/20 text-[#B89B85]' 
                      : 'bg-[#ECE8E4] text-[#A5A5A5] group-hover:bg-[#B89B85]/10 group-hover:text-[#B89B85]'
                    }
                  `}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="font-semibold">{name}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-[#B89B85] to-transparent rounded-full"></div>
                  )}
                </Link>
              );
            })}

            {/* Dropdown Menus */}
            {DROPDOWNS.map((drop, i) => {
              const hasActiveItem = drop.items.some(item => pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href)));
              return (
                <div key={drop.label} className="relative" ref={(el) => (refs.current[i] = el)}>
                  <button
                    onClick={() => setOpenDropdown(openDropdown === i ? null : i)}
                    className={`
                      group px-5 py-3 rounded-2xl font-medium text-sm transition-all duration-300 flex items-center gap-3
                      ${hasActiveItem 
                        ? 'text-[#B89B85] bg-[#B89B85]/10 shadow-sm' 
                        : 'text-[#7E7B77] hover:text-[#4E3B31] hover:bg-[#B89B85]/5'
                      }
                    `}
                  >
                    <div className={`
                      p-2 rounded-xl transition-all duration-300
                      ${hasActiveItem 
                        ? 'bg-[#B89B85]/20 text-[#B89B85]' 
                        : 'bg-[#ECE8E4] text-[#A5A5A5] group-hover:bg-[#B89B85]/10 group-hover:text-[#B89B85]'
                      }
                    `}>
                      <drop.icon className="h-4 w-4" />
                    </div>
                    <span className="font-semibold">{drop.label}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform duration-200 ${openDropdown === i ? 'rotate-180' : ''}`} />
                  </button>

                  {openDropdown === i && (
                    <div className="absolute top-full left-0 mt-3 w-56 bg-[#F8F5F2]/98 backdrop-blur-xl border border-[#B89B85]/30 rounded-2xl shadow-2xl shadow-[#4E3B31]/10 overflow-hidden">
                      <div className="p-2">
                        {drop.items.map(({ id, name, href, icon: ItemIcon, activeIcon }) => {
                          const isItemActive = pathname === href || (href !== '/' && pathname.startsWith(href));
                          const ItemIconComponent = isItemActive ? activeIcon : ItemIcon;
                          return (
                            <Link
                              key={id}
                              href={href}
                              className={`
                                group flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                                ${isItemActive 
                                  ? 'bg-[#B89B85] text-white font-semibold shadow-sm' 
                                  : 'text-[#4E3B31] hover:text-[#B89B85] hover:bg-[#B89B85]/10'
                                }
                              `}
                              onClick={() => setOpenDropdown(null)}
                            >
                              <div className={`
                                p-1.5 rounded-lg transition-all duration-200
                                ${isItemActive 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-[#ECE8E4] text-[#A5A5A5] group-hover:bg-[#B89B85]/10 group-hover:text-[#B89B85]'
                                }
                              `}>
                                <ItemIconComponent className="w-3.5 h-3.5" />
                              </div>
                              {name}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {hasActiveItem && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-gradient-to-r from-transparent via-[#B89B85] to-transparent rounded-full"></div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-[#4E3B31]">{getUserDisplayName?.() || 'Admin'}</p>
                <p className="text-xs text-[#7E7B77] font-medium">Administrator</p>
              </div>
              <div className="relative group">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#B89B85] via-[#B89B85]/90 to-[#A1826F] text-white flex items-center justify-center text-sm font-bold shadow-lg group-hover:shadow-xl transition-all duration-300">
                  {getUserDisplayName?.().charAt(0).toUpperCase() || 'A'}
                </div>
                <div className="absolute -inset-1 bg-gradient-to-r from-[#B89B85]/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>

            {/* Logout Button */}
            <button 
              onClick={logout} 
              className="group p-3 text-[#7E7B77] hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all duration-200 relative"
              title="ออกจากระบบ"
            >
              <ArrowRightOnRectangleIcon className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

        </div>
      </div>
    </nav>

  );
});

export default AdminNavigation;
