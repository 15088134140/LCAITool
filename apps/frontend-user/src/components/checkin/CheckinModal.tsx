'use client';
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api/modules/user';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
  const [status, setStatus] = useState<{ today_checked: boolean; streak: number; can_checkin: boolean } | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (isOpen) loadStatus();
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const data = await userApi.getCheckinStatus();
      setStatus(data);
    } catch (err) {
      console.error('加载签到状态失败:', err);
    }
  };

  const handleCheckin = async () => {
    setChecking(true);
    try {
      const result = await userApi.doCheckin();
      alert(`签到成功！获得 ${result.points_earned} 积分`);
      loadStatus();
    } catch (err: any) {
      alert(err?.message || '签到失败');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">每日签到</h3>
        {status && (
          <>
            <div className="text-5xl mb-4">📅</div>
            <p className="text-[#64748B] mb-2">
              已连续签到 <span className="text-[#2563EB] font-bold text-xl">{status.streak}</span> 天
            </p>
            <p className="text-sm text-[#94A3B8] mb-6">
              {status.today_checked
                ? '今日已签到，明天再来吧'
                : `今日签到可领 ${Math.min(status.streak + 1, 7)} 积分`}
            </p>
            {!status.today_checked && (
              <button
                onClick={handleCheckin}
                disabled={checking}
                className="w-full py-3 rounded-xl text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
              >
                {checking ? '签到中...' : '立即签到'}
              </button>
            )}
          </>
        )}
        <button onClick={onClose} className="mt-4 text-sm text-[#94A3B8] hover:text-[#64748B]">
          关闭
        </button>
      </div>
    </div>
  );
}
