import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
}

const StatCard = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  gradientFrom,
  gradientTo,
}: StatCardProps) => {
  const changeColorClass = {
    increase: 'text-green-500',
    decrease: 'text-red-500',
    neutral: 'text-gray-500',
  }[changeType];

  const changeIcon = {
    increase: '↑',
    decrease: '↓',
    neutral: '',
  }[changeType];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover transition-all duration-300">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={`text-sm mt-1 flex items-center gap-1 ${changeColorClass}`}>
              <span>{changeIcon}</span>
              <span>{change}</span>
            </p>
          )}
        </div>
        <div
          className={`p-3 rounded-lg bg-gradient-to-br`}
          style={{
            background: `linear-gradient(135deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
          }}
        >
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
};

export default StatCard;
