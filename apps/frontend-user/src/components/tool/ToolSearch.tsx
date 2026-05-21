'use client';

interface ToolSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
}

export function ToolSearch({
  searchQuery,
  onSearchChange,
  placeholder = "搜索工具名称、功能、场景..."
}: ToolSearchProps) {
  return (
    <div className="relative max-w-2xl mx-auto">
      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        className="search-input w-full pl-12 pr-4 py-4 rounded-xl text-[#1E3A5F] placeholder-[#94A3B8] text-lg focus-ring"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
    </div>
  );
}