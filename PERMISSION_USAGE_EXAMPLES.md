# 🚀 การใช้งานระบบ Permission - Examples & Guide

## 📝 การใช้งานพื้นฐาน

### 1. **WrappingApp ด้วย AuthProvider**
```javascript
// /src/app/layout.js
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>
          <div className="flex min-h-screen">
            {/* Navigation จะแสดงตาม role */}
            <RoleBasedNavigation />
            
            <main className="flex-1">
              <ProtectedRoute>
                {children}
              </ProtectedRoute>
            </main>
          </div>
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 2. **Protected Page with Role Requirement**
```javascript
// /src/app/admin/page.js
import ProtectedRoute from '@/components/ProtectedRoute';
import UserManagement from '@/components/UserManagement';

export default function AdminPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <div className="p-8">
        <h1>Admin Dashboard</h1>
        <UserManagement />
      </div>
    </ProtectedRoute>
  );
}
```

### 3. **Protected Component with Permission**
```javascript
// ในคอมโพเนนต์ใดก็ได้
import PermissionGate from '@/components/PermissionGate';

const BookingActions = ({ booking }) => {
  return (
    <div className="flex space-x-2">
      {/* ทุกคนดูได้ */}
      <ViewButton booking={booking} />
      
      {/* เฉพาะ admin และ staff ที่เป็นเจ้าของ booking */}
      <PermissionGate permission="write_own">
        <EditButton booking={booking} />
      </PermissionGate>
      
      {/* เฉพาะ admin */}
      <PermissionGate role="admin">
        <DeleteButton booking={booking} />
      </PermissionGate>
      
      {/* มีหลาย permissions (OR condition) */}
      <PermissionGate permission={['admin', 'manage_bookings']}>
        <AdvancedActionsButton />
      </PermissionGate>
    </div>
  );
};
```

---

## 🎛️ การใช้งาน usePermissions Hook

### **Basic Permission Checking**
```javascript
import { usePermissions } from '@/hooks/usePermissions';

const MyComponent = () => {
  const { 
    user, 
    isAdmin, 
    isStaff, 
    can, 
    canManageAllBookings,
    canViewFinancials,
    canAccessBooking 
  } = usePermissions();

  // ตรวจสอบ role
  if (isAdmin()) {
    return <AdminPanel />;
  }

  // ตรวจสอบ permission
  if (can('manage_users')) {
    return <UserManagementButton />;
  }

  // ตรวจสอบการเข้าถึง booking เฉพาะ
  const canEdit = canAccessBooking(booking);
  
  // ตรวจสอบการดูข้อมูลการเงิน
  const canSeeAllFinancials = canViewFinancials('all');
  const canSeeOwnFinancials = canViewFinancials('own');

  return (
    <div>
      <h1>สวัสดี {user.name}</h1>
      <RoleBadge role={user.role} />
      
      {canEdit && <EditBookingForm />}
      {canSeeAllFinancials && <FullFinancialReport />}
      {canSeeOwnFinancials && <PersonalEarningsReport />}
    </div>
  );
};
```

---

## 🎨 Conditional Rendering Patterns

### **Pattern 1: useConditionalRender Hook**
```javascript
import { useConditionalRender } from '@/components/PermissionGate';

const Dashboard = () => {
  const { renderForRole, renderWithPermission, isAdmin } = useConditionalRender();

  return (
    <div>
      {/* Render based on role */}
      {renderForRole('admin', <AdminDashboard />)}
      {renderForRole('staff', <StaffDashboard />)}
      
      {/* Render based on permission */}
      {renderWithPermission('manage_users', <UserManagementLink />)}
      
      {/* Traditional conditional */}
      {isAdmin() && <SystemSettings />}
    </div>
  );
};
```

### **Pattern 2: Role-based Component Selection**
```javascript
const RoleBasedNavigation = () => {
  const { user } = usePermissions();

  const navItems = {
    admin: [
      { href: '/', label: 'Dashboard', icon: HomeIcon },
      { href: '/users', label: 'User Management', icon: UserIcon },
      { href: '/settings', label: 'Settings', icon: CogIcon }
    ],
    staff: [
      { href: '/', label: 'My Dashboard', icon: HomeIcon },
      { href: '/my-bookings', label: 'My Bookings', icon: CalendarIcon },
      { href: '/my-profile', label: 'Profile', icon: UserIcon }
    ]
  };

  return (
    <nav>
      {navItems[user.role]?.map(item => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
};
```

---

## 🔒 API Security Examples

### **Firestore Security Rules**
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read their own user document
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                      (request.auth.uid == userId || 
                       get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Bookings - role-based access
    match /bookings/{bookingId} {
      allow read: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         resource.data.therapistId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.therapistId);
      
      allow write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         resource.data.therapistId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.therapistId);
    }
    
    // Admin-only collections
    match /settings/{document} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

### **API Route Protection (Next.js)**
```javascript
// /src/app/api/admin/users/route.js
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await getCurrentUser(request);
    
    // Check if user is admin
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' }, 
        { status: 403 }
      );
    }
    
    // Admin-only logic here
    const users = await getAllUsers();
    return NextResponse.json(users);
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}
```

---

## 📊 Data Filtering Examples

### **Role-based Data Filtering**
```javascript
// /src/lib/dataFilters.js
export const filterBookingsByRole = (bookings, user) => {
  if (user.role === 'admin') {
    return bookings; // Admin sees all
  }
  
  if (user.role === 'staff') {
    return bookings.filter(booking => 
      booking.therapistId === user.therapistId
    ); // Staff sees only their bookings
  }
  
  return []; // No access
};

export const filterReportsByRole = (reports, user) => {
  if (user.role === 'admin') {
    return {
      ...reports,
      financial: reports.financial, // Full financial data
      therapists: reports.therapists // All therapists data
    };
  }
  
  if (user.role === 'staff') {
    return {
      personal: reports.therapists?.find(t => t.id === user.therapistId),
      earnings: reports.financial?.therapistEarnings?.[user.therapistId]
    };
  }
  
  return {};
};
```

### **Component with Filtered Data**
```javascript
const BookingsList = () => {
  const { user } = usePermissions();
  const [allBookings, setAllBookings] = useState([]);
  
  // Filter bookings based on user role
  const visibleBookings = useMemo(() => {
    return filterBookingsByRole(allBookings, user);
  }, [allBookings, user]);

  return (
    <div>
      <h2>
        {user.role === 'admin' ? 'การจองทั้งหมด' : 'คิวของฉัน'}
      </h2>
      {visibleBookings.map(booking => (
        <BookingCard key={booking.id} booking={booking} />
      ))}
    </div>
  );
};
```

---

## 🔧 Advanced Use Cases

### **Multi-level Permission Check**
```javascript
const AdvancedPermissionCheck = ({ booking, action }) => {
  const { user, can, canAccessBooking } = usePermissions();
  
  const canPerformAction = () => {
    // Check basic permission
    if (!can(action)) return false;
    
    // Additional business logic
    if (action === 'delete' && booking.status === 'completed') {
      return false; // Can't delete completed bookings
    }
    
    // Check booking access
    if (!canAccessBooking(booking)) return false;
    
    // Time-based restrictions
    const bookingTime = new Date(booking.startTime);
    const now = new Date();
    if (action === 'edit' && bookingTime < now) {
      return false; // Can't edit past bookings
    }
    
    return true;
  };

  return canPerformAction() ? (
    <ActionButton action={action} booking={booking} />
  ) : null;
};
```

### **Dynamic Permission Loading**
```javascript
const DynamicPermissionComponent = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUserPermissions = async () => {
      try {
        // Load dynamic permissions from API
        const userPermissions = await fetchUserPermissions(user.id);
        setPermissions(userPermissions);
      } catch (error) {
        console.error('Failed to load permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadUserPermissions();
    }
  }, [user]);

  if (loading) return <LoadingSpinner />;

  return (
    <div>
      {permissions.includes('advanced_feature') && (
        <AdvancedFeatureComponent />
      )}
    </div>
  );
};
```

---

## 📱 Mobile Responsive Permission UI

### **Mobile-First Navigation**
```javascript
const MobilePermissionNavigation = () => {
  const { isAdmin, isStaff } = usePermissions();
  const [isOpen, setIsOpen] = useState(false);

  const mobileNavItems = isAdmin() 
    ? ['Dashboard', 'Users', 'Reports', 'Settings']
    : ['My Dashboard', 'My Bookings', 'Profile'];

  return (
    <div className="md:hidden">
      <button onClick={() => setIsOpen(!isOpen)}>
        <MenuIcon className="w-6 h-6" />
      </button>
      
      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white shadow-lg">
          {mobileNavItems.map(item => (
            <MobileNavItem key={item} label={item} />
          ))}
        </div>
      )}
    </div>
  );
};
```

**🎯 ทั้งหมดนี้คือตัวอย่างการใช้งานระบบ Permission ที่ครอบคลุม!**

ต้องการให้ฉันแสดงการ implement ส่วนไหนเพิ่มเติมหรือไม่? 🚀
