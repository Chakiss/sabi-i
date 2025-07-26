'use client';

import { useState, useEffect } from 'react';
import { getAllUsers, updateUserRole } from '@/lib/firestore';
import { toast } from 'react-hot-toast';
import { 
  UsersIcon,
  UserIcon,
  ClockIcon,
  CalendarDaysIcon,
  ShieldCheckIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { th } from 'date-fns/locale';

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState(new Set());

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersData = await getAllUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูลผู้ใช้');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleUpdate = async (uid, newRole) => {
    if (updatingUsers.has(uid)) return;

    const currentUser = users.find(u => u.uid === uid);
    if (!currentUser) return;

    // Confirm role change
    const roleText = newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ดู';
    if (!confirm(`คุณต้องการเปลี่ยนสิทธิ์ของ ${currentUser.displayName || currentUser.email} เป็น ${roleText} ใช่หรือไม่?`)) {
      return;
    }

    setUpdatingUsers(prev => new Set(prev).add(uid));

    try {
      await updateUserRole(uid, newRole);
      
      // Update local state
      setUsers(prev => prev.map(user => 
        user.uid === uid ? { ...user, role: newRole } : user
      ));

      toast.success(`เปลี่ยนสิทธิ์ของ ${currentUser.displayName || currentUser.email} เป็น ${roleText} เรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสิทธิ์ผู้ใช้');
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(uid);
        return newSet;
      });
    }
  };

  const getRoleBadge = (role) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[#B89B85] to-[#A1826F] text-white shadow-sm">
          <ShieldCheckIcon className="h-3 w-3" />
          ผู้ดูแลระบบ
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
        <EyeIcon className="h-3 w-3" />
        ผู้ดู
      </span>
    );
  };

  const formatDate = (date) => {
    if (!date) return 'ไม่ระบุ';
    return new Intl.DateTimeFormat('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getRelativeTime = (date) => {
    if (!date) return 'ไม่ระบุ';
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: th 
      });
    } catch (error) {
      return formatDate(date);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-white to-[#F0EBE6] flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl p-8 text-center border border-[#B89B85]/20 max-w-md mx-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-transparent border-t-[#B89B85] mx-auto mb-6"></div>
          <div className="flex items-center justify-center gap-3 mb-4">
            <UsersIcon className="h-8 w-8 text-[#B89B85]" />
            <h2 className="text-2xl font-bold text-[#4E3B31]">กำลังโหลดข้อมูลผู้ใช้</h2>
          </div>
          <p className="text-[#7E7B77] font-medium">
            กรุณารอสักครู่...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F8F5F2] via-white to-[#F0EBE6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-[#B89B85]/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B89B85] to-[#A1826F] flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#4E3B31]">{users.length}</p>
                <p className="text-sm text-[#7E7B77] font-medium">ผู้ใช้ทั้งหมด</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-[#B89B85]/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#B89B85] to-[#A1826F] flex items-center justify-center">
                <ShieldCheckIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#4E3B31]">{users.filter(u => u.role === 'admin').length}</p>
                <p className="text-sm text-[#7E7B77] font-medium">ผู้ดูแลระบบ</p>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg p-6 border border-[#B89B85]/20 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center">
                <EyeIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-2xl font-bold text-[#4E3B31]">{users.filter(u => u.role === 'viewer').length}</p>
                <p className="text-sm text-[#7E7B77] font-medium">ผู้ดู</p>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-[#B89B85]/20 overflow-hidden">
          <div className="bg-gradient-to-r from-[#F8F5F2] to-white p-6 border-b border-[#B89B85]/20">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#B89B85] to-[#A1826F] flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-[#4E3B31] via-[#B89B85] to-[#A1826F] bg-clip-text text-transparent">
                  จัดการผู้ใช้และสิทธิ์
                </h1>
                <p className="text-[#7E7B77] mt-1">จัดการสิทธิ์การเข้าถึงของผู้ใช้ในระบบ</p>
              </div>
            </div>
          </div>

          {users.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <UsersIcon className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-600 mb-2">ไม่มีข้อมูลผู้ใช้</h3>
              <p className="text-gray-500">ยังไม่มีผู้ใช้ในระบบ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#F8F5F2]/50 border-b border-[#B89B85]/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#4E3B31]">ผู้ใช้</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#4E3B31]">สิทธิ์</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#4E3B31]">วันที่เริ่มใช้งาน</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-[#4E3B31]">ใช้งานล่าสุด</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-[#4E3B31]">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#B89B85]/10">
                  {users.map((user) => (
                    <tr key={user.uid} className="hover:bg-[#F8F5F2]/30 transition-colors duration-200">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#B89B85] to-[#A1826F] flex items-center justify-center text-white font-semibold text-sm">
                            {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#4E3B31]">
                              {user.displayName || 'ไม่ระบุชื่อ'}
                            </p>
                            <p className="text-sm text-[#7E7B77]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role || 'viewer')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#7E7B77]">
                          <CalendarDaysIcon className="h-4 w-4" />
                          <div>
                            <p>{formatDate(user.createdAt)}</p>
                            {user.createdAt && (
                              <p className="text-xs text-[#A5A5A5]">
                                {getRelativeTime(user.createdAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-[#7E7B77]">
                          <ClockIcon className="h-4 w-4" />
                          <div>
                            <p>{formatDate(user.lastSignIn)}</p>
                            {user.lastSignIn && (
                              <p className="text-xs text-[#A5A5A5]">
                                {getRelativeTime(user.lastSignIn)}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {user.role === 'admin' ? (
                            <button
                              onClick={() => handleRoleUpdate(user.uid, 'viewer')}
                              disabled={updatingUsers.has(user.uid)}
                              className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updatingUsers.has(user.uid) ? (
                                <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <EyeIcon className="h-3 w-3" />
                              )}
                              เปลี่ยนเป็นผู้ดู
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleUpdate(user.uid, 'admin')}
                              disabled={updatingUsers.has(user.uid)}
                              className="px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#B89B85] to-[#A1826F] hover:from-[#A1826F] hover:to-[#8F7060] rounded-lg shadow-sm transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {updatingUsers.has(user.uid) ? (
                                <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <ShieldCheckIcon className="h-3 w-3" />
                              )}
                              เปลี่ยนเป็นแอดมิน
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
