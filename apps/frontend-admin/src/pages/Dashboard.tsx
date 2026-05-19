import { useEffect } from 'react';
import { useAppStore } from '@/store';
import { Users, Shield, Settings, TrendingUp, UserCheck, CreditCard, Clock, Activity } from 'lucide-react';

const Dashboard = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  useEffect(() => {
    setCurrentPageTitle('仪表盘');
    setBreadcrumbs([{ label: '首页' }, { label: '仪表盘' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  const stats = [
    {
      label: '总用户数',
      value: '12,845',
      change: '+12.5%',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: '实名认证用户',
      value: '8,234',
      change: '+8.3%',
      icon: UserCheck,
      color: 'bg-green-500',
    },
    {
      label: '总积分消耗',
      value: '¥156,430',
      change: '+15.2%',
      icon: CreditCard,
      color: 'bg-amber-500',
    },
    {
      label: '今日活跃用户',
      value: '1,234',
      change: '+5.8%',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ];

  const recentActivities = [
    {
      user: '张三',
      action: '完成了一次AI绘画生成',
      time: '2分钟前',
    },
    {
      user: '李四',
      action: '充值了1000积分',
      time: '15分钟前',
    },
    {
      user: '王五',
      action: '完成了实名认证',
      time: '1小时前',
    },
    {
      user: '赵六',
      action: '提交了意见反馈',
      time: '2小时前',
    },
    {
      user: '孙七',
      action: '使用了有声绘本工具',
      time: '3小时前',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover transition-all duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-500 mt-1">{stat.change}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon size={24} className="text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 快捷操作和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Users size={24} className="text-blue-500 mb-2" />
              <span className="text-sm text-gray-700">用户管理</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Shield size={24} className="text-green-500 mb-2" />
              <span className="text-sm text-gray-700">角色权限</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <Settings size={24} className="text-amber-500 mb-2" />
              <span className="text-sm text-gray-700">系统设置</span>
            </button>
            <button className="flex flex-col items-center justify-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <TrendingUp size={24} className="text-purple-500 mb-2" />
              <span className="text-sm text-gray-700">数据报表</span>
            </button>
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Clock size={14} className="text-gray-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
