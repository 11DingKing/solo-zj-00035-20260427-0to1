'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(username, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: UserRole): string => {
    const roleMap: Record<UserRole, string> = {
      [UserRole.ADMIN]: '系统管理员',
      [UserRole.WAREHOUSE_MANAGER]: '仓库管理员',
      [UserRole.PURCHASER]: '采购员',
      [UserRole.FINANCE]: '财务',
    };
    return roleMap[role];
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">仓库进销存管理系统</h1>
          <p className="text-gray-600">请登录以继续</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              用户名
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="请输入密码"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center mb-4">测试账号（密码：123456）：</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="font-medium">admin</p>
              <p>{getRoleLabel(UserRole.ADMIN)}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="font-medium">warehouse</p>
              <p>{getRoleLabel(UserRole.WAREHOUSE_MANAGER)}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="font-medium">purchaser</p>
              <p>{getRoleLabel(UserRole.PURCHASER)}</p>
            </div>
            <div className="text-center p-2 bg-gray-50 rounded">
              <p className="font-medium">finance</p>
              <p>{getRoleLabel(UserRole.FINANCE)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
