import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** 表格空状态:替代各页"暂无数据"纯文字,提供图标与可选引导。 */
const EmptyState = ({
  title = '暂无数据',
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center py-12 text-center ${className}`}
  >
    <div className="text-gray-300 mb-3">{icon || <Inbox size={40} />}</div>
    <p className="text-sm font-medium text-gray-500">{title}</p>
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export { EmptyState };
