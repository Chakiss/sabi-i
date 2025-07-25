# 🔧 Integration Guide - ติดตั้งระบบ Permission

## 📋 Checklist การติดตั้ง

### ✅ **Step 1: ติดตั้ง Dependencies**
```bash
npm install react-hot-toast
# หรือ
yarn add react-hot-toast
```

### ✅ **Step 2: อัพเดท Firebase Config**
```javascript
// /src/lib/firebase.js - เพิ่ม Auth import
import { getAuth } from 'firebase/auth';

// เพิ่มบรรทัดนี้
export const auth = getAuth(app);
```

### ✅ **Step 3: สร้าง Firestore Collections**

#### **Users Collection Structure:**
```javascript
// /firestore/users/{userId}
{
  uid: "user123",
  email: "admin@sabaimassage.com",
  name: "ผู้จัดการสาขา",
  role: "admin", // หรือ "staff"
  therapistId: "therapist123", // สำหรับ staff เท่านั้น
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp,
  preferences: {
    language: "th",
    notifications: true
  }
}
```

#### **Sample Users Data:**
```javascript
// ข้อมูลตัวอย่างสำหรับทดสอบ
const sampleUsers = [
  {
    uid: "admin123",
    email: "admin@sabaimassage.com", 
    password: "admin123", // ใช้เฉพาะเพื่อการทดสอบ
    name: "ผู้จัดการระบบ",
    role: "admin",
    isActive: true
  },
  {
    uid: "staff123",
    email: "therapist1@sabaimassage.com",
    password: "staff123", // ใช้เฉพาะเพื่อการทดสอบ
    name: "นักบำบัด หมายเลข 1",
    role: "staff",
    therapistId: "therapist_001",
    isActive: true
  }
];
```

### ✅ **Step 4: อัพเดท Layout.js**
```javascript
// /src/app/layout.js
'use client';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import RoleBasedNavigation from '@/components/RoleBasedNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <div className="flex min-h-screen">
            {/* Navigation ที่ปรับเปลี่ยนตาม Role */}
            <RoleBasedNavigation />
            
            {/* Main Content Area */}
            <main className="flex-1 overflow-auto">
              <ProtectedRoute>
                <div className="p-6">
                  {children}
                </div>
              </ProtectedRoute>
            </main>
          </div>
          
          {/* Toast Notifications */}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
```

### ✅ **Step 5: อัพเดท Homepage**
```javascript
// /src/app/page.js
'use client';
import RoleBasedDashboard from '@/components/RoleBasedDashboard';
import { usePermissions } from '@/hooks/usePermissions';
import LoadingSpinner from '@/components/LoadingComponents';

export default function HomePage() {
  const { user, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900">
          ยินดีต้อนรับ, {user?.name}
        </h1>
        <p className="text-gray-600 mt-2">
          ระบบจัดการ Sabai Massage Thai
        </p>
      </div>

      {/* Role-based Dashboard */}
      <RoleBasedDashboard />
    </div>
  );
}
```

---

## 🚀 **Step 6: สร้างหน้า Login เป็น Default**

### **แก้ไข Layout.js ให้รองรับ Login:**
```javascript
// /src/app/layout.js - Version ที่รองรับ Login
'use client';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import AppWrapper from '@/components/AppWrapper'; // สร้างใหม่
import './globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <AppWrapper>
            {children}
          </AppWrapper>
          
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
```

### **สร้าง AppWrapper Component:**
```javascript
// /src/components/AppWrapper.js
'use client';
import { useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import RoleBasedNavigation from '@/components/RoleBasedNavigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import LoadingSpinner from '@/components/LoadingComponents';

export default function AppWrapper({ children }) {
  const { user, loading } = useAuth();

  // กำลังโหลด
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // ยังไม่ได้ login
  if (!user) {
    return <LoginPage />;
  }

  // Login แล้ว - แสดง Main App
  return (
    <div className="flex min-h-screen">
      <RoleBasedNavigation />
      <main className="flex-1 overflow-auto">
        <ProtectedRoute>
          <div className="p-6">
            {children}
          </div>
        </ProtectedRoute>
      </main>
    </div>
  );
}
```

---

## 🔒 **Step 7: ตั้งค่า Firestore Security Rules**

```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - role-based access
    match /users/{userId} {
      allow read: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      allow write: if request.auth != null && 
        (request.auth.uid == userId || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
    }
    
    // Bookings - role-based access
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin' ||
         resource.data.therapistId == get(/databases/$(database)/documents/users/$(request.auth.uid)).data.therapistId);
    }
    
    // Services - read for all authenticated users, write for admin only
    match /services/{serviceId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Reports - admin only
    match /reports/{reportId} {
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

---

## 📱 **Step 8: อัพเดทหน้าต่างๆ ให้รองรับ Permission**

### **Booking Page:**
```javascript
// /src/app/booking/page.js
'use client';
import PermissionGate from '@/components/PermissionGate';
import { usePermissions } from '@/hooks/usePermissions';

export default function BookingPage() {
  const { isAdmin, isStaff } = usePermissions();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">จัดการการจอง</h1>
      
      {/* Admin เห็นการจองทั้งหมด */}
      <PermissionGate role="admin">
        <AllBookingsView />
      </PermissionGate>
      
      {/* Staff เห็นเฉพาะการจองของตัวเอง */}
      <PermissionGate role="staff">
        <MyBookingsView />
      </PermissionGate>
      
      {/* ฟังก์ชันสร้างการจองใหม่ */}
      <PermissionGate permission="create_booking">
        <CreateBookingButton />
      </PermissionGate>
    </div>
  );
}
```

### **Dashboard Page:**
```javascript
// /src/app/dashboard/page.js
'use client';
import RoleBasedDashboard from '@/components/RoleBasedDashboard';

export default function DashboardPage() {
  return <RoleBasedDashboard />;
}
```

### **Admin-only Pages:**
```javascript
// /src/app/admin/page.js
'use client';
import ProtectedRoute from '@/components/ProtectedRoute';
import UserManagement from '@/components/UserManagement';

export default function AdminPage() {
  return (
    <ProtectedRoute requireRole="admin">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <UserManagement />
      </div>
    </ProtectedRoute>
  );
}
```

---

## 🧪 **Step 9: Testing & Debug**

### **การทดสอบระบบ:**
```javascript
// เพิ่มใน console เพื่อทดสอบ
// เปิด Console (F12) และรันคำสั่งนี้:

// ทดสอบ Authentication
console.log('Current User:', firebase.auth().currentUser);

// ทดสอบ Permissions
const testPermissions = () => {
  const { user, can, isAdmin, isStaff } = usePermissions();
  console.log('User:', user);
  console.log('Is Admin:', isAdmin());
  console.log('Is Staff:', isStaff());
  console.log('Can manage users:', can('manage_users'));
};
```

### **Debug Common Issues:**
```javascript
// แก้ปัญหาที่เจอบ่อย:

// 1. User ไม่ load
// ตรวจสอบใน AuthContext.js:
useEffect(() => {
  console.log('Auth state changed:', user); // เพิ่มบรรทัดนี้
}, [user]);

// 2. Permission ไม่ทำงาน
// ตรวจสอบใน usePermissions.js:
const can = useCallback((permission) => {
  console.log('Checking permission:', permission, 'for user:', user); // เพิ่มบรรทัดนี้
  // ...rest of code
}, [user]);

// 3. Navigation ไม่แสดง
// ตรวจสอบใน RoleBasedNavigation.js:
console.log('User role:', user?.role); // เพิ่มบรรทัดนี้
```

---

## 🚀 **Step 10: Deployment Checklist**

### **ก่อน Deploy:**
- [ ] ทดสอบ Login/Logout
- [ ] ทดสอบ Role-based Navigation
- [ ] ทดสอบ Permission Gates
- [ ] ตั้งค่า Firebase Security Rules
- [ ] ตั้งค่า Environment Variables
- [ ] ทดสอบ Mobile Responsive

### **Environment Variables:**
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
# ... other Firebase config
```

### **Deploy Commands:**
```bash
# Build & Test
npm run build
npm run start

# Deploy to Vercel
vercel --prod

# Deploy to Firebase
firebase deploy
```

---

**🎉 เสร็จสิ้น! ระบบ Permission พร้อมใช้งาน**

ต้องการให้ฉันช่วยติดตั้งขั้นตอนไหนเพิ่มเติมไหม? 🚀
