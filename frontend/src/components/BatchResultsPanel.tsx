import { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, BarChart3, Clock, Award, X } from 'lucide-react';
import type { SummaryResult } from '../types';

interface BatchResultsPanelProps {
  results: Record<string, SummaryResult>;
  onClose: () => void;
}

export function BatchResultsPanel({ results, onClose }: BatchResultsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const resultsList = Object.entries(results);
  const totalResults = resultsList.length;
  const avgQualityScore = resultsList.reduce((sum, [, r]) => sum + (r.quality_score || 0), 0) / totalResults;
  const avgProcessingTime = resultsList.reduce((sum, [, r]) => sum + (r.processing_time || 0), 0) / totalResults;

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
    return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              批量摘要结果
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              共 {totalResults} 篇论文
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">平均质量分</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {(avgQualityScore * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-purple-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">平均耗时</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {avgProcessingTime.toFixed(2)}s
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-4 h-4 text-orange-500" />
            <span className="text-sm text-gray-500 dark:text-gray-400">完成数量</span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {totalResults} 篇
          </p>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {resultsList.map(([paperId, result]) => (
          <div
            key={paperId}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            {/* Summary Header */}
            <button
              onClick={() => toggleExpand(paperId)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {result.title || paperId}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getQualityColor(result.quality_score || 0)}`}>
                  质量分: {((result.quality_score || 0) * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {result.processing_time?.toFixed(1)}s
                </span>
                {expandedId === paperId ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === paperId && (
              <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {result.error ? (
                  <div className="text-red-600 dark:text-red-400 text-sm">
                    错误: {result.error}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        作者
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {result.authors?.join(', ') || '未知'}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        摘要类型
                      </h4>
                      <span className="inline-flex px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded">
                        {result.summary_type === 'comprehensive' ? '详细摘要' : '简洁摘要'}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                        摘要内容
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {result.summary}
                      </p>
                    </div>
                    {result.step_times && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">
                          处理时间详情
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(result.step_times).map(([step, time]) => (
                            <span
                              key={step}
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded"
                            >
                              {step}: {(time as number).toFixed(2)}s
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
