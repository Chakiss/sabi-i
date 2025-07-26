'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  EnvelopeIcon, 
  LockClosedIcon, 
  UserIcon,
  EyeIcon,
  EyeSlashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const LoginPage = ({ onClose }) => {
  const { 
    loginWithEmail, 
    registerWithEmail, 
    loginWithGoogle, 
    loading 
  } = useAuth();

  const [mode, setMode] = useState('login'); // 'login', 'register'
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('กรุณากรอกอีเมลและรหัสผ่าน');
      return;
    }

    const result = await loginWithEmail(formData.email, formData.password);
    if (result.success) {
      onClose();
    }
  };

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.displayName) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      return;
    }

    const result = await registerWithEmail(formData.email, formData.password, formData.displayName);
    if (result.success) {
      onClose();
    }
  };

  const handleGoogleLogin = async () => {
    const result = await loginWithGoogle();
    if (result.success) {
      onClose();
    }
  };


  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      displayName: ''
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-black/40 via-purple-900/20 to-blue-900/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full border border-white/30 transform transition-all duration-300 relative overflow-hidden">
        
        {/* Animated Background Elements */}
        <div className="absolute top-4 right-4 w-20 h-20 bg-gradient-to-br from-blue-300/20 to-purple-300/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-16 h-16 bg-gradient-to-br from-pink-300/20 to-yellow-300/20 rounded-full blur-lg animate-pulse delay-1000"></div>

        {/* Header */}
        <div className="relative z-10 p-8 border-b border-white/20 bg-gradient-to-r from-white/90 to-blue-50/80 backdrop-blur-sm rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                <SparklesIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {mode === 'login' && 'เข้าสู่ระบบ'}
                  {mode === 'register' && 'สร้างบัญชี'}
                </h2>
                <p className="text-sm text-gray-600 font-medium">
                  {mode === 'login' && 'ยินดีต้อนรับกลับมา!'}
                  {mode === 'register' && 'สร้างบัญชีใหม่'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-100/80 hover:text-red-600 rounded-xl transition-all duration-200 text-gray-500"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="relative z-10 p-8">
          
          {/* Login Form */}
          {mode === 'login' && (
            <div className="space-y-6">
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <EnvelopeIcon className="h-4 w-4 inline mr-1 text-blue-500" />
                    อีเมล
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-4 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <LockClosedIcon className="h-4 w-4 inline mr-1 text-blue-500" />
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full p-4 pr-12 border border-blue-200/50 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center my-6">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="px-4 text-sm text-gray-500 font-medium">หรือ</span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  <span>เข้าสู่ระบบด้วย Google</span>
                </button>
              </div>

              {/* Switch to Register */}
              <div className="text-center mt-6">
                <p className="text-gray-600">
                  ยังไม่มีบัญชี?{' '}
                  <button
                    onClick={() => switchMode('register')}
                    className="text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                  >
                    สร้างบัญชีใหม่
                  </button>
                </p>
              </div>
            </div>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <div className="space-y-6">
              <form onSubmit={handleEmailRegister} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <UserIcon className="h-4 w-4 inline mr-1 text-purple-500" />
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    className="w-full p-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                    placeholder="ชื่อ นามสกุล"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <EnvelopeIcon className="h-4 w-4 inline mr-1 text-purple-500" />
                    อีเมล
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full p-4 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <LockClosedIcon className="h-4 w-4 inline mr-1 text-purple-500" />
                    รหัสผ่าน
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="w-full p-4 pr-12 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    <LockClosedIcon className="h-4 w-4 inline mr-1 text-purple-500" />
                    ยืนยันรหัสผ่าน
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full p-4 pr-12 border border-purple-200/50 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/90 backdrop-blur-sm shadow-sm transition-all duration-200"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชี'}
                </button>
              </form>

              {/* Switch to Login */}
              <div className="text-center mt-6">
                <p className="text-gray-600">
                  มีบัญชีแล้ว?{' '}
                  <button
                    onClick={() => switchMode('login')}
                    className="text-purple-600 hover:text-purple-700 font-semibold hover:underline"
                  >
                    เข้าสู่ระบบ
                  </button>
                </p>
              </div>
            </div>
          )}


          {/* Viewer Mode Info */}
          <div className="mt-8 p-4 bg-gradient-to-r from-blue-50/80 to-purple-50/60 rounded-xl border border-blue-200/50">
            <div className="flex items-center text-xs text-gray-600">
              <div className="w-3 h-3 mr-2">ℹ️</div>
              <p>
                <span className="font-semibold">หมายเหตุ:</span> ผู้ใช้ใหม่จะได้รับสิทธิ์ <strong>Viewer</strong> (ผู้ชม) 
                โดยอัตโนมัติ ซึ่งสามารถดูข้อมูลได้ทั้งหมด แต่ไม่สามารถแก้ไขได้
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
