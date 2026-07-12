import { useEffect, useState } from 'react';
import { useAppStore } from '@/store';
import { Users, UserCheck, DollarSign, Zap, Clock, Wrench, ShoppingCart, Lightbulb } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import StatCard from '@/components/StatCard';
import { Link } from 'react-router-dom';
import request from '@/utils/request';
import { formatDate } from '@/utils';

interface DashboardStats {
  total_users: number;
  verified_users: number;
  total_revenue: number;
  today_tasks: number;
  top_tools: { name: string; slug: string; usage_count: number }[];
  recent_activities: { user: string; action: string; task_type: string; time: number }[];
}

const Dashboard = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d'>('7d');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCurrentPageTitle('仪表盘');
    setBreadcrumbs([{ label: '首页' }, { label: '仪表盘' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // Fetch real stats from API
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await request.get('/admin/dashboard/stats');
      setStats(data);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData7d = {
    dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    users: [1200, 1320, 1010, 1340, 900, 1230, 1500],
    tasks: [220, 182, 191, 234, 290, 330, 310],
    revenue: [4200, 3800, 4100, 5200, 4900, 5300, 5800],
  };

  const chartData30d = {
    dates: ['第1周', '第2周', '第3周', '第4周'],
    users: [8400, 9200, 10100, 11500],
    tasks: [1540, 1680, 1820, 1960],
    revenue: [29400, 32200, 35700, 40600],
  };

  const chartData = chartPeriod === '7d' ? chartData7d : chartData30d;

  const lineChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross' },
    },
    legend: {
      data: ['用户数', '任务数', '收入'],
      top: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: chartData.dates,
    },
    yAxis: [
      {
        type: 'value',
        name: '用户/任务',
        position: 'left',
      },
      {
        type: 'value',
        name: '收入(元)',
        position: 'right',
      },
    ],
    series: [
      {
        name: '用户数',
        type: 'line',
        smooth: true,
        data: chartData.users,
        itemStyle: { color: '#2563EB' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37, 99, 235, 0.3)' },
              { offset: 1, color: 'rgba(37, 99, 235, 0.05)' },
            ],
          },
        },
      },
      {
        name: '任务数',
        type: 'line',
        smooth: true,
        data: chartData.tasks,
        itemStyle: { color: '#059669' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(5, 150, 105, 0.3)' },
              { offset: 1, color: 'rgba(5, 150, 105, 0.05)' },
            ],
          },
        },
      },
      {
        name: '收入',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        data: chartData.revenue,
        itemStyle: { color: '#F59E0B' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.3)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.05)' },
            ],
          },
        },
      },
    ],
  };

  // Build top tools chart from API data
  const topToolNames = (stats?.top_tools || []).map((t) => t.name);
  const topToolCounts = (stats?.top_tools || []).map((t) => t.usage_count);

  const barChartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      top: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: topToolNames.length > 0 ? topToolNames : ['暂无数据'],
    },
    yAxis: {
      type: 'value',
      name: '使用次数',
    },
    series: [
      {
        name: '使用次数',
        type: 'bar',
        data: topToolCounts.length > 0 ? topToolCounts : [0],
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#059669' },
              { offset: 1, color: '#10B981' },
            ],
          },
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  const recentActivities = (stats?.recent_activities || []).map((activity) => ({
    user: activity.user,
    action: activity.action,
    time: activity.time,
  }));

  const quickActions = [
    { path: '/tools', icon: Wrench, label: '工具管理', color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { path: '/users', icon: Users, label: '用户管理', color: 'text-green-500', bgColor: 'bg-green-50' },
    { path: '/orders', icon: ShoppingCart, label: '订单管理', color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { path: '/ideas', icon: Lightbulb, label: '构思审核', color: 'text-purple-500', bgColor: 'bg-purple-50' },
  ];

  // Format numbers with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString('zh-CN');
  };

  const formatCurrency = (num: number) => {
    return `¥${num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="总用户数"
          value={loading ? '...' : formatNumber(stats?.total_users || 0)}
          icon={Users}
          gradientFrom="#2563EB"
          gradientTo="#3B82F6"
        />
        <StatCard
          title="实名认证用户"
          value={loading ? '...' : formatNumber(stats?.verified_users || 0)}
          icon={UserCheck}
          gradientFrom="#059669"
          gradientTo="#10B981"
        />
        <StatCard
          title="总收入"
          value={loading ? '...' : formatCurrency(stats?.total_revenue || 0)}
          icon={DollarSign}
          gradientFrom="#F59E0B"
          gradientTo="#FBBF24"
        />
        <StatCard
          title="今日任务数"
          value={loading ? '...' : formatNumber(stats?.today_tasks || 0)}
          icon={Zap}
          gradientFrom="#8B5CF6"
          gradientTo="#A78BFA"
        />
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">数据趋势</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartPeriod('7d')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  chartPeriod === '7d'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                近7天
              </button>
              <button
                onClick={() => setChartPeriod('30d')}
                className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                  chartPeriod === '30d'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                近30天
              </button>
            </div>
          </div>
          <ReactECharts option={lineChartOption} style={{ height: '300px' }} />
        </div>

        {/* 工具使用排行 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">工具使用排行</h3>
          <ReactECharts option={barChartOption} style={{ height: '300px' }} />
        </div>
      </div>

      {/* 快捷操作和最近活动 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快捷操作 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快捷操作</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <Link
                key={index}
                to={action.path}
                className="flex flex-col items-center justify-center p-4 rounded-lg transition-colors hover:shadow-md"
                style={{ backgroundColor: `${action.bgColor}50` }}
              >
                <div className={`${action.bgColor} p-3 rounded-lg mb-2`}>
                  <action.icon size={24} className={action.color} />
                </div>
                <span className="text-sm text-gray-700 font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* 最近活动 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">最近活动</h3>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">暂无活动</p>
            ) : (
              recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock size={14} className="text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-700">
                      <span className="font-medium">{activity.user}</span> {activity.action}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(activity.time as number)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
