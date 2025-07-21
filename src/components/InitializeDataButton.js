'use client';

import { useState } from 'react';
import { initializeAllData } from '@/lib/initializeData';
import { toast } from 'react-hot-toast';

export default function InitializeDataButton() {
  const [isInitializing, setIsInitializing] = useState(false);

  const handleInitialize = async () => {
    if (!confirm('ต้องการสร้างข้อมูลเริ่มต้นใน Firebase ใช่หรือไม่?\n\nจะสร้าง:\n- คอร์สนวด 5 คอร์ส\n- หมอนวด 4 คน\n- การตั้งค่าระบบ')) {
      return;
    }

    setIsInitializing(true);
    
    try {
      toast.loading('กำลังสร้างข้อมูลใน Firebase...', { id: 'init' });
      
      await initializeAllData();
      
      toast.success('🎉 สร้างข้อมูลเริ่มต้นสำเร็จ!\nรีเฟรชหน้าเพื่อดูข้อมูลใหม่', { 
        id: 'init',
        duration: 5000 
      });
      
      // Refresh หลังจาก 2 วินาที
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Error initializing data:', error);
      toast.error(`เกิดข้อผิดพลาด: ${error.message}`, { id: 'init' });
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <button
      onClick={handleInitialize}
      disabled={isInitializing}
      className="glass-button px-4 py-2 text-sm font-medium inline-flex items-center disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200"
    >
      {isInitializing ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
          <span className="text-white">กำลังสร้าง...</span>
        </>
      ) : (
        <>
          <span className="mr-2 text-lg">�</span>
          <span className="text-white">สร้างข้อมูล</span>
        </>
      )}
    </button>
  );
}
