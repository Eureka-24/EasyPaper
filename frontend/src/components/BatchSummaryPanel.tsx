import { useState } from 'react';
import { Layers, Play, Check, X, FileText } from 'lucide-react';
import { apiService } from '../services/api';
import type { Paper, SummaryResult } from '../types';

interface BatchSummaryPanelProps {
  selectedPapers: Paper[];
  onClearSelection: () => void;
  onSummariesGenerated: (results: Record<string, SummaryResult>) => void;
}

export function BatchSummaryPanel({
  selectedPapers,
  onClearSelection,
  onSummariesGenerated,
}: BatchSummaryPanelProps) {
  const [summaryType, setSummaryType] = useState<'concise' | 'comprehensive'>('concise');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleBatchSummarize = async () => {
    if (selectedPapers.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setError(null);

    try {
      const paperIds = selectedPapers.map((p) => p.id);
      const result = await apiService.batchSummarize({
        paper_ids: paperIds,
        summary_type: summaryType,
      });

      // 提取成功的摘要结果
      const successfulSummaries: Record<string, SummaryResult> = {};
      Object.entries(result.batch_results).forEach(([paperId, summary]) => {
        if ('summary' in summary) {
          successfulSummaries[paperId] = summary as SummaryResult;
        }
      });

      onSummariesGenerated(successfulSummaries);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量处理失败');
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedPapers.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              批量摘要
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              已选择 {selectedPapers.length} 篇论文
            </p>
          </div>
        </div>
        <button
          onClick={onClearSelection}
          disabled={isProcessing}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Selected Papers List */}
      <div className="mb-4 max-h-40 overflow-y-auto">
        <div className="space-y-2">
          {selectedPapers.map((paper) => (
            <div
              key={paper.id}
              className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg"
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {paper.title}
              </span>
              <Check className="w-4 h-4 text-green-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Summary Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          摘要类型
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setSummaryType('concise')}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              summaryType === 'concise'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            简洁摘要
          </button>
          <button
            onClick={() => setSummaryType('comprehensive')}
            disabled={isProcessing}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              summaryType === 'comprehensive'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            详细摘要
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Progress Bar */}
      {isProcessing && (
        <div className="mb-4">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
            正在处理中...
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleBatchSummarize}
        disabled={isProcessing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors"
      >
        {isProcessing ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            处理中...
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            开始批量摘要
          </>
        )}
      </button>
    </div>
  );
}
