'use client';

import { useState, useEffect, useRef } from 'react';
import { useToolStore } from '../../store';

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');
  const { setSearchQuery: setStoreSearch, fetchTools } = useToolStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // 防抖搜索
  useEffect(() => {
    const timer = setTimeout(() => {
      setStoreSearch(searchQuery);
      fetchTools();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, setStoreSearch, fetchTools]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setStoreSearch(searchQuery);
    fetchTools();
    // 可以滚动到工具列表
    document.getElementById('tools-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-brand-dark via-brand-dark to-brand-light py-20 sm:py-28">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-success-dark/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* 标题 */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
          专业场景AI工具
          <br />
          <span className="text-green-300">开箱即用</span>
        </h1>

        {/* 副标题 */}
        <p className="text-lg sm:text-xl text-white/80 max-w-2xl mx-auto mb-10">
          深耕细分领域，做深做透每一个工具。从创意写作到电商运营，
          让AI成为你最得力的创作伙伴。
        </p>

        {/* 搜索框 */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto mb-12">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工具名称或功能..."
              className="w-full px-6 py-4 pl-12 rounded-xl text-gray-900 text-lg focus-ring shadow-xl"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>

        {/* 价值卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { icon: '🎯', title: '场景化', desc: '深度优化' },
            { icon: '⚡', title: '高效率', desc: '一键生成' },
            { icon: '💰', title: '按次计费', desc: '透明划算' },
            { icon: '📥', title: '可下载', desc: '成品交付' },
          ].map((item) => (
            <div key={item.title} className="value-card bg-white/10 backdrop-blur-sm border-white/20">
              <div className="text-3xl mb-2">{item.icon}</div>
              <h3 className="font-semibold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-white/70">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
