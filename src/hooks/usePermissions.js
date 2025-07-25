// 🔒 Permissions Hook
import { useAuth } from '@/contexts/AuthContext';

export const usePermissions = () => {
  const { user } = useAuth();

  // Define permissions by role
  const ROLE_PERMISSIONS = {
    admin: [
      'read', 'write', 'delete', 'admin',
      'manage_users', 'manage_settings', 'view_all_reports',
      'manage_therapists', 'manage_services', 'manage_pricing'
    ],
    staff: [
      'read', 'write_own',
      'view_own_bookings', 'update_own_status', 'view_own_reports'
    ]
  };

  // Check if user can perform an action
  const can = (permission, resource = null) => {
    if (!user) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check if user has specific permission
    const userPermissions = ROLE_PERMISSIONS[user.role] || [];
    return userPermissions.includes(permission);
  };

  // Role checking helpers
  const isAdmin = () => user?.role === 'admin';
  const isStaff = () => user?.role === 'staff';
  
  // Resource-specific permissions
  const canManageAllBookings = () => can('admin') || can('manage_bookings');
  const canViewAllReports = () => can('view_all_reports');
  const canManageUsers = () => can('manage_users');
  const canManageSettings = () => can('manage_settings');
  const canManageTherapists = () => can('manage_therapists');
  const canManageServices = () => can('manage_services');

  // Check if user can access a specific booking
  const canAccessBooking = (booking) => {
    if (isAdmin()) return true;
    if (isStaff() && booking.therapistId === user.therapistId) return true;
    return false;
  };

  // Check if user can view financial data
  const canViewFinancials = (scope = 'all') => {
    if (scope === 'all') return isAdmin();
    if (scope === 'own') return isAdmin() || isStaff();
    return false;
  };

  return {
    user,
    can,
    isAdmin,
    isStaff,
    canManageAllBookings,
    canViewAllReports,
    canManageUsers,
    canManageSettings,
    canManageTherapists,
    canManageServices,
    canAccessBooking,
    canViewFinancials
  };
};
