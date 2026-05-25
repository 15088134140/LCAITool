/**
 * 轻量级 Toast 通知系统
 * 基于 Zustand 状态管理，无外部依赖
 */
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastState {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

let toastCounter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    // Auto-dismiss after 4s
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));

export const toast = {
  success: (message: string) => {
    useToastStore.getState().addToast({ type: 'success', message });
  },
  error: (message: string, action?: { label: string; onClick: () => void }) => {
    useToastStore.getState().addToast({ type: 'error', message, ...(action ? { action } : {}) });
  },
  warning: (message: string, action?: { label: string; onClick: () => void }) => {
    useToastStore.getState().addToast({ type: 'warning', message, ...(action ? { action } : {}) });
  },
  info: (message: string) => {
    useToastStore.getState().addToast({ type: 'info', message });
  },
};
