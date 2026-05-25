'use client';
import { useState } from 'react';
// SVG icons (replacing lucide-react to avoid dependency)
const StarIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const XIcon = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
import ratingApi from '@/lib/api/modules/rating';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  toolId: string;
  taskId: string;
  toolName?: string;
  onSubmitSuccess?: () => void;
}

export default function RatingModal({
  isOpen,
  onClose,
  toolId,
  taskId,
  toolName,
  onSubmitSuccess,
}: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await ratingApi.createRating(toolId, {
        task_id: taskId,
        rating,
        ...(content ? { content } : {}),
        ...(images.length > 0 ? { images: JSON.stringify(images) } : {}),
      });
      setSubmitted(true);
      onSubmitSuccess?.();
      // 自动关闭
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      alert(err?.message || '提交评价失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setContent('');
    setImages([]);
    setSubmitted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-8 text-center">
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <XIcon size={18} className="text-gray-400" />
        </button>

        {submitted ? (
          <>
            <div className="text-5xl mb-4">&#10003;</div>
            <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">感谢您的评价！</h3>
            <p className="text-sm text-[#94A3B8]">您的反馈将帮助我们持续改进</p>
          </>
        ) : (
          <>
            <h3 className="text-2xl font-bold text-[#1E3A5F] mb-2">评价体验</h3>
            {toolName && (
              <p className="text-sm text-[#64748B] mb-4">{toolName}</p>
            )}

            {/* 星级评分 */}
            <div className="flex justify-center gap-1 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <StarIcon
                    size={32}
                    className={
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-200'
                    }
                  />
                </button>
              ))}
            </div>

            {/* 评价内容 */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="分享您的使用感受..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent outline-none resize-none text-sm"
            />
            <p className="text-right text-xs text-gray-400 mt-1">{content.length}/500</p>

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={rating === 0 || submitting}
              className="w-full mt-6 py-3 rounded-xl text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  rating > 0
                    ? 'linear-gradient(135deg, #059669 0%, #10B981 100%)'
                    : '#D1D5DB',
              }}
            >
              {submitting ? '提交中...' : '提交评价'}
            </button>

            <button
              onClick={handleClose}
              className="mt-3 text-sm text-[#94A3B8] hover:text-[#64748B]"
            >
              稍后再说
            </button>
          </>
        )}
      </div>
    </div>
  );
}
