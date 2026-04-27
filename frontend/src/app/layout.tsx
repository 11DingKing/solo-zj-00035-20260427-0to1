'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/authStore';
import './globals.css';

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  const isLoginPage = pathname === '/login';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // 检查是否需要重定向
    if (!isLoginPage && !isAuthenticated && !isLoading) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoginPage, isLoading, router, mounted]);

  if (!mounted) {
    return (
      <html lang="zh-CN">
        <body>
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="text-gray-500">加载中...</div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-100">
        {isLoginPage ? (
          <div className="min-h-screen">{children}</div>
        ) : (
          <Layout>{children}</Layout>
        )}
      </body>
    </html>
  );
}
