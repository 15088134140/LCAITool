import { useEffect, useState } from 'react';
import { toolApi, ExecutorInfo } from '@/api';

interface ExecutorSelectProps {
  value: string | null | undefined;
  onChange: (value: string | null) => void;
}

const ExecutorSelect = ({ value, onChange }: ExecutorSelectProps) => {
  const [executors, setExecutors] = useState<ExecutorInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await toolApi.getExecutors();
        if (!cancelled) {
          setExecutors(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err: any) {
        console.error('加载执行器列表失败:', err);
        if (!cancelled) setError('加载执行器列表失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = executors.find((e) => e.key === value);

  return (
    <div className="space-y-2">
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none disabled:bg-gray-50"
      >
        <option value="">（未绑定，回退使用 task_type / slug）</option>
        {executors.map((exec) => (
          <option key={exec.key} value={exec.key}>
            {exec.name}（{exec.key}）
          </option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-500">加载执行器列表中...</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {selected?.description && (
        <p className="text-xs text-gray-500">{selected.description}</p>
      )}
      {!value && !loading && (
        <p className="text-xs text-amber-600">
          未选择执行器时，后端会按 task_type 或 slug 回退查找；推荐显式绑定。
        </p>
      )}
    </div>
  );
};

export default ExecutorSelect;
