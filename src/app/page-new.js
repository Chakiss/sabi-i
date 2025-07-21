'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTodayBookings, getTherapists, getServices } from '@/lib/firestore';
import { CalendarDaysIcon, UserGroupIcon, ClipboardDocumentListIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';

export default function HomePage() {
  const [todayStats, setTodayStats] = useState({
    bookings: 0,
    activeTherapists: 0,
    totalRevenue: 0,
    completedSessions: 0
  });
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [bookings, therapists, services] = await Promise.all([
          getTodayBookings(),
          getTherapists(),
          getServices()
        ]);

        const activeTherapists = therapists.filter(t => t.status === 'active').length;
        const completedBookings = bookings.filter(b => b.status === 'done');
        const totalRevenue = completedBookings.reduce((sum, booking) => {
          const service = services.find(s => s.id === booking.serviceId);
          return sum + (service?.priceByDuration?.[booking.duration] || 0);
        }, 0);

        setTodayStats({
          bookings: bookings.length,
          activeTherapists,
          totalRevenue,
          completedSessions: completedBookings.length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const menuItems = [
    {
      title: 'จองคิว',
      description: 'ลงคิวลูกค้า จัดหมอนวด',
      icon: CalendarDaysIcon,
      href: '/booking',
      color: 'bg-blue-500'
    },
    {
      title: 'จัดการหมอนวด',
      description: 'ข้อมูลพนักงาน ตารางเวร',
      icon: UserGroupIcon,
      href: '/therapists',
      color: 'bg-green-500'
    },
    {
      title: 'Dashboard',
      description: 'รายงานยอด สรุปรายได้',
      icon: ClipboardDocumentListIcon,
      href: '/dashboard',
      color: 'bg-purple-500'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                🌸 Saba-i Massage Management
              </h1>
              <p className="text-gray-600 mt-1">
                ระบบจัดการร้านนวดไทย
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">วันนี้</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date().toLocaleDateString('th-TH', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <CalendarDaysIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">คิววันนี้</p>
                <p className="text-2xl font-bold text-gray-900">{todayStats.bookings}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <UserGroupIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">หมอนวดที่เข้าเวร</p>
                <p className="text-2xl font-bold text-gray-900">{todayStats.activeTherapists}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <ClipboardDocumentListIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">เสร็จแล้ว</p>
                <p className="text-2xl font-bold text-gray-900">{todayStats.completedSessions}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100">
                <CurrencyDollarIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">รายได้วันนี้</p>
                <p className="text-2xl font-bold text-gray-900">
                  ฿{todayStats.totalRevenue.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              href={item.href}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 group"
            >
              <div className="flex items-center">
                <div className={`p-4 rounded-lg ${item.color} group-hover:scale-110 transition-transform duration-200`}>
                  <item.icon className="h-8 w-8 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
