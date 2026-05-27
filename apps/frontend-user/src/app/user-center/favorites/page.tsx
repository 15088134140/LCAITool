'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { toolApi } from '@/lib/api/modules/tool';
import { getFirstImage, resolveApiUrl } from '@/lib/utils/image';

const formatRelativeTime = (timestamp: number | string | null | undefined): string => {
  if (!timestamp) return '未知';
  const now = Date.now();
  let t = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  // 后端时间戳为秒级，转毫秒
  if (t < 1e12) t *= 1000;
  const diff = now - t;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  return new Date(t).toLocaleDateString('zh-CN');
};

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 12;

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadFavorites();
  }, [isAuthenticated, page]);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const res = await toolApi.getFavorites(page, pageSize);
      setFavorites(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('加载收藏失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfavorite = async (toolId: string) => {
    try {
      await toolApi.toggleFavorite(toolId);
      await loadFavorites();
    } catch (err) {
      console.error('取消收藏失败:', err);
    }
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Navigation */}
      <nav className="bg-white border-b border-[#E4E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/user-center" className="text-[#64748B] hover:text-[#1E3A5F] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-[#1E3A5F]">我的收藏</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-[#1E3A5F] border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500">加载中...</p>
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <p className="text-gray-500 mb-4">还没有收藏任何工具</p>
            <Link href="/tools" className="inline-block px-6 py-3 bg-gradient-to-r from-[#059669] to-[#10B981] text-white font-medium rounded-lg">
              浏览工具
            </Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((fav: any) => {
                const coverImage = resolveApiUrl(getFirstImage(fav.cover_image));
                return (
                  <div key={fav.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden card-hover" style={{ transition: 'all 0.25s ease-out' }}>
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-lg flex-shrink-0 overflow-hidden bg-gradient-to-br from-pink-400 to-rose-500">
                          {coverImage ? (
                            <img src={coverImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-gray-900 truncate">{fav.name || '未知工具'}</h3>
                          <p className="text-xs text-gray-500">收藏于 {formatRelativeTime(fav.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link
                          href={`/tools/${fav.id}`}
                          className="flex-1 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white text-sm font-medium rounded-lg text-center hover:shadow-md transition-all"
                        >
                          立即使用
                        </Link>
                        <button
                          onClick={() => handleUnfavorite(fav.id)}
                          className="px-4 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:border-red-300 hover:text-red-500 transition-all"
                        >
                          取消收藏
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-lg font-medium ${page === p ? 'bg-[#1E3A5F] text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="p-2 border border-gray-200 rounded-lg disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
