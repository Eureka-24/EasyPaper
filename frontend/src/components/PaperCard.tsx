import { useState } from 'react';
import { FileText, Calendar, Tag, ExternalLink, Sparkles, Check } from 'lucide-react';
import type { Paper } from '../types';

interface PaperCardProps {
  paper: Paper;
  isSelected?: boolean;
  onSelect?: (paper: Paper) => void;
  onSummarize?: (paper: Paper) => void;
  isSummarizing?: boolean;
  showSelect?: boolean;
}

export function PaperCard({
  paper,
  isSelected,
  onSelect,
  onSummarize,
  isSummarizing,
  showSelect = false,
}: PaperCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '未知日期';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  const truncateAbstract = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 overflow-hidden ${
        isSelected
          ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-900'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight mb-2">
              {paper.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                {paper.authors.slice(0, 3).join(', ')}
                {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDate(paper.published)}
              </span>
            </div>
          </div>
          {showSelect && (
            <button
              onClick={() => onSelect?.(paper)}
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {isSelected && <Check className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Categories */}
        {paper.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {paper.categories.slice(0, 3).map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs rounded-md"
              >
                <Tag className="w-3 h-3" />
                {cat}
              </span>
            ))}
            {paper.categories.length > 3 && (
              <span className="px-2 py-1 text-gray-400 text-xs">
                +{paper.categories.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Abstract */}
        <div className="mt-4">
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {isExpanded ? paper.abstract : truncateAbstract(paper.abstract)}
          </p>
          {paper.abstract.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-primary-600 dark:text-primary-400 text-sm hover:underline"
            >
              {isExpanded ? '收起' : '展开更多'}
            </button>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => onSummarize?.(paper)}
            disabled={isSummarizing}
            className="flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
          >
            {isSummarizing ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 摘要
              </>
            )}
          </button>
          <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            arXiv
          </a>
          <a
            href={paper.pdf_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </a>
        </div>
      </div>
    </div>
  );
}
