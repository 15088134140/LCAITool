'use client';

import { useState } from 'react';
import Link from 'next/link';

// 工具数据类型
interface Tool {
  id: string;
  name: string;
  description: string;
  image: string;
  rating: number;
  userCount: number;
  price: number;
  tags: string[];
  isHot?: boolean;
  isNew?: boolean;
  isBenchmark?: boolean;
}

// 工具数据
const toolsData: Tool[] = [
  {
    id: '1',
    name: 'AI 有声绘本生成专家',
    description: '输入故事主题或文字，自动生成精美插图、专业配音、完整排版的有声绘本',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600&h=300&fit=crop',
    rating: 4.9,
    userCount: 12580,
    price: 8,
    tags: ['热门', '标杆工具'],
    isHot: true,
    isBenchmark: true,
  },
  {
    id: '2',
    name: 'AI 电商商品详情页生成器',
    description: '输入商品信息，一键生成高清主图、详情分段图片、营销文案、PSD源文件',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=300&fit=crop',
    rating: 4.8,
    userCount: 8320,
    price: 12,
    tags: ['新品'],
    isNew: true,
  },
  {
    id: '3',
    name: 'AI 营销文案生成器',
    description: '针对不同平台（小红书、朋友圈、公众号、抖音）生成高质量营销文案',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=300&fit=crop',
    rating: 4.7,
    userCount: 15680,
    price: 5,
    tags: [],
  },
  {
    id: '4',
    name: 'AI 头像生成器',
    description: '上传自拍，生成多种风格的专业头像，支持商务、卡通、手绘、油画等风格',
    image: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&h=300&fit=crop',
    rating: 4.8,
    userCount: 25430,
    price: 6,
    tags: [],
  },
  {
    id: '5',
    name: 'AI 思维导图生成器',
    description: '输入主题，自动生成结构化思维导图，支持多种布局样式和导出格式',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=600&h=300&fit=crop',
    rating: 4.6,
    userCount: 9870,
    price: 4,
    tags: [],
  },
  {
    id: '6',
    name: 'AI 课程课件生成器',
    description: '根据课程大纲，自动生成完整PPT课件，包含布局、配图、动画效果',
    image: 'https://images.unsplash.com/photo-1589903308904-131be4e0f3b6?w=600&h=300&fit=crop',
    rating: 4.7,
    userCount: 6540,
    price: 10,
    tags: ['教育'],
  },
];

// 分类数据
const categories = [
  { id: 'all', name: '全部分类' },
  { id: 'content', name: '📚 内容创作' },
  { id: 'design', name: '🎨 设计工具' },
  { id: 'education', name: '🏫 教育教学' },
  { id: 'ecommerce', name: '🛒 电商营销' },
  { id: 'office', name: '💼 办公效率' },
  { id: 'video', name: '🎬 视频制作' },
  { id: 'audio', name: '🔊 音频处理' },
];

// 排序选项
const sortOptions = [
  { id: 'popular', name: '热门推荐' },
  { id: 'newest', name: '最新上线' },
  { id: 'rating', name: '评分最高' },
];

export default function ToolsPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('popular');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤和排序工具
  const filteredTools = toolsData.filter((tool) => {
    // 搜索过滤
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = tool.name.toLowerCase().includes(query);
      const matchesDescription = tool.description.toLowerCase().includes(query);
      if (!matchesName && !matchesDescription) {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      {/* Header Section */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] py-12 section-bg-blobs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">AI 工具集合</h1>
            <p className="text-blue-200 text-lg">专业场景深度优化，开箱即用，成果可交付</p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <input
                type="text"
                placeholder="搜索工具名称、功能、场景..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] text-lg focus-ring border border-transparent focus:border-[#2563EB] focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)] transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Tools Section */}
      <section className="py-10 section-bg-blobs bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Filter */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-btn px-5 py-2.5 rounded-xl text-sm font-medium focus-ring transition-all border border-[#E4E7EB] ${
                    selectedCategory === category.id
                      ? 'bg-[#2563EB] border-[#2563EB] text-white'
                      : 'bg-white hover:border-[#2563EB] hover:bg-[#F0F7FF]'
                  }`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-[#64748B]">
              共找到 <span className="font-semibold text-[#1E3A5F]">{filteredTools.length}</span> 个工具
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                {sortOptions.map((option) => (
                  <button
                    key={option.id}
                    className={`sort-btn px-3 py-1.5 rounded-lg transition-colors focus-ring ${
                      selectedSort === option.id
                        ? 'text-[#2563EB] font-semibold'
                        : 'text-[#64748B] hover:text-[#2563EB]'
                    }`}
                    onClick={() => setSelectedSort(option.id)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tools Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map((tool) => {
              // 工具ID到命名路由的映射
              const getToolUrl = (id: string) => {
                switch (id) {
                  case '1':
                    return '/tools/storybook-generator';
                  case '2':
                    return '/tools/ecommerce-detail';
                  case '3':
                    return '/tools/marketing-copywriter';
                  default:
                    return `/tools/${id}`;
                }
              };
              return (
                <Link key={tool.id} href={getToolUrl(tool.id)} className="tool-card bg-white rounded-2xl overflow-hidden group">
                  <div className="relative">
                    <img
                      src={tool.image}
                      alt={tool.name}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-4 left-4 flex gap-2">
                      {tool.isHot && (
                        <span className="tag-hot px-2.5 py-1 rounded-full text-xs font-bold">热门</span>
                      )}
                      {tool.isNew && (
                        <span className="tag-new px-2.5 py-1 rounded-full text-xs font-bold">新品</span>
                      )}
                      {tool.isBenchmark && (
                        <span className="bg-white/90 text-[#1E3A5F] px-2.5 py-1 rounded-full text-xs font-bold">标杆工具</span>
                      )}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-[#1E3A5F] mb-2">{tool.name}</h3>
                    <p className="text-[#64748B] text-sm mb-4 line-clamp-2">{tool.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-[#F59E0B]" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                        </svg>
                        <span className="text-sm font-medium text-[#1E3A5F]">{tool.rating}</span>
                        <span className="text-xs text-[#94A3B8] ml-1">{tool.userCount.toLocaleString()}人使用</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[#059669] font-bold">
                        {tool.price} <span className="text-sm font-normal text-[#64748B]">积分起/次</span>
                      </div>
                      <span className="px-4 py-2 bg-[#F0F7FF] text-[#2563EB] rounded-lg text-sm font-medium group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                        立即使用
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="mt-12 flex justify-center">
            <nav className="flex items-center gap-2">
              <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                </svg>
              </button>
              <button className="w-10 h-10 rounded-lg bg-[#2563EB] text-white font-medium focus-ring">1</button>
              <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">2</button>
              <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">3</button>
              <span className="text-[#94A3B8]">...</span>
              <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">8</button>
              <button className="w-10 h-10 rounded-lg border border-[#E4E7EB] flex items-center justify-center text-[#64748B] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors focus-ring">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </nav>
          </div>
        </div>
      </section>
    </>
  );
}
