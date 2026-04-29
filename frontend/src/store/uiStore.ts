import { create } from 'zustand';
import { ReactNode } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface UiState {
  isGlobalLoading: boolean;
  toasts: Toast[];
  
  showGlobalLoading: () => void;
  hideGlobalLoading: () => void;
  
  showToast: (type: ToastType, message: string, duration?: number) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
  
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useUiStore = create<UiState>((set, get) => ({
  isGlobalLoading: false,
  toasts: [],

  showGlobalLoading: () => set({ isGlobalLoading: true }),
  hideGlobalLoading: () => set({ isGlobalLoading: false }),

  showToast: (type: ToastType, message: string, duration: number = 3000) => {
    const id = generateId();
    const newToast: Toast = { id, type, message, duration };
    
    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));
    
    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }
  },

  hideToast: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    }));
  },

  hideAllToasts: () => set({ toasts: [] }),

  showSuccess: (message: string, duration?: number) => {
    get().showToast('success', message, duration);
  },
  
  showError: (message: string, duration?: number) => {
    get().showToast('error', message, duration);
  },
  
  showWarning: (message: string, duration?: number) => {
    get().showToast('warning', message, duration);
  },
  
  showInfo: (message: string, duration?: number) => {
    get().showToast('info', message, duration);
  },
}));

// API 调用包装器
export const withLoading = async <T,>(
  fn: () => Promise<T>,
  onError?: (error: any) => void
): Promise<T | null> => {
  const { showGlobalLoading, hideGlobalLoading, showError } = useUiStore.getState();
  
  try {
    showGlobalLoading();
    const result = await fn();
    return result;
  } catch (error: any) {
    console.error('API Error:', error);
    const errorMessage = error.response?.data?.error || error.message || '操作失败';
    showError(errorMessage);
    if (onError) onError(error);
    return null;
  } finally {
    hideGlobalLoading();
  }
};
