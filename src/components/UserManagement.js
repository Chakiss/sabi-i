// 👨‍💼 User Management Page (Admin Only)
'use client';

import { useState, useEffect } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import PermissionGate, { RoleBadge } from '@/components/PermissionGate';
import { toast } from 'react-hot-toast';
import { 
  UserPlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  LockClosedIcon,
  LockOpenIcon 
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { canManageUsers } = usePermissions();

  // Mock data - Replace with actual API calls
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setUsers([
        {
          id: '1',
          name: 'Admin User',
          email: 'admin@sabai.com',
          role: 'admin',
          isActive: true,
          createdAt: '2025-01-15',
          lastLogin: '2025-01-24',
          therapistId: null
        },
        {
          id: '2', 
          name: 'ขวัญ นวดดี',
          email: 'kwan@sabai.com',
          role: 'staff',
          isActive: true,
          createdAt: '2025-01-16',
          lastLogin: '2025-01-23',
          therapistId: 'therapist_001'
        },
        {
          id: '3',
          name: 'สมชาย ผ่อนคลาย', 
          email: 'somchai@sabai.com',
          role: 'staff',
          isActive: false,
          createdAt: '2025-01-10',
          lastLogin: '2025-01-20',
          therapistId: 'therapist_002'
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleAddUser = async (userData) => {
    try {
      // API call to create user
      console.log('Creating user:', userData);
      toast.success('เพิ่มผู้ใช้สำเร็จ!');
      setShowAddModal(false);
      // Refresh users list
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเพิ่มผู้ใช้');
    }
  };

  const handleEditUser = async (userId, userData) => {
    try {
      // API call to update user
      console.log('Updating user:', userId, userData);
      toast.success('อัปเดตผู้ใช้สำเร็จ!');
      setEditingUser(null);
      // Refresh users list
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการอัปเดตผู้ใช้');
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    try {
      // API call to toggle user active status
      console.log('Toggling user active:', userId, isActive);
      toast.success(isActive ? 'เปิดใช้งานผู้ใช้แล้ว' : 'ปิดใช้งานผู้ใช้แล้ว');
      // Update local state
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, isActive } : user
      ));
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนสถานะผู้ใช้');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบผู้ใช้นี้?')) return;
    
    try {
      // API call to delete user
      console.log('Deleting user:', userId);
      toast.success('ลบผู้ใช้สำเร็จ!');
      setUsers(prev => prev.filter(user => user.id !== userId));
    } catch (error) {
      toast.error('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  return (
    <PermissionGate permission="manage_users" showAccessDenied>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">จัดการผู้ใช้งาน</h1>
            <p className="text-gray-600">เพิ่ม แก้ไข และจัดการสิทธิ์ผู้ใช้งานในระบบ</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-pink-600 hover:to-purple-700 transition-colors"
          >
            <UserPlusIcon className="w-5 h-5" />
            <span>เพิ่มผู้ใช้ใหม่</span>
          </button>
        </div>

        {/* Users Table */}
        <div className="glass overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ผู้ใช้
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สิทธิ์
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    สถานะ
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    เข้าสู่ระบบล่าสุด
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    การดำเนินการ
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
                          <div>
                            <div className="h-4 bg-gray-200 rounded w-32 animate-pulse mb-1"></div>
                            <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-6 bg-gray-200 rounded w-16 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            <p className="text-sm text-gray-600">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          user.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'ใช้งาน' : 'ปิดใช้งาน'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {user.lastLogin || 'ไม่เคยเข้าใช้'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="แก้ไข"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={() => handleToggleActive(user.id, !user.isActive)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive 
                                ? 'text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={user.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                          >
                            {user.isActive ? (
                              <LockClosedIcon className="w-4 h-4" />
                            ) : (
                              <LockOpenIcon className="w-4 h-4" />
                            )}
                          </button>
                          
                          {user.role !== 'admin' && (
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="ลบ"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100">
                <UserPlusIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ผู้ใช้ทั้งหมด</p>
                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
              </div>
            </div>
          </div>
          
          <div className="glass p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100">
                <LockOpenIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">ใช้งานอยู่</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="glass p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100">
                <UserPlusIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Admin</p>
                <p className="text-2xl font-bold text-gray-900">
                  {users.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <UserModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUser}
          title="เพิ่มผู้ใช้ใหม่"
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <UserModal
          isOpen={!!editingUser}
          onClose={() => setEditingUser(null)}
          onSubmit={(data) => handleEditUser(editingUser.id, data)}
          title="แก้ไขผู้ใช้"
          initialData={editingUser}
        />
      )}
    </PermissionGate>
  );
};

// User Form Modal Component
const UserModal = ({ isOpen, onClose, onSubmit, title, initialData = {} }) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    email: initialData.email || '',
    role: initialData.role || 'staff',
    password: '',
    confirmPassword: '',
    therapistId: initialData.therapistId || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ชื่อ</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">อีเมล</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">สิทธิ์</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="staff">พนักงาน</option>
              <option value="admin">ผู้ดูแลระบบ</option>
            </select>
          </div>
          
          {!initialData.id && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">รหัสผ่าน</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ยืนยันรหัสผ่าน</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </>
          )}
          
          <div className="flex space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-colors"
            >
              บันทึก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;
