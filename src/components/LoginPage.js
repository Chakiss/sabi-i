// 🔐 Login Component
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ! 🎉');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('เข้าสู่ระบบไม่สำเร็จ กรุณาตรวจสอบอีเมลและรหัสผ่าน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="glass p-8 shadow-2xl">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent mb-2">
              Sabai Massage
            </h1>
            <p className="text-gray-600">ระบบจัดการร้านนวดแผนไทย</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                อีเมล
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                placeholder="your@email.com"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                รหัสผ่าน
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="รหัสผ่านของคุณ"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-5 h-5" />
                  ) : (
                    <EyeIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-600 hover:to-purple-700 focus:ring-4 focus:ring-purple-200 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </div>
              ) : (
                'เข้าสู่ระบบ'
              )}
            </button>
          </form>

          {/* Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">บัญชีทดสอบ:</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-purple-50 p-3 rounded-lg">
                <p className="font-semibold text-purple-800">👑 Admin</p>
                <p className="text-purple-600">admin@sabai.com</p>
                <p className="text-purple-600">admin123</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="font-semibold text-blue-800">👤 Staff</p>
                <p className="text-blue-600">staff@sabai.com</p>
                <p className="text-blue-600">staff123</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>© 2025 Sabai Massage Management System</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
