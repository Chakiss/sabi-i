'use client';

import { useState, useEffect } from 'react';
import { getServices } from '@/lib/firestore';

export default function ConnectionStatus() {
  const [status, setStatus] = useState('checking'); // 'checking', 'mock', 'firebase', 'permission-error'

  useEffect(() => {
    const checkConnectionStatus = async () => {
      const useMock = process.env.NEXT_PUBLIC_USE_MOCK === 'true';
      
      if (useMock) {
        setStatus('mock');
        return;
      }

      try {
        // ทดสอบการเชื่อมต่อ Firebase โดยดึงข้อมูล services
        await getServices();
        setStatus('firebase');
      } catch (error) {
        if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
          setStatus('permission-error');
        } else {
          setStatus('mock'); // fallback to mock
        }
      }
    };

    checkConnectionStatus();
  }, []);

  if (status === 'checking') return null;

  if (status === 'checking') {
    return (
      <div className="glass-card p-3 border-l-4 border-blue-400">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-2"></div>
          <span className="text-sm text-blue-700">ตรวจสอบการเชื่อมต่อ...</span>
        </div>
      </div>
    );
  }

  if (status === 'firebase') {
    return (
      <div className="glass-card p-3 border-l-4 border-green-400">
        <div className="flex items-center">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
            <span className="text-white text-xs">✓</span>
          </div>
          <span className="ml-2 text-sm font-medium text-green-700">Firebase เชื่อมต่อแล้ว</span>
        </div>
      </div>
    );
  }

  if (status === 'permission-error') {
    return (
      <div className="glass-card p-4 border-l-4 border-red-400">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center">
              <span className="text-white text-sm">🚫</span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-red-800">
              Firebase Permission Error
            </h3>
            <div className="mt-1 text-xs text-red-700">
              <p>ระบบไม่สามารถเข้าถึง Firestore ได้ (ใช้ Mock Data แทน)</p>
              <p className="mt-1">
                กรุณาตั้งค่า Security Rules ใน Firebase Console ตามไฟล์ 
                <code className="bg-red-200 px-1 rounded ml-1">FIREBASE_SETUP.md</code>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mock mode
  return (
    <div className="glass-card p-4 border-l-4 border-yellow-400">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <span className="text-white text-sm">⚠️</span>
          </div>
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-bold text-yellow-800">
            โหมดทดสอบ (Mock Data)
          </h3>
          <div className="mt-1 text-xs text-yellow-700">
            <p>
              ระบบกำลังใช้ข้อมูลจำลองเพื่อการทดสอบ หากต้องการใช้ Firebase จริง 
              กรุณาตั้งค่า Firestore และเปลี่ยน <code className="bg-yellow-200 px-1 rounded">NEXT_PUBLIC_USE_MOCK=false</code> ใน .env.local
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
