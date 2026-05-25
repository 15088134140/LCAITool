'use client';

import { useEffect } from 'react';
import { useFavoriteStore } from '../../store/useFavoriteStore';

interface FavoriteButtonProps {
  toolId: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({ toolId, size = 'md', className = '' }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite, loadFavorites } = useFavoriteStore();
  const isFavorited = isFavorite(toolId);

  useEffect(() => {
    loadFavorites();
  }, []);

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={() => toggleFavorite(toolId)}
      className={`${sizeClasses[size]} ${className} rounded-full border-2 border-[#1E3A5F] flex items-center justify-center transition-all hover:bg-[#1E3A5F]/5 focus-ring ${
        isFavorited ? 'bg-[#FEF3C7] border-[#F59E0B]' : 'bg-white'
      }`}
      title={isFavorited ? '取消收藏' : '收藏工具'}
    >
      {isFavorited ? (
        <svg
          className={`${iconSizeClasses[size]} text-[#F59E0B]`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ) : (
        <svg
          className={`${iconSizeClasses[size]} text-[#1E3A5F]`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
          />
        </svg>
      )}
    </button>
  );
}
