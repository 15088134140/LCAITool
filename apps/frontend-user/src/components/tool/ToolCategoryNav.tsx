'use client';

import type { Category } from '../../types';

interface ToolCategoryNavProps {
  categories: Category[];
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function ToolCategoryNav({
  categories,
  selectedCategoryId,
  onCategorySelect
}: ToolCategoryNavProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <button
        className={`category-btn px-5 py-2.5 rounded-xl text-sm font-medium focus-ring ${
          selectedCategoryId === null ? 'active' : ''
        }`}
        onClick={() => onCategorySelect(null)}
      >
        全部分类
      </button>
      {categories.map((category) => (
        <button
          key={category.id}
          className={`category-btn px-5 py-2.5 rounded-xl text-sm font-medium focus-ring flex items-center gap-2 ${
            selectedCategoryId === category.id ? 'active' : ''
          }`}
          onClick={() => onCategorySelect(category.id)}
        >
          <span>{category.icon}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}