'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { ideaApi } from '@/lib/api/modules/idea';
import type { CreateIdeaRequest } from '@/lib/api/types';

const categories = ['内容创作', '设计工具', '视频音频', '办公效率', '其他'];

export default function SubmitIdeaPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<CreateIdeaRequest>({
    title: '',
    description: '',
    category: '内容创作',
    tags: [],
    contact_info: '',
    cover_image: '',
  });

  const [tagInput, setTagInput] = useState('');
  const [errors, setErrors] = useState<any>({});

  const validateForm = (): boolean => {
    const newErrors: any = {};

    if (!formData.title.trim()) {
      newErrors['title'] = '请输入工具名称';
    } else if (formData.title.length < 3) {
      newErrors['title'] = '工具名称至少3个字符';
    }

    if (!formData.description?.trim()) {
      newErrors['description'] = '请输入工具描述';
    } else if (formData.description.length < 20) {
      newErrors['description'] = '工具描述至少20个字符';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !formData.tags?.includes(tag) && formData.tags!.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tag],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: (prev.tags || []).filter(tag => tag !== tagToRemove),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await ideaApi.submitIdea(formData);
      setShowSuccess(true);

      // 3秒后跳转到构思列表页
      setTimeout(() => {
        router.push('/ideas');
      }, 3000);
    } catch (error: any) {
      console.error('提交失败:', error);
      const msg = error?.response?.data?.detail || error?.message || '提交失败，请稍后重试';
      setErrors({ submit: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="py-20 min-h-[60vh]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1E3A5F] mb-4">请先登录</h1>
          <p className="text-[#64748B] mb-8">登录后才能提交您的创意想法</p>
          <div className="flex gap-4 justify-center">
            <Link href="/login" className="btn-primary px-8 py-3 text-white rounded-xl font-semibold">
              立即登录
            </Link>
            <Link href="/ideas" className="px-8 py-3 border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-xl font-semibold hover:bg-[#1E3A5F] hover:text-white transition-colors">
              返回构思列表
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (showSuccess) {
    return (
      <section className="py-20 min-h-[60vh]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#059669] to-[#10B981] flex items-center justify-center animate-bounce">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[#1E3A5F] mb-4">提交成功！</h1>
          <p className="text-[#64748B] mb-4">感谢您的创意，我们会尽快审核</p>
          <p className="text-[#059669] font-semibold mb-8">一旦被采纳，您将获得 200 积分奖励！</p>
          <p className="text-[#94A3B8] text-sm">即将跳转到构思列表页...</p>
        </div>
      </section>
    );
  }

  return (
    <>
      {/* Page Header */}
      <section className="py-12 section-bg-blobs bg-gradient-to-br from-[#1E3A5F] to-[#2563EB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Link href="/ideas" className="inline-flex items-center gap-2 text-blue-200 hover:text-white mb-6 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            返回构思列表
          </Link>
          <h1 className="text-4xl font-bold text-white mb-4">提交您的创意</h1>
          <p className="text-xl text-blue-100">有想法？告诉我们，一起打造更棒的AI工具箱！</p>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 工具名称 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                工具名称 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="例如：AIXX生成器"
                className={`input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring ${
                  errors.title ? 'border-red-500' : ''
                }`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-2">{errors.title}</p>
              )}
            </div>

            {/* 分类选择 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                工具分类
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: cat }))}
                    className={`px-4 py-3 rounded-xl text-sm font-medium transition-all focus-ring ${
                      formData.category === cat
                        ? 'bg-[#1E3A5F] text-white shadow-md'
                        : 'bg-white text-[#64748B] border border-[#E4E7EB] hover:border-[#2563EB]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* 详细描述 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                详细描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                placeholder="详细描述这个工具的功能和用途，它能帮助用户解决什么问题？希望有哪些特色功能？..."
                className={`input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring resize-none ${
                  errors.description ? 'border-red-500' : ''
                }`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-2">{errors.description}</p>
              )}
              <p className="text-[#94A3B8] text-sm mt-2">
                已输入 {formData.description?.length || 0} / 至少20个字符
              </p>
            </div>

            {/* 标签 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                相关标签
                <span className="text-[#94A3B8] font-normal ml-2">（最多5个，按Enter添加）</span>
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {formData.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="w-4 h-4 rounded-full hover:bg-[#1E3A5F]/20 flex items-center justify-center"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入标签后按Enter添加"
                disabled={formData.tags!.length >= 5}
                className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
              />
            </div>

            {/* 参考图片 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                参考图片
                <span className="text-[#94A3B8] font-normal ml-2">（选填）</span>
              </label>
              <div className="border-2 border-dashed border-[#E4E7EB] rounded-xl p-8 text-center hover:border-[#2563EB] transition-colors">
                <svg className="w-12 h-12 mx-auto mb-3 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-[#64748B] mb-2">点击或拖拽上传图片</p>
                <p className="text-[#94A3B8] text-sm">支持 JPG、PNG 格式，最多 5MB</p>
                <input type="file" className="hidden" accept="image/*" />
              </div>
            </div>

            {/* 联系方式 */}
            <div>
              <label className="block text-sm font-semibold text-[#1E3A5F] mb-2">
                联系方式
                <span className="text-[#94A3B8] font-normal ml-2">（选填，用于通知采纳结果）</span>
              </label>
              <input
                type="text"
                value={formData.contact_info || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, contact_info: e.target.value }))}
                placeholder="手机号或邮箱"
                className="input-field w-full px-4 py-3 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] focus-ring"
              />
            </div>

            {errors.submit && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl">
                {errors.submit}
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex gap-4 pt-4">
              <Link
                href="/ideas"
                className="flex-1 py-4 border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-xl font-semibold hover:bg-[#1E3A5F] hover:text-white transition-colors text-center"
              >
                取消
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 btn-primary py-4 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    提交中...
                  </span>
                ) : (
                  '提交创意'
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
