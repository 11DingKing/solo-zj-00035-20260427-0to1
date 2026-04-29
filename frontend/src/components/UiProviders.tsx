'use client';

import { useUiStore } from '@/store/uiStore';
import { useEffect } from 'react';

// 全局 Loading 组件
export function GlobalLoading() {
  const { isGlobalLoading } = useUiStore();

  if (!isGlobalLoading) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 flex flex-col items-center shadow-2xl">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-700 font-medium">加载中...</p>
      </div>
    </div>
  );
}

// Toast 组件
function Toast({ toast, onClose }: { toast: { id: string; type: string; message: string }; onClose: () => void }) {
  const typeStyles: Record<string, { bg: string; icon: string; border: string }> = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: '✅',
      border: 'border-l-4 border-l-green-500',
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: '❌',
      border: 'border-l-4 border-l-red-500',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: '⚠️',
      border: 'border-l-4 border-l-yellow-500',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'ℹ️',
      border: 'border-l-4 border-l-blue-500',
    },
  };

  const style = typeStyles[toast.type] || typeStyles.info;

  return (
    <div
      className={`${style.bg} ${style.border} border rounded-lg shadow-lg p-4 flex items-center justify-between min-w-[320px] max-w-md animate-pulse`}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3">{style.icon}</span>
        <p className="text-gray-800 font-medium">{toast.message}</p>
      </div>
      <button
        onClick={onClose}
        className="ml-4 text-gray-400 hover:text-gray-600 transition-colors"
      >
        ✕
      </button>
    </div>
  );
}

// Toast 容器
export function ToastContainer() {
  const { toasts, hideToast } = useUiStore();

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
      ))}
    </div>
  );
}
