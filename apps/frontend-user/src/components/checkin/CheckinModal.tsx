'use client';
import { useState, useEffect } from 'react';
import { userApi } from '@/lib/api/modules/user';
import { toast } from '@/lib/toast';

interface CheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CheckinResult {
  streak: number;
  points_earned: number;
  total_points: number;
}

export default function CheckinModal({ isOpen, onClose }: CheckinModalProps) {
  const [status, setStatus] = useState<{ today_checked: boolean; streak: number; can_checkin: boolean } | null>(null);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setResult(null);
      setShowSuccess(false);
      loadStatus();
    }
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
      const res = await userApi.doCheckin();
      setResult(res);
      setShowSuccess(true);
      toast.success(`签到成功！获得 ${res.points_earned} 积分`);
      // 3秒后自动切回状态视图
      setTimeout(() => {
        setShowSuccess(false);
        loadStatus();
      }, 3000);
    } catch (err: any) {
      toast.error(err?.message || '签到失败');
    } finally {
      setChecking(false);
    }
  };

  if (!isOpen) return null;

  // ---------- 签到成功动画 ----------
  if (showSuccess && result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center overflow-hidden">
          {/* 背景光晕 */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-60" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-100 rounded-full blur-3xl opacity-60" />

          {/* 成功动画 */}
          <div className="relative mb-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center animate-bounce shadow-lg shadow-green-300/40">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {/* 粒子装饰 */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none">
              <div className="absolute top-0 left-1/4 w-2 h-2 bg-green-300 rounded-full animate-ping" style={{ animationDelay: '0.1s' }} />
              <div className="absolute top-2 right-1/4 w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
              <div className="absolute bottom-0 left-1/3 w-2 h-2 bg-green-200 rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
              <div className="absolute bottom-2 right-1/3 w-1.5 h-1.5 bg-emerald-300 rounded-full animate-ping" style={{ animationDelay: '0.7s' }} />
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-1">签到成功！</h3>
          <p className="text-gray-500 text-sm mb-6">已连续签到 {result.streak} 天</p>

          {/* 积分获得卡片 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 mb-4 border border-green-100">
            <p className="text-sm text-gray-500 mb-1">获得积分</p>
            <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600">
              +{result.points_earned}
            </p>
          </div>

          {/* 当前总积分 */}
          <p className="text-sm text-gray-400">
            当前总积分 <span className="text-gray-600 font-semibold">{result.total_points}</span>
          </p>
        </div>
      </div>
    );
  }

  // ---------- 签到主界面 ----------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        {/* Header */}
        <h3 className="text-2xl font-bold text-[#1E3A5F] mb-1">每日签到</h3>
        <p className="text-sm text-gray-400 mb-6">坚持签到，积分不断</p>

        {status && (
          <>
            {/* 日历图标 / 签到天数环 */}
            <div className="relative mb-6">
              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-100 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-bold text-[#1E3A5F]">{status.streak}</div>
                  <div className="text-xs text-gray-400 mt-0.5">天</div>
                </div>
              </div>
              {/* 进度环装饰 */}
              <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="44" fill="none" stroke="#E4E7EB" strokeWidth="3" />
                <circle
                  cx="48" cy="48" r="44" fill="none" stroke="url(#streakGrad)" strokeWidth="3"
                  strokeDasharray={`${(status.streak / 7) * 276} 276`}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
                <defs>
                  <linearGradient id="streakGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#059669" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* 状态文案 */}
            {status.today_checked ? (
              <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-100">
                <div className="flex items-center justify-center gap-2 text-green-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">今日已签到</span>
                </div>
                <p className="text-xs text-green-500 mt-1">明天再来领取第 {status.streak + 1} 天奖励</p>
              </div>
            ) : (
              <>
                <p className="text-gray-500 mb-2">
                  今日签到可领
                </p>
                <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-emerald-600 mb-6">
                  +{Math.min(status.streak + 1, 7)} 积分
                </p>

                {/* 连续签到进度条 */}
                <div className="mb-6">
                  <div className="flex justify-between text-xs text-gray-400 mb-2">
                    <span>连续签到进度</span>
                    <span>{status.streak}/7 天</span>
                  </div>
                  <div className="flex gap-1.5 justify-center">
                    {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                      <div
                        key={day}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                          day <= status.streak
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-sm shadow-green-300/30'
                            : day === status.streak + 1
                            ? 'bg-green-50 border-2 border-green-300 text-green-600'
                            : 'bg-gray-100 text-gray-300'
                        }`}
                      >
                        {day <= status.streak ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          day
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleCheckin}
                  disabled={checking}
                  className="w-full py-3.5 rounded-xl text-white font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-300/30 hover:shadow-green-300/50"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)' }}
                >
                  {checking ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      签到中...
                    </span>
                  ) : (
                    '立即签到'
                  )}
                </button>
              </>
            )}
          </>
        )}

        <button onClick={onClose} className="mt-4 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          关闭
        </button>
      </div>
    </div>
  );
}
