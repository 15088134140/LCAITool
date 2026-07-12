import { useEffect, useState } from 'react';

/**
 * 防抖 hook：返回防抖后的值。
 *
 * 内部用 useEffect + setTimeout 稳定定时器，避免在组件函数体内每次渲染
 * 重建 debounce 实例导致 clearTimeout 清不到上一次 timer 的问题
 * （见旧实现 orders/List.tsx 的 debouncedSearch 失效 bug）。
 *
 * @example
 * const [keyword, setKeyword] = useState('');
 * const debouncedKeyword = useDebouncedValue(keyword, 300);
 * useEffect(() => { loadList(debouncedKeyword); }, [debouncedKeyword]);
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
