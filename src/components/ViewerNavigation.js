'use client';

import Link from 'next/link';
import Image from 'next/image';
import { memo } from 'react';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, ClockIcon, ArrowRightOnRectangleIcon, UserIcon
} from '@heroicons/react/24/outline';
import { 
  HomeIcon as HomeIconSolid, ClockIcon as ClockIconSolid
} from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import LoginPage from './LoginPage';

const menuItems = [
  { id: 'home', name: 'หน้าแรก', href: '/', icon: HomeIcon, activeIcon: HomeIconSolid },
  { id: 'schedule', name: 'ตารางงาน', href: '/schedule', icon: ClockIcon, activeIcon: ClockIconSolid }
];

const ViewerNavigation = memo(function ViewerNavigation() {
  const { user, logout, getUserDisplayName } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <nav className="bg-gradient-to-r from-white via-[#F8F5F2] to-white shadow-lg border-b border-[#B89B85]/10 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-14">
            <Link href="/" className="flex items-center gap-3 group hover:scale-105 transition-transform duration-200">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-white shadow-md border border-primary/20 group-hover:shadow-lg transition-shadow">
                <Image src="/logo.jpg" alt="Saba-i Massage Logo" width={36} height={36} className="object-cover" priority />
              </div>
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold text-[#4E3B31] font-heading bg-gradient-to-r from-[#B89B85] to-[#A1826F] bg-clip-text text-transparent">Saba-i</h1>
              </div>
            </Link>
            
            {/* Center Menu */}
            <div className="hidden xl:flex gap-2 items-center flex-1 justify-center">
              {menuItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = isActive ? item.activeIcon : item.icon;
                return (
                  <Link 
                    key={item.id} 
                    href={item.href} 
                    className={`
                        relative px-6 py-3 rounded-lg font-medium text-sm transition-all duration-300 flex items-center gap-2 group
                        ${isActive 
                        ? 'text-[#B89B85]' 
                        : 'text-[#7E7B77] hover:text-[#4E3B31]'
                        }
                `}
                    title={item.name}
                  >
                     <Icon className={`h-5 w-5 ${isActive ? 'text-[#B89B85]' : 'text-[#A5A5A5] group-hover:text-[#4E3B31]'} transition-colors`} />
                    <span className="font-medium">{item.name}</span>
                    {isActive && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full h-0.5 bg-primary rounded-full"></div>
                    )}
                  </Link>
                );
              })}
            </div>
            
            {/* User Section - แสดงปุ่ม login เสมอเมื่อไม่มี user */}
            <div className="flex items-center gap-3">
              {user && user.uid ? (
                <>
                 <div className="hidden lg:block text-right">
                <p className="text-sm text-[#4E3B31] font-medium">{getUserDisplayName ? getUserDisplayName() : 'User'}</p>
                </div>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#B89B85] to-[#A1826F] text-white flex items-center justify-center text-sm font-semibold shadow-md">
                        {getUserDisplayName ? getUserDisplayName().charAt(0).toUpperCase() : 'U'}
                        </div>
                  <button 
                        onClick={logout} 
                        className="p-2 text-[#7E7B77] hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200" 
                        title="ออกจากระบบ"
                        >
                    <ArrowRightOnRectangleIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  {/* แสดงปุ่ม Login เสมอ */}
                  <button 
                        onClick={() => setShowLoginModal(true)} 
                        className="px-6 py-2.5 bg-[#B89B85] text-white text-sm font-semibold rounded-lg 
                                hover:bg-[#A1826F] transition-all duration-200 
                                flex items-center gap-2 shadow-md border border-[#B89B85] 
                                hover:shadow-lg hover:border-[#A1826F]"
                        title="เข้าสู่ระบบ"
                        >
                        <UserIcon className="h-4 w-4" />
                        <span>เข้าสู่ระบบ</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Login Modal */}
      {showLoginModal && (
        <LoginPage onClose={() => setShowLoginModal(false)} />
      )}
    </>
  );
});

export default ViewerNavigation;
