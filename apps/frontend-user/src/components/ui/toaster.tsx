'use client';

import { useToastStore } from '@/lib/toast';
import { useEffect, useState } from 'react';

const iconMap = {
  success: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

const bgMap = {
  success: 'bg-gradient-to-r from-[#059669] to-[#10B981]',
  error: 'bg-gradient-to-r from-[#DC2626] to-[#EF4444]',
  warning: 'bg-gradient-to-r from-[#D97706] to-[#F59E0B]',
  info: 'bg-gradient-to-r from-[#2563EB] to-[#3B82F6]',
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-relevant="additions removals"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto toast-enter flex items-start gap-3 ${bgMap[t.type]} text-white rounded-xl px-5 py-4 shadow-xl max-w-sm w-full`}
          role="alert"
        >
          <div className="flex-shrink-0 mt-0.5">{iconMap[t.type]}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{t.message}</p>
          </div>
          {t.action && (
            <button
              onClick={() => {
                t.action?.onClick();
                removeToast(t.id);
              }}
              className="flex-shrink-0 text-xs font-semibold text-white/90 hover:text-white underline underline-offset-2 transition-colors whitespace-nowrap"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => removeToast(t.id)}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all"
            aria-label="关闭"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
