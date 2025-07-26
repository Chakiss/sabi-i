// 🔐 Enhanced Authentication Context with Role-Based Access Control
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import toast from 'react-hot-toast';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState('viewer'); // Default role: viewer
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cached role from localStorage
  const getCachedRole = (uid) => {
    try {
      const cached = localStorage.getItem(`userRole_${uid}`);
      return cached || 'viewer';
    } catch (error) {
      return 'viewer';
    }
  };

  // Cache role to localStorage
  const setCachedRole = (uid, role) => {
    try {
      localStorage.setItem(`userRole_${uid}`, role);
    } catch (error) {
      console.error('Error caching role:', error);
    }
  };

  // Setup reCAPTCHA for phone authentication
  const setupRecaptcha = (phoneNumber) => {
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: (response) => {
            console.log('reCAPTCHA verified');
          },
          'expired-callback': () => {
            console.log('reCAPTCHA expired');
          }
        });
      }
      return window.recaptchaVerifier;
    } catch (error) {
      console.error('reCAPTCHA setup error:', error);
      toast.error('โทรศัพท์ Login ยังไม่พร้อมใช้งาน กรุณาใช้ Email หรือ Google');
      throw error;
    }
  };  // Get user role from Firestore
  const getUserRole = async (uid) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return userDoc.data().role || 'viewer';
      }
      return 'viewer';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'viewer';
    }
  };

  // Create or update user profile in Firestore
  const createUserProfile = async (user, additionalData = {}) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create new user profile with default viewer role
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || additionalData.displayName || '',
          phoneNumber: user.phoneNumber || additionalData.phoneNumber || '',
          role: 'viewer', // Default role
          createdAt: new Date(),
          lastLoginAt: new Date(),
          isActive: true,
          ...additionalData
        });
        setCachedRole(user.uid, 'viewer'); // Cache new user role
        return 'viewer';
      } else {
        // Update last login time
        await updateDoc(userRef, {
          lastLoginAt: new Date()
        });
        const role = userDoc.data().role || 'viewer';
        setCachedRole(user.uid, role); // Cache existing user role
        return role;
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
      return 'viewer';
    }
  };

  // Email/Password Login
  const loginWithEmail = async (email, password) => {
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email, password);
      const role = await createUserProfile(result.user);
      setUserRole(role);
      setCachedRole(result.user.uid, role); // Cache role after login
      toast.success('เข้าสู่ระบบสำเร็จ! 🎉');
      return { success: true, user: result.user, role };
    } catch (error) {
      console.error('Email login error:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'ไม่พบบัญชีผู้ใช้นี้';
          break;
        case 'auth/wrong-password':
          errorMessage = 'รหัสผ่านไม่ถูกต้อง';
          break;
        case 'auth/invalid-email':
          errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'ลองเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่';
          break;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Email/Password Registration
  const registerWithEmail = async (email, password, displayName) => {
    try {
      setLoading(true);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const role = await createUserProfile(result.user, { displayName });
      setUserRole(role);
      setCachedRole(result.user.uid, role); // Cache role after registration
      toast.success('สร้างบัญชีสำเร็จ! 🎉');
      return { success: true, user: result.user, role };
    } catch (error) {
      console.error('Email registration error:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการสร้างบัญชี';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'อีเมลนี้ถูกใช้งานแล้ว';
          break;
        case 'auth/weak-password':
          errorMessage = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
          break;
        case 'auth/invalid-email':
          errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
          break;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Google Login
  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const role = await createUserProfile(result.user);
      setUserRole(role);
      setCachedRole(result.user.uid, role); // Cache role after Google login
      toast.success('เข้าสู่ระบบด้วย Google สำเร็จ! 🎉');
      return { success: true, user: result.user, role };
    } catch (error) {
      console.error('Google login error:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google';
      
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'การเข้าสู่ระบบถูกยกเลิก';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Google Login ยังไม่ได้เปิดใช้งานใน Firebase Console กรุณาตั้งค่าใน Authentication > Sign-in method';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Popup ถูกบล็อค กรุณาอนุญาต popup สำหรับเว็บไซต์นี้';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'มี popup อื่นเปิดอยู่ กรุณาลองใหม่';
          break;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Phone Number Login
  const loginWithPhone = async (phoneNumber) => {
    try {
      setLoading(true);
      const appVerifier = setupRecaptcha();
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      
      toast.success('ส่งรหัส OTP แล้ว กรุณาตรวจสอบข้อความ');
      return { 
        success: true, 
        confirmationResult,
        message: 'ส่งรหัส OTP แล้ว กรุณาตรวจสอบข้อความ' 
      };
    } catch (error) {
      console.error('Phone login error:', error);
      let errorMessage = 'เกิดข้อผิดพลาดในการส่งรหัส OTP';
      
      switch (error.code) {
        case 'auth/invalid-phone-number':
          errorMessage = 'เบอร์โทรศัพท์ไม่ถูกต้อง';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'ส่งรหัสมากเกินไป กรุณารอสักครู่';
          break;
        case 'auth/configuration-not-found':
          errorMessage = 'Phone Authentication ยังไม่ได้ตั้งค่า กรุณาใช้ Email หรือ Google Login';
          break;
        case 'auth/app-not-authorized':
          errorMessage = 'แอปไม่ได้รับอนุญาตให้ใช้ Phone Authentication';
          break;
        case 'auth/billing-not-enabled':
          errorMessage = 'Phone Authentication ต้องใช้ Firebase Blaze Plan กรุณาใช้ Email หรือ Google Login แทน';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Phone Authentication ยังไม่ได้เปิดใช้งาน กรุณาใช้ Email หรือ Google Login';
          break;
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP for phone login
  const verifyOTP = async (confirmationResult, otp) => {
    try {
      setLoading(true);
      const result = await confirmationResult.confirm(otp);
      const role = await createUserProfile(result.user);
      setUserRole(role);
      toast.success('เข้าสู่ระบบด้วยเบอร์โทรสำเร็จ! 🎉');
      return { success: true, user: result.user, role };
    } catch (error) {
      console.error('OTP verification error:', error);
      let errorMessage = 'รหัส OTP ไม่ถูกต้อง';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'รหัส OTP ไม่ถูกต้อง';
      }
      
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Legacy login method (for backward compatibility)
  const login = async (email, password) => {
    return await loginWithEmail(email, password);
  };

  // Logout
  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setUserRole('viewer'); // Reset to viewer role after logout
      setIsAuthenticated(false);
      toast.success('ออกจากระบบแล้ว');
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('เกิดข้อผิดพลาดในการออกจากระบบ');
      return { success: false, error: error.message };
    }
  }, []);

  // Get user display name
  const getUserDisplayName = useCallback(() => {
    return user?.displayName || user?.email?.split('@')[0] || 'ผู้ใช้';
  }, [user]);

  // Update user role (Admin only)
  const updateUserRole = async (targetUserId, newRole) => {
    try {
      if (userRole !== 'admin') {
        toast.error('คุณไม่มีสิทธิ์ในการเปลี่ยนบทบาทผู้ใช้');
        return { success: false, error: 'Unauthorized' };
      }

      const userRef = doc(db, 'users', targetUserId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date()
      });

      toast.success(`เปลี่ยนบทบาทผู้ใช้เป็น ${newRole === 'admin' ? 'ผู้ดูแลระบบ' : 'ผู้ชม'} แล้ว`);
      return { success: true };
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('เกิดข้อผิดพลาดในการเปลี่ยนบทบาทผู้ใช้');
      return { success: false, error: error.message };
    }
  };

  // Get all users (Admin only)
  const getAllUsers = async () => {
    try {
      if (userRole !== 'admin') {
        return { success: false, error: 'Unauthorized' };
      }

      const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const usersSnapshot = await getDocs(usersQuery);
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, users };
    } catch (error) {
      console.error('Error getting users:', error);
      return { success: false, error: error.message };
    }
  };

  // Delete user (Admin only)
  const deleteUser = async (userId) => {
    if (userRole !== 'admin') {
      toast.error('คุณไม่มีสิทธิ์ในการจัดการผู้ใช้');
      return { success: false };
    }

    if (userId === user?.uid) {
      toast.error('คุณไม่สามารถลบบัญชีของตัวเองได้');
      return { success: false };
    }

    try {
      setLoading(true);
      // Delete user document from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);

      toast.success('ลบผู้ใช้สำเร็จ');
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('ไม่สามารถลบผู้ใช้ได้');
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  // Check if user has specific permission
  const hasPermission = (requiredRole) => {
    if (requiredRole === 'viewer') {
      return true; // Everyone can view (including non-authenticated users)
    }
    if (requiredRole === 'admin') {
      return userRole === 'admin';
    }
    return false;
  };

  // Check if user is admin
  const isAdmin = () => {
    return userRole === 'admin';
  };

  // Check if user is viewer
  const isViewer = () => {
    return userRole === 'viewer';
  };

  // Auth state listener with caching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user);
        setIsAuthenticated(true);
        
        // ใช้ cached role ก่อน แล้วค่อยโหลดจาก Firestore ในพื้นหลัง
        const cachedRole = getCachedRole(user.uid);
        setUserRole(cachedRole);
        
        // โหลด role จริงจาก Firestore แล้ว update cache
        if (!isInitialized) {
          try {
            const actualRole = await getUserRole(user.uid);
            if (actualRole !== cachedRole) {
              setUserRole(actualRole);
              setCachedRole(user.uid, actualRole);
            }
          } catch (error) {
            console.error('Error fetching user role:', error);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
        setUserRole('viewer');
        // Clear cached role on logout
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('userRole_')) {
              localStorage.removeItem(key);
            }
          });
        } catch (error) {
          console.error('Error clearing cached roles:', error);
        }
      }
      setLoading(false);
      setIsInitialized(true);
    });

    return unsubscribe;
  }, [isInitialized]);

  const value = {
    // User state
    user,
    role: userRole,
    permissions: {
      canEdit: userRole === 'admin',
      canViewReports: true, // Everyone can view reports
      canManageUsers: userRole === 'admin'
    },
    userRole, // Keep for backward compatibility
    loading,
    isAuthenticated,
    
    // Authentication methods
    login, // Legacy method
    loginWithEmail,
    registerWithEmail,
    loginWithGoogle,
    loginWithPhone,
    verifyOTP,
    logout,
    
    // User management (Admin only)
    updateUserRole,
    getAllUsers,
    deleteUser,
    
    // Permission checking
    hasPermission,
    isAdmin,
    isViewer,
    
    // Utility
    createUserProfile,
    getUserDisplayName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* reCAPTCHA container for phone auth */}
      <div id="recaptcha-container"></div>
    </AuthContext.Provider>
  );
};
