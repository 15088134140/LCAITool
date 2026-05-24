'use client';

import { useState, useEffect, useCallback } from 'react';
import { userApi } from '@/lib/api/modules/user';

interface InviteData {
  invite_code: string;
  invite_url: string;
  invited_count: number;
  total_rewards: number;
}

interface InviteRecordItem {
  invited_user: string;
  registered_at: number;
  recharge_status: string;
  reward: number;
}

interface InvitePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvitePanel({ isOpen, onClose }: InvitePanelProps) {
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteList, setInviteList] = useState<InviteRecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [info, list] = await Promise.all([
        userApi.getInviteInfo(),
        userApi.getInviteList(),
      ]);
      setInviteData(info);
      setInviteList(list);
    } catch (err) {
      console.error('Failed to load invite data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (t: number) => {
    if (!t) return '未知';
    const ts = t < 1e12 ? t * 1000 : t;
    return new Date(ts).toLocaleDateString('zh-CN');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">邀请好友</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-[#1E3A5F] border-t-transparent rounded-full mx-auto" />
              <p className="text-gray-500 mt-4">加载中...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Reward Banner */}
              <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-lg font-bold">邀请有奖</p>
                    <p className="text-sm text-blue-200">每邀请一位好友，双方各得 10 积分</p>
                  </div>
                </div>
                <div className="bg-white/10 rounded-lg p-3 mt-2">
                  <p className="text-sm text-blue-100">
                    好友首次充值，您额外获得 <span className="text-yellow-300 font-bold">20 积分</span>
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#1E3A5F]">{inviteData?.invited_count ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">已邀请</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#059669]">{inviteData?.total_rewards ?? 0}</p>
                  <p className="text-xs text-gray-500 mt-1">奖励积分</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-[#D97706]">{inviteList.filter(i => i.recharge_status === 'first_done').length}</p>
                  <p className="text-xs text-gray-500 mt-1">已充值</p>
                </div>
              </div>

              {/* Share Section */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium text-gray-700">邀请链接</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteData?.invite_url ?? ''}
                    className="flex-1 px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 truncate"
                  />
                  <button
                    onClick={() => handleCopy(inviteData?.invite_url ?? '')}
                    className="px-4 py-2.5 bg-[#2563EB] text-white text-sm font-medium rounded-lg hover:bg-[#1d4ed8] transition-colors whitespace-nowrap"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-700">邀请码</p>
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-[#1E3A5F] text-white text-sm font-mono font-bold rounded-lg">
                    {inviteData?.invite_code ?? '------'}
                    <button
                      onClick={() => handleCopy(inviteData?.invite_code ?? '')}
                      className="ml-1 p-0.5 hover:bg-white/20 rounded"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Invite List */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">邀请记录 ({inviteList.length})</h3>
                {inviteList.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p>暂无邀请记录</p>
                    <p className="text-xs mt-1">分享邀请链接，让好友一起来使用吧</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {inviteList.map((record, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {record.invited_user.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{record.invited_user}</p>
                            <p className="text-xs text-gray-500">{formatTime(record.registered_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            record.recharge_status === 'first_done'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {record.recharge_status === 'first_done' ? '已充值' : '未充值'}
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">+{record.reward} 积分</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
