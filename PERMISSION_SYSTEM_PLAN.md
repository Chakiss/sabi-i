# 🔐 Permission System Plan - Sabai Massage Management

## 📋 User Roles Overview

### 👑 **Admin Role**
- **Full System Access**: สามารถเข้าถึงทุกฟีเจอร์
- **User Management**: จัดการพนักงาน, สิทธิ์การเข้าถึง
- **System Configuration**: ตั้งค่าระบบ, commission rates, ราคาบริการ
- **Financial Reports**: ดูรายงานทางการเงินทั้งหมด

### 👤 **Staff/Employee Role**  
- **Limited Access**: เข้าถึงเฉพาะฟีเจอร์ที่จำเป็นสำหรับงาน
- **Basic Operations**: จัดการคิว, อัปเดตสถานะ
- **Personal Data**: ดูข้อมูลส่วนตัวและสถิติของตนเองเท่านั้น

---

## 🎯 Permission Matrix

| **Feature** | **Admin** | **Staff** | **Description** |
|-------------|-----------|-----------|-----------------|
| **🏠 Dashboard** | ✅ Full | ✅ Limited | Admin: ทุกสถิติ / Staff: สถิติส่วนตัว |
| **📅 Booking Management** | ✅ All | ✅ Own Only | Admin: ทุกคิว / Staff: คิวของตนเอง |
| **👥 Therapist Management** | ✅ CRUD | ❌ View Only | Admin: เพิ่ม/ลบ/แก้ไข / Staff: ดูอย่างเดียว |
| **💰 Services & Pricing** | ✅ CRUD | ❌ View Only | Admin: ตั้งราคา / Staff: ดูราคา |
| **📊 Financial Reports** | ✅ All | ✅ Personal | Admin: รายงานทั้งหมด / Staff: รายได้ส่วนตัว |
| **⚙️ System Settings** | ✅ Full | ❌ None | เฉพาะ Admin เท่านั้น |
| **👨‍💼 User Management** | ✅ Full | ❌ None | เฉพาะ Admin เท่านั้น |

---

## 🛠️ Technical Implementation Plan

### 1. **Authentication System**
```javascript
// User Schema
{
  id: "user_123",
  email: "admin@sabai.com",
  name: "Admin User",
  role: "admin", // "admin" | "staff"
  permissions: ["read", "write", "delete", "admin"],
  therapistId: "therapist_456", // เฉพาะ staff role
  createdAt: "2025-01-20",
  isActive: true
}
```

### 2. **Permission Hook**
```javascript
// /src/hooks/usePermissions.js
export const usePermissions = () => {
  const { user } = useAuth();
  
  const can = (action, resource) => {
    if (user.role === 'admin') return true;
    return user.permissions.includes(action);
  };
  
  const isAdmin = () => user.role === 'admin';
  const isStaff = () => user.role === 'staff';
  
  return { can, isAdmin, isStaff, user };
};
```

### 3. **Protected Components**
```javascript
// /src/components/PermissionGate.js
const PermissionGate = ({ permission, role, children, fallback }) => {
  const { can, user } = usePermissions();
  
  if (role && user.role !== role) {
    return fallback || <AccessDenied />;
  }
  
  if (permission && !can(permission)) {
    return fallback || <AccessDenied />;
  }
  
  return children;
};
```

---

## 📱 UI/UX Adaptations

### **Admin Dashboard**
```javascript
// Full access dashboard
- 📊 Complete statistics
- 💰 Total revenue & commission breakdown  
- 👥 All therapists status
- 📅 All bookings management
- ⚙️ System settings access
- 📈 Advanced reports
```

### **Staff Dashboard**  
```javascript
// Limited access dashboard
- 📊 Personal statistics only
- 💰 Personal earnings & tips
- 👤 Own schedule & availability
- 📅 Own bookings only
- ❌ No system settings
- 📈 Personal performance reports
```

---

## 🔒 Security Implementation

### 1. **Route Protection**
```javascript
// /src/middleware/authMiddleware.js
export const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    const { user } = req;
    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
};
```

### 2. **API Security**
```javascript
// Protected API endpoints
/api/admin/*     - Admin only
/api/staff/*     - Staff + Admin
/api/bookings/*  - Role-based filtering
/api/reports/*   - Role-based data filtering
```

### 3. **Data Filtering**
```javascript
// Automatic data filtering based on role
const getBookings = async (userId) => {
  const user = await getUser(userId);
  
  if (user.role === 'admin') {
    return getAllBookings(); // All bookings
  } else {
    return getBookingsByTherapist(user.therapistId); // Own bookings only
  }
};
```

---

## 🎨 UI Components by Role

### **Navigation Menu**
```javascript
// Admin Navigation
- 🏠 Dashboard (Full)
- 📅 All Bookings
- 👥 Therapist Management
- 💰 Services & Pricing  
- 📊 Reports (All)
- ⚙️ Settings
- 👨‍💼 User Management

// Staff Navigation  
- 🏠 My Dashboard
- 📅 My Bookings
- 👤 My Profile
- 📊 My Reports
- 💰 My Earnings
```

### **Action Buttons**
```javascript
// Conditional rendering based on permissions
<PermissionGate permission="delete">
  <DeleteButton />
</PermissionGate>

<PermissionGate role="admin">
  <AdminOnlyFeature />
</PermissionGate>
```

---

## 🚀 Implementation Phases

### **Phase 1: Authentication Foundation**
1. ✅ Create User schema in Firestore
2. ✅ Build login/logout system
3. ✅ Create useAuth hook
4. ✅ Protected routes setup

### **Phase 2: Permission System**
1. ✅ Create usePermissions hook
2. ✅ Build PermissionGate component
3. ✅ Implement role-based navigation
4. ✅ Add access control to existing features

### **Phase 3: UI Adaptations**
1. ✅ Admin vs Staff dashboard layouts
2. ✅ Role-specific components
3. ✅ Data filtering implementation
4. ✅ Permission-based action buttons

### **Phase 4: Advanced Features**
1. ✅ User management interface (Admin only)
2. ✅ Activity logging & audit trails
3. ✅ Advanced reporting with role filters
4. ✅ Multi-level permissions (if needed)

---

## 💡 Best Practices

### **Security**
- ✅ Always validate permissions on server-side
- ✅ Use secure session management
- ✅ Implement proper logout functionality
- ✅ Regular permission audits

### **UX**
- ✅ Clear role indicators in UI
- ✅ Graceful access denied messages
- ✅ Role-appropriate information display
- ✅ Consistent navigation patterns

### **Performance**
- ✅ Cache user permissions
- ✅ Minimize permission checks
- ✅ Optimize data queries by role
- ✅ Lazy load role-specific components

---

## 📝 Example Usage

```javascript
// In any component
const MyComponent = () => {
  const { can, isAdmin, user } = usePermissions();
  
  return (
    <div>
      {isAdmin() && <AdminPanel />}
      
      <PermissionGate permission="write">
        <EditButton />
      </PermissionGate>
      
      {can('delete', 'booking') && <DeleteButton />}
      
      <BookingList 
        showAll={isAdmin()} 
        therapistId={user.therapistId} 
      />
    </div>
  );
};
```

**ต้องการให้เริ่มพัฒนาระบบนี้หรือไม่?** 🚀
