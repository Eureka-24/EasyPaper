import { useEffect, useState } from 'react';
import { Activity, Clock, TrendingUp, AlertCircle, Server } from 'lucide-react';
import { apiService } from '../services/api';
import type { Metrics } from '../types';

export function MetricsPanel() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        const data = await apiService.getMetrics();
        setMetrics(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : '获取指标失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000); // 每30秒刷新

    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    {
      title: '总摘要数',
      value: metrics?.total_summaries ?? 0,
      icon: Activity,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: '平均质量分',
      value: metrics?.avg_quality_score !== undefined 
        ? `${(metrics.avg_quality_score * 100).toFixed(1)}%` 
        : '0%',
      icon: TrendingUp,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: '平均处理时间',
      value: metrics?.avg_processing_time !== undefined 
        ? `${metrics.avg_processing_time.toFixed(2)}s` 
        : '0s',
      icon: Clock,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      title: '错误率',
      value: metrics?.error_rate !== undefined 
        ? `${(metrics.error_rate * 100).toFixed(1)}%` 
        : '0%',
      icon: AlertCircle,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
    },
    {
      title: '活跃Agent',
      value: metrics?.active_agents ?? 0,
      icon: Server,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
  ];

  if (loading && !metrics) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            系统监控
          </h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            系统监控
          </h3>
        </div>
        <div className="text-red-500 dark:text-red-400 text-sm">
          获取监控数据失败: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            系统监控
          </h3>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          自动刷新
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCards.map((card) => (
          <div
            key={card.title}
            className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 ${card.bgColor} rounded-lg flex items-center justify-center`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {card.value}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {card.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
