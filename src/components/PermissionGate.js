// 🛡️ Permission Gate Component
import { usePermissions } from '@/hooks/usePermissions';

const PermissionGate = ({ 
  permission = null,
  role = null,
  requireAll = false,
  children,
  fallback = null,
  showAccessDenied = false
}) => {
  const { can, user } = usePermissions();

  // Check role-based access
  if (role && user?.role !== role) {
    return showAccessDenied ? <AccessDenied /> : fallback;
  }

  // Check permission-based access
  if (permission) {
    const permissions = Array.isArray(permission) ? permission : [permission];
    
    const hasAccess = requireAll 
      ? permissions.every(perm => can(perm))
      : permissions.some(perm => can(perm));
    
    if (!hasAccess) {
      return showAccessDenied ? <AccessDenied /> : fallback;
    }
  }

  return children;
};

// Access Denied Component
const AccessDenied = () => (
  <div className="flex items-center justify-center p-8 glass">
    <div className="text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h3>
      <p className="text-gray-600">คุณไม่มีสิทธิ์ในการเข้าถึงส่วนนี้</p>
    </div>
  </div>
);

// Role Badge Component
export const RoleBadge = ({ role, className = '' }) => {
  const badgeStyles = {
    admin: 'bg-purple-100 text-purple-800 border-purple-200',
    staff: 'bg-blue-100 text-blue-800 border-blue-200'
  };

  const roleNames = {
    admin: 'ผู้ดูแลระบบ',
    staff: 'พนักงาน'
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${badgeStyles[role] || 'bg-gray-100 text-gray-800'} ${className}`}>
      {roleNames[role] || role}
    </span>
  );
};

// Conditional Rendering Hook
export const useConditionalRender = () => {
  const permissions = usePermissions();

  const renderIf = (condition, component, fallback = null) => {
    return condition ? component : fallback;
  };

  const renderForRole = (role, component, fallback = null) => {
    return permissions.user?.role === role ? component : fallback;
  };

  const renderWithPermission = (permission, component, fallback = null) => {
    return permissions.can(permission) ? component : fallback;
  };

  return {
    renderIf,
    renderForRole,
    renderWithPermission,
    ...permissions
  };
};

export default PermissionGate;
