interface TableSkeletonProps {
  /** 合并列数(与表头列数一致) */
  cols?: number;
  /** 骨架行数 */
  rows?: number;
}

/** 表格加载骨架:替代各页"加载中..."纯文字,避免布局跳动。 */
const TableSkeleton = ({ cols = 1, rows = 5 }: TableSkeletonProps) => (
  <>
    {Array.from({ length: rows }).map((_, i) => (
      <tr key={i} className="border-b border-gray-100">
        <td colSpan={cols} className="px-6 py-4">
          <div
            className="h-4 bg-gray-100 rounded animate-pulse"
            style={{ width: `${50 + ((i * 7) % 40)}%` }}
          />
        </td>
      </tr>
    ))}
  </>
);

export { TableSkeleton };
