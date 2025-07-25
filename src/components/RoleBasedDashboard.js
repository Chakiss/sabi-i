// 📊 Role-based Dashboard Components
'use client';

import { usePermissions } from '@/hooks/usePermissions';
import PermissionGate from '@/components/PermissionGate';
import { 
  CurrencyDollarIcon, 
  UserGroupIcon, 
  CalendarDaysIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline';

// Admin Dashboard - Full System Overview
export const AdminDashboard = ({ stats, bookings, therapists }) => {
  return (
    <div className="space-y-6">
      {/* Admin Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="รายได้รวมวันนี้"
          value={`฿${stats.totalRevenue?.toLocaleString() || 0}`}
          icon={CurrencyDollarIcon}
          color="from-green-400 to-green-600"
          subtitle={`${stats.completedSessions || 0} เซสชันเสร็จสิ้น`}
        />
        
        <StatCard
          title="นักบำบัดที่ว่าง"
          value={`${stats.availableCount || 0}/${stats.activeTherapists || 0}`}
          icon={UserGroupIcon}
          color="from-blue-400 to-blue-600"
          subtitle="คนที่พร้อมรับงาน"
        />
        
        <StatCard
          title="คิววันนี้"
          value={stats.bookings || 0}
          icon={CalendarDaysIcon}
          color="from-purple-400 to-purple-600"
          subtitle="การจองทั้งหมด"
        />
        
        <StatCard
          title="นักบำบัดกำลังทำงาน"
          value={stats.busyCount || 0}
          icon={UserGroupIcon}
          color="from-orange-400 to-orange-600"
          subtitle="คนที่กำลังให้บริการ"
        />
      </div>

      {/* Admin-only sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AllTherapistsStatus therapists={therapists} stats={stats} />
        <RevenueBreakdown bookings={bookings} />
      </div>
    </div>
  );
};

// Staff Dashboard - Personal Overview
export const StaffDashboard = ({ personalStats, myBookings, user }) => {
  return (
    <div className="space-y-6">
      {/* Staff Personal Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="รายได้ของฉันวันนี้"
          value={`฿${personalStats.myEarnings?.toLocaleString() || 0}`}
          icon={CurrencyDollarIcon}
          color="from-green-400 to-green-600"
          subtitle={`${personalStats.myCompletedSessions || 0} เซสชัน`}
        />
        
        <StatCard
          title="คิวของฉันวันนี้"
          value={personalStats.myBookings || 0}
          icon={CalendarDaysIcon}
          color="from-blue-400 to-blue-600"
          subtitle="การจองทั้งหมด"
        />
        
        <StatCard
          title="สถานะปัจจุบัน"
          value={personalStats.currentStatus || 'ว่าง'}
          icon={UserGroupIcon}
          color="from-purple-400 to-purple-600"
          subtitle="สถานะการทำงาน"
        />
      </div>

      {/* Staff-specific sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MyBookingsToday bookings={myBookings} />
        <MyPerformanceChart stats={personalStats} />
      </div>
    </div>
  );
};

// Reusable Stat Card Component
const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <div className="glass p-6 hover:shadow-lg transition-shadow duration-200">
    <div className="flex items-center">
      <div className={`p-4 rounded-2xl bg-gradient-to-r ${color} shadow-lg`}>
        <Icon className="w-8 h-8 text-white" />
      </div>
      <div className="ml-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// Admin-only: All Therapists Status
const AllTherapistsStatus = ({ therapists = [], stats = {} }) => (
  <PermissionGate role="admin">
    <div className="glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">สถานะนักบำบัดทั้งหมด</h3>
      <div className="space-y-3">
        {/* Available Therapists */}
        <div className="border-l-4 border-green-500 pl-4">
          <h4 className="font-medium text-green-800">พร้อมให้บริการ ({stats.availableCount || 0})</h4>
          <div className="text-sm text-gray-600">
            {stats.availableTherapists?.map(therapist => (
              <span key={therapist.id} className="inline-block mr-3 mb-1">
                {therapist.name}
              </span>
            )) || 'ไม่มีข้อมูล'}
          </div>
        </div>
        
        {/* Busy Therapists */}
        <div className="border-l-4 border-orange-500 pl-4">
          <h4 className="font-medium text-orange-800">กำลังให้บริการ ({stats.busyCount || 0})</h4>
          <div className="text-sm text-gray-600">
            {stats.busyTherapists?.map(therapist => (
              <div key={therapist.id} className="mb-1">
                <span className="font-medium">{therapist.name}</span> - 
                <span className="text-gray-500"> {therapist.customer} ({therapist.service})</span>
              </div>
            )) || 'ไม่มีข้อมูล'}
          </div>
        </div>
      </div>
    </div>
  </PermissionGate>
);

// Admin-only: Revenue Breakdown
const RevenueBreakdown = ({ bookings = [] }) => (
  <PermissionGate role="admin">
    <div className="glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">รายละเอียดรายได้</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">รายได้รวม</span>
          <span className="font-semibold">฿{bookings.reduce((sum, b) => sum + (b.finalPrice || 0), 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-gray-100">
          <span className="text-gray-600">ค่าคอมมิชชั่น</span>
          <span className="text-red-600">-฿{bookings.reduce((sum, b) => sum + (b.therapistCommission || 0), 0).toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center py-2 font-semibold text-lg">
          <span>รายได้สุทธิร้าน</span>
          <span className="text-green-600">฿{bookings.reduce((sum, b) => sum + (b.shopRevenue || 0), 0).toLocaleString()}</span>
        </div>
      </div>
    </div>
  </PermissionGate>
);

// Staff-only: My Bookings Today
const MyBookingsToday = ({ bookings = [] }) => (
  <PermissionGate role="staff">
    <div className="glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">คิวของฉันวันนี้</h3>
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {bookings.length > 0 ? bookings.map(booking => (
          <div key={booking.id} className="p-3 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{booking.customerName}</p>
                <p className="text-sm text-gray-600">{booking.serviceName}</p>
                <p className="text-xs text-gray-500">{booking.startTime} - {booking.duration} นาที</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                booking.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-green-100 text-green-800'
              }`}>
                {booking.status === 'pending' ? 'รอเริ่ม' :
                 booking.status === 'in_progress' ? 'กำลังดำเนินการ' : 'เสร็จสิ้น'}
              </span>
            </div>
          </div>
        )) : (
          <p className="text-gray-500 text-center py-4">ไม่มีคิววันนี้</p>
        )}
      </div>
    </div>
  </PermissionGate>
);

// Staff-only: Performance Chart Placeholder
const MyPerformanceChart = ({ stats = {} }) => (
  <PermissionGate role="staff">
    <div className="glass p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">ผลงานของฉัน</h3>
      <div className="text-center py-8 text-gray-500">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-2 text-gray-400" />
        <p>กราฟผลงานจะแสดงที่นี่</p>
        <p className="text-sm">รายได้รวม 7 วัน: ฿{stats.weeklyEarnings?.toLocaleString() || 0}</p>
      </div>
    </div>
  </PermissionGate>
);

// Main Dashboard Component with Role Detection
const RoleBasedDashboard = ({ dashboardData }) => {
  const { isAdmin, isStaff, user } = usePermissions();

  if (isAdmin()) {
    return <AdminDashboard {...dashboardData} />;
  }

  if (isStaff()) {
    return <StaffDashboard {...dashboardData} user={user} />;
  }

  return (
    <div className="text-center py-12">
      <p className="text-gray-600">ไม่พบข้อมูลสิทธิ์การเข้าถึง</p>
    </div>
  );
};

export default RoleBasedDashboard;
