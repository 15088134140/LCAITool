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
    <section className="pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-center gap-3 mb-10">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
            <span className="text-white text-2xl">⭐</span>
          </div>
          <h2 className="text-3xl font-bold text-brand-dark">用户评价</h2>
          <span className="text-gray-500 ml-auto">共 {totalReviews} 条评价</span>
        </div>

        {/* Loading */}
        {detailLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-dark" />
          </div>
        )}

        {/* Empty State */}
        {!detailLoading && currentToolReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-200">
            暂无评价
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {currentToolReviews.map((review: Review) => (
              <div
                key={review.id}
                className="bg-white rounded-2xl p-6 border border-gray-200"
              >
                <div className="flex items-start gap-4">
                  {/* User Avatar */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                    {review.userAvatar ? (
                      <img
                        src={review.userAvatar}
                        alt={review.userName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-full flex items-center justify-center ${review.userAvatar ? 'hidden' : ''}`}
                    >
                      <span className="text-xl text-gray-400">👤</span>
                    </div>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-brand-dark">{review.userName}</h4>
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
