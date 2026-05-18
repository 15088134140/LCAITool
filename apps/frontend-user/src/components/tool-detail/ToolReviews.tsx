'use client';

import { useEffect } from 'react';
import { StarRating } from '../shared';
import { useToolStore } from '../../store';
import type { Review } from '../../types';

interface ToolReviewsProps {
  toolId: string;
}

export function ToolReviews({ toolId }: ToolReviewsProps) {
  const { currentToolReviews, totalReviews, detailLoading, fetchToolReviews } = useToolStore();

  useEffect(() => {
    fetchToolReviews(toolId);
  }, [fetchToolReviews, toolId]);

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <h2 className="text-2xl font-bold text-gray-900">
            用户评价
          </h2>
          <span className="text-gray-500">
            共 {totalReviews} 条评价
          </span>
        </div>

        {/* 加载状态 */}
        {detailLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        )}

        {/* 评价列表 */}
        {!detailLoading && currentToolReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无评价
          </div>
        ) : (
          <div className="space-y-6">
            {currentToolReviews.map((review: Review) => (
              <div key={review.id} className="review-card">
                <div className="flex items-start gap-4">
                  {/* 用户头像 */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl">
                    {review.userAvatar || '👤'}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                      <span className="text-sm text-gray-400">
                        {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    </div>

                    <div className="mb-3">
                      <StarRating rating={review.rating} size="sm" />
                    </div>

                    <p className="text-gray-600">{review.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
