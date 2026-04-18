import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { HistoryRecord, MemoryStatistics } from '../types';
import { History, Clock, Star, TrendingUp, X, ChevronRight, BookOpen } from 'lucide-react';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPaper: (paper: HistoryRecord) => void;
}

export function HistoryPanel({ isOpen, onClose, onSelectPaper }: HistoryPanelProps) {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [statistics, setStatistics] = useState<MemoryStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'all'>('recent');

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 加载历史记录
      const days = activeTab === 'recent' ? 7 : undefined;
      const historyResponse = await apiService.getHistory(50, 0, days);
      setRecords(historyResponse.records);

      // 加载统计信息
      const statsResponse = await apiService.getMemoryStatistics();
      setStatistics(statsResponse);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-500';
    if (score >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            历史记录
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <BookOpen className="w-3 h-3" />
                <span>总论文数</span>
              </div>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {statistics.total_papers}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
              <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs mb-1">
                <Star className="w-3 h-3" />
                <span>平均质量</span>
              </div>
              <p className={`text-xl font-bold ${getQualityColor(statistics.avg_quality_score)}`}>
                {(statistics.avg_quality_score * 100).toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('recent')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'recent'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            最近7天
          </div>
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'text-primary-600 border-b-2 border-primary-600'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          }`}
        >
          <div className="flex items-center justify-center gap-1">
            <TrendingUp className="w-4 h-4" />
            全部记录
          </div>
        </button>
      </div>

      {/* Records List */}
      <div className="overflow-y-auto h-[calc(100vh-280px)]">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            <History className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">暂无历史记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {records.map((record) => (
              <button
                key={record.id}
                onClick={() => onSelectPaper(record)}
                className="w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                      {record.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                      {record.authors}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-400">
                        {formatDate(record.created_at)}
                      </span>
                      <span className={`text-xs font-medium ${getQualityColor(record.quality_score)}`}>
                        质量: {(record.quality_score * 100).toFixed(0)}%
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                        {record.summary_type === 'concise' ? '简洁' : '详细'}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
