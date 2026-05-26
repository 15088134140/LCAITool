'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { userApi } from '@/lib/api/modules/user';
import { toast } from '@/lib/toast';
import type { ApiKey, ApiKeyCreated } from '@/lib/api/types';

/** 格式化时间戳（秒级或毫秒级） */
const formatTime = (ts: number | null | undefined): string => {
  if (!ts) return '-';
  let t = ts;
  if (t < 1e12) t *= 1000; // 秒级转毫秒
  const d = new Date(t);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return '今天';
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return d.toLocaleDateString('zh-CN');
};

/** 完整的日期时间格式 */
const formatDateTime = (ts: number | null | undefined): string => {
  if (!ts) return '-';
  let t = ts;
  if (t < 1e12) t *= 1000;
  return new Date(t).toLocaleString('zh-CN');
};

export default function ApiKeysPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copied, setCopied] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, string>>({});
  const [revealTimers, setRevealTimers] = useState<Record<string, NodeJS.Timeout>>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  // Zustand hydration
  useEffect(() => {
    Promise.resolve().then(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setLoading(false);
  }, [hydrated, isAuthenticated, router]);

  // 加载 API Key 列表
  const fetchApiKeys = useCallback(async () => {
    try {
      const data = await userApi.getApiKeys();
      setApiKeys(data);
    } catch (err) {
      console.error('Failed to load API keys:', err);
      toast.error('加载 API Key 列表失败');
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys();
    }
  }, [isAuthenticated, fetchApiKeys]);

  // 清理 reveal 定时器
  useEffect(() => {
    return () => {
      Object.values(revealTimers).forEach(timer => clearTimeout(timer));
    };
  }, [revealTimers]);

  // 创建 API Key
  const handleCreate = async () => {
    const name = newKeyName.trim();
    if (!name) {
      toast.error('请输入密钥名称');
      return;
    }
    setCreating(true);
    try {
      const result = await userApi.createApiKey({ name });
      setCreatedKey(result);
      setNewKeyName('');
      // 刷新列表
      await fetchApiKeys();
      toast.success('API Key 创建成功');
    } catch (err) {
      console.error('Failed to create API key:', err);
      toast.error('创建 API Key 失败');
    } finally {
      setCreating(false);
    }
  };

  // 复制密钥到剪贴板
  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = key;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // 关闭创建成功弹窗
  const handleCloseCreated = () => {
    setCreatedKey(null);
    setShowCreateModal(false);
  };

  // 查看密钥明文
  const handleRevealKey = async (id: string) => {
    // 如果已经揭示，直接清除（隐藏）
    if (revealedKeys[id]) {
      setRevealedKeys(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (revealTimers[id]) {
        clearTimeout(revealTimers[id]);
        setRevealTimers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
      return;
    }

    try {
      const result = await userApi.revealApiKey(id);
      setRevealedKeys(prev => ({ ...prev, [id]: result.key }));
      // 30秒后自动隐藏
      const timer = setTimeout(() => {
        setRevealedKeys(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
        setRevealTimers(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }, 30000);
      setRevealTimers(prev => ({ ...prev, [id]: timer }));
      toast.success('密钥已显示，30秒后自动隐藏');
    } catch (err) {
      console.error('Failed to reveal API key:', err);
      toast.error('查看密钥失败');
    }
  };

  // 切换状态
  const handleToggleStatus = async (key: ApiKey) => {
    const newStatus = key.status === 'active' ? 'disabled' : 'active';
    setTogglingIds(prev => new Set(prev).add(key.id));
    try {
      await userApi.updateApiKeyStatus(key.id, { status: newStatus });
      toast.success(newStatus === 'active' ? 'API Key 已启用' : 'API Key 已禁用');
      await fetchApiKeys();
    } catch (err) {
      console.error('Failed to toggle API key status:', err);
      toast.error('更新状态失败');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(key.id);
        return next;
      });
    }
  };

  // 删除 API Key
  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      await userApi.deleteApiKey(id);
      toast.success('API Key 已删除');
      setDeleteConfirmId(null);
      await fetchApiKeys();
    } catch (err) {
      console.error('Failed to delete API key:', err);
      toast.error('删除失败');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-[#1E3A5F] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900">API Key 管理</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 说明卡片 */}
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2563EB] rounded-2xl p-6 text-white mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-lg font-bold mb-1">API 密钥</h2>
              <p className="text-blue-200 text-sm">
                通过 API Key 调用灵创AI工具箱的开放接口，实现自动化集成。
                请妥善保管您的密钥，不要泄露给他人。
              </p>
            </div>
            <button
              onClick={() => {
                setNewKeyName('');
                setCreatedKey(null);
                setShowCreateModal(true);
              }}
              className="flex-shrink-0 px-5 py-2.5 bg-white text-[#1E3A5F] font-semibold rounded-xl shadow-lg hover:shadow-xl hover:bg-blue-50 transition-all"
            >
              + 新增 API Key
            </button>
          </div>
        </div>

        {/* API Key 列表 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* 表头 */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <div className="col-span-3">名称</div>
            <div className="col-span-4">密钥</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-2">最后使用</div>
            <div className="col-span-1 text-right">操作</div>
          </div>

          {apiKeys.length === 0 ? (
            /* 空状态 */
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">暂无 API Key</h3>
              <p className="text-sm text-gray-500 mb-6">创建您的第一个 API Key，开始集成灵创AI的能力</p>
              <button
                onClick={() => {
                  setNewKeyName('');
                  setCreatedKey(null);
                  setShowCreateModal(true);
                }}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-semibold rounded-xl shadow-md shadow-green-500/20 hover:shadow-lg transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                创建 API Key
              </button>
            </div>
          ) : (
            /* 列表行 */
            <div className="divide-y divide-gray-100">
              {apiKeys.map(key => (
                <div key={key.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 px-6 py-5 hover:bg-gray-50 transition-colors">
                  {/* 名称 */}
                  <div className="md:col-span-3">
                    <p className="font-medium text-gray-900 truncate" title={key.name}>{key.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      创建于 {formatDateTime(key.created_at)}
                    </p>
                  </div>

                  {/* 密钥 */}
                  <div className="md:col-span-4">
                    {revealedKeys[key.id] ? (
                      <div className="flex items-center gap-1.5">
                        <code className="flex-1 px-3 py-1.5 bg-gray-100 rounded-lg text-sm font-mono text-gray-800 break-all text-[11px] leading-relaxed">
                          {revealedKeys[key.id]}
                        </code>
                        <button
                          onClick={() => handleCopyKey(revealedKeys[key.id]!)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                          title="复制密钥"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleRevealKey(key.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                          title="隐藏密钥"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <code className="inline-block px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-mono text-gray-500">
                          {key.key_prefix}****
                        </code>
                        <button
                          onClick={() => handleRevealKey(key.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-gray-600"
                          title="查看密钥"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 状态 */}
                  <div className="md:col-span-2">
                    <button
                      onClick={() => handleToggleStatus(key)}
                      disabled={togglingIds.has(key.id)}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        key.status === 'active'
                          ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                          : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {togglingIds.has(key.id) ? (
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <div className={`w-2.5 h-2.5 rounded-full ${key.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                      )}
                      {key.status === 'active' ? '已启用' : '已禁用'}
                    </button>
                  </div>

                  {/* 最后使用 */}
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-500">{formatTime(key.last_used_at)}</p>
                  </div>

                  {/* 操作按钮 */}
                  <div className="md:col-span-1 flex items-center justify-end gap-2">
                    {deleteConfirmId === key.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(key.id)}
                          disabled={deleting}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                        >
                          {deleting ? '删除中...' : '确认删除'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(key.id)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                        title="删除"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 说明文字 */}
        {apiKeys.length > 0 && (
          <p className="text-xs text-gray-400 mt-4 text-center">
            密钥明文只在创建时和手动查看时显示，请妥善保管。查看后 30 秒自动隐藏。
          </p>
        )}
      </main>

      {/* 创建 API Key 弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => !createdKey && setShowCreateModal(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            {createdKey ? (
              /* 创建成功 - 显示密钥 */
              <div className="p-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-center text-gray-900 mb-2">API Key 创建成功</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                  {createdKey.warning}
                </p>

                {/* 密钥显示 */}
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
                  <p className="text-xs font-semibold text-amber-700 mb-2 uppercase tracking-wider">密钥</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-amber-300 rounded-lg text-sm font-mono text-gray-800 break-all select-all">
                      {createdKey.key}
                    </code>
                    <button
                      onClick={() => handleCopyKey(createdKey.key)}
                      className="flex-shrink-0 px-4 py-2 bg-[#1E3A5F] text-white text-sm font-medium rounded-lg hover:bg-[#2563EB] transition-colors"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                  </div>
                </div>

                {/* 密钥信息 */}
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">名称</span>
                    <span className="text-gray-900 font-medium">{createdKey.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">前缀</span>
                    <span className="text-gray-900 font-medium">{createdKey.key_prefix}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">创建时间</span>
                    <span className="text-gray-900 font-medium">{formatDateTime(createdKey.created_at)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">状态</span>
                    <span className="text-green-600 font-medium">已启用</span>
                  </div>
                </div>

                {/* 警告 */}
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-sm text-red-700">
                      关闭此窗口后将无法再次查看完整密钥。请立即复制并妥善保管。
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseCreated}
                  className="w-full py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-semibold rounded-xl shadow-md shadow-green-500/20 hover:shadow-lg transition-all"
                >
                  我已保存，关闭
                </button>
              </div>
            ) : (
              /* 创建表单 */
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">新增 API Key</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="mb-6">
                  <label htmlFor="key-name" className="block text-sm font-medium text-gray-700 mb-2">
                    密钥名称
                  </label>
                  <input
                    id="key-name"
                    type="text"
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="例如：生产环境、开发测试"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] outline-none transition-colors text-sm"
                    autoFocus
                    maxLength={50}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                  />
                  <p className="text-xs text-gray-400 mt-1.5">
                    请使用易于辨识的名称，方便日后管理
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !newKeyName.trim()}
                    className="flex-1 py-3 bg-gradient-to-r from-[#2563EB] to-[#3B82F6] text-white font-medium rounded-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all"
                  >
                    {creating ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        创建中...
                      </span>
                    ) : '创建密钥'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
