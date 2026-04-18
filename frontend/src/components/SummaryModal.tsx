import { useState } from 'react';
import { X, Clock, Award, FileText, User, MessageCircle, Sparkles } from 'lucide-react';
import type { SummaryResult, HistoryRecord } from '../types';
import { ChatPanel } from './ChatPanel';
import { SimilarPapersPanel } from './SimilarPapersPanel';

interface SummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: SummaryResult | null;
  isLoading?: boolean;
  onSelectRelatedPaper?: (paper: HistoryRecord) => void;
}

export function SummaryModal({ isOpen, onClose, summary, isLoading, onSelectRelatedPaper }: SummaryModalProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              AI 论文摘要
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">正在生成摘要...</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                这可能需要几秒钟时间
              </p>
            </div>
          ) : summary ? (
            <div className="space-y-6">
              {/* Paper Info */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {summary.title}
                </h3>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {summary.authors?.slice(0, 3).join(', ')}
                    {summary.authors && summary.authors.length > 3 && ` +${summary.authors.length - 3}`}
                  </span>
                </div>
              </div>

              {/* Metrics */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    质量评分: {(summary.quality_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    处理时间: {summary.processing_time?.toFixed(2)}s
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg">
                  <span className="text-sm font-medium">
                    类型: {summary.summary_type === 'comprehensive' ? '详细摘要' : '简洁摘要'}
                  </span>
                </div>
              </div>

              {/* Summary Content */}
              <div>
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  摘要内容
                </h4>
                <div className="prose dark:prose-invert max-w-none">
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {summary.summary}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {summary.error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">
                    错误: {summary.error}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!summary.error && (
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">追问讨论</span>
                  </button>
                </div>
              )}

              {/* Similar Papers */}
              {!summary.error && onSelectRelatedPaper && (
                <div className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary-600" />
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                      智能推荐
                    </h4>
                  </div>
                  <SimilarPapersPanel
                    query={summary.summary}
                    currentPaperId={summary.paper_id}
                    onSelectPaper={onSelectRelatedPaper}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              暂无摘要数据
            </div>
          )}
        </div>
      </div>

      {/* Chat Panel */}
      {summary && (
        <ChatPanel
          paperId={summary.paper_id}
          paperTitle={summary.title}
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
        />
      )}
    </div>
  );
}
