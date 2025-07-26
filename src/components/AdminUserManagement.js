'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  UserGroupIcon, 
  ShieldCheckIcon, 
  EyeIcon, 
  PencilIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminUserManagement = () => {
  const { 
    user, 
    role, 
    permissions, 
    getAllUsers, 
    updateUserRole, 
    deleteUser,
    loading 
  } = useAuth();

  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Load users on component mount
  useEffect(() => {
    if (permissions.canManageUsers) {
      loadUsers();
    }
  }, [permissions.canManageUsers]);

  // Filter users when search term or role filter changes
  useEffect(() => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phoneNumber?.includes(searchTerm)
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    setFilteredUsers(filtered);
  }, [users, searchTerm, roleFilter]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const result = await getAllUsers();
      if (result.success) {
        setUsers(result.users);
      } else {
        toast.error('ไม่สามารถโหลดข้อมูลผู้ใช้ได้');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleEditUser = (userToEdit) => {
    setSelectedUser(userToEdit);
    setShowEditModal(true);
  };

  const handleDeleteUser = (userToDelete) => {
    setSelectedUser(userToDelete);
    setShowDeleteModal(true);
  };

  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return;

    const result = await updateUserRole(selectedUser.uid, newRole);
    if (result.success) {
      toast.success(`อัปเดตสิทธิ์ของ ${selectedUser.displayName} เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ชม'} สำเร็จ`);
      setShowEditModal(false);
      loadUsers(); // Refresh the list
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    const result = await deleteUser(selectedUser.uid);
    if (result.success) {
      toast.success(`ลบผู้ใช้ ${selectedUser.displayName} สำเร็จ`);
      setShowDeleteModal(false);
      loadUsers(); // Refresh the list
    }
  };

  const getRoleColor = (userRole) => {
    switch (userRole) {
      case 'admin':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'viewer':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRoleIcon = (userRole) => {
    switch (userRole) {
      case 'admin':
        return ShieldCheckIcon;
      case 'viewer':
        return EyeIcon;
      default:
        return UserGroupIcon;
    }
  };

  const formatJoinDate = (timestamp) => {
    if (!timestamp) return 'ไม่ทราบ';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Check if current user has permission to manage users
  if (!permissions.canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-red-200">
          <ExclamationTriangleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h2>
          <p className="text-gray-600">คุณไม่มีสิทธิ์ในการจัดการผู้ใช้งานระบบ</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-lg border border-blue-200/50 p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <UserGroupIcon className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  จัดการผู้ใช้งาน
                </h1>
                <p className="text-gray-600 font-medium">
                  จัดการสิทธิ์และข้อมูลผู้ใช้ในระบบ
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">ผู้ใช้ทั้งหมด</p>
              <p className="text-2xl font-bold text-blue-600">{users.length}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
            
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="ค้นหาผู้ใช้... (ชื่อ, อีเมล, เบอร์โทร)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
              />
            </div>

            {/* Role Filter */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="h-5 w-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="all">ทุกสิทธิ์</option>
                <option value="admin">ผู้ดูแลระบบ</option>
                <option value="viewer">ผู้ชม</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={loadUsers}
              disabled={loadingUsers}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all duration-200 disabled:opacity-50 flex items-center space-x-2"
            >
              <span>รีเฟรช</span>
            </button>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden">
          {loadingUsers ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UserGroupIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">ไม่พบผู้ใช้งาน</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ผู้ใช้</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">ติดต่อ</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">สิทธิ์</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">เข้าร่วม</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((userItem) => {
                    const RoleIcon = getRoleIcon(userItem.role);
                    const isCurrentUser = userItem.uid === user?.uid;
                    
                    return (
                      <tr key={userItem.uid} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {userItem.displayName?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {userItem.displayName || 'ไม่ระบุชื่อ'}
                                {isCurrentUser && (
                                  <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">คุณ</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-500">ID: {userItem.uid.substring(0, 8)}...</p>
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {userItem.email && (
                              <p className="text-sm text-gray-900">{userItem.email}</p>
                            )}
                            {userItem.phoneNumber && (
                              <p className="text-sm text-gray-600">{userItem.phoneNumber}</p>
                            )}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className={`inline-flex items-center space-x-2 px-3 py-2 rounded-full border text-sm font-semibold ${getRoleColor(userItem.role)}`}>
                            <RoleIcon className="h-4 w-4" />
                            <span>{userItem.role === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ชม'}</span>
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-600">
                            {formatJoinDate(userItem.createdAt)}
                          </p>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEditUser(userItem)}
                              disabled={isCurrentUser}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="แก้ไขสิทธิ์"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteUser(userItem)}
                              disabled={isCurrentUser || userItem.role === 'admin'}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="ลบผู้ใช้"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Edit User Modal */}
        {showEditModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900">แก้ไขสิทธิ์ผู้ใช้</h3>
                <p className="text-gray-600 mt-1">เปลี่ยนสิทธิ์การใช้งานของ {selectedUser.displayName}</p>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <button
                    onClick={() => handleUpdateRole('viewer')}
                    disabled={loading}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${selectedUser.role === 'viewer' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <EyeIcon className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-semibold text-gray-900">ผู้ชม (Viewer)</p>
                        <p className="text-sm text-gray-600">สามารถดูข้อมูลได้ทั้งหมด แต่ไม่สามารถแก้ไขได้</p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleUpdateRole('admin')}
                    disabled={loading}
                    className={`
                      w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
                      ${selectedUser.role === 'admin' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-red-300'
                      }
                    `}
                  >
                    <div className="flex items-center space-x-3">
                      <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                      <div>
                        <p className="font-semibold text-gray-900">ผู้ดูแลระบบ (Admin)</p>
                        <p className="text-sm text-gray-600">สิทธิ์เต็มรูปแบบ สามารถแก้ไขและจัดการทุกอย่างได้</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete User Modal */}
        {showDeleteModal && selectedUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-red-200">
              <div className="p-6 border-b border-red-200 bg-red-50">
                <h3 className="text-xl font-bold text-red-900">ยืนยันการลบผู้ใช้</h3>
                <p className="text-red-700 mt-1">การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
              </div>
              
              <div className="p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <ExclamationTriangleIcon className="h-12 w-12 text-red-500" />
                  <div>
                    <p className="font-semibold text-gray-900">
                      คุณแน่ใจหรือไม่ที่จะลบผู้ใช้ <span className="text-red-600">{selectedUser.displayName}</span>?
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      ข้อมูลทั้งหมดของผู้ใช้นี้จะถูกลบอย่างถาวร
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'กำลังลบ...' : 'ลบผู้ใช้'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUserManagement;
