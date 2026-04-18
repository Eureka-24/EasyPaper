import { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { HistoryRecord } from '../types';
import { Link2, Loader2, BookOpen, ChevronRight } from 'lucide-react';

interface SimilarPapersPanelProps {
  query: string;
  currentPaperId?: string;
  onSelectPaper: (paper: HistoryRecord) => void;
}

export function SimilarPapersPanel({ query, currentPaperId, onSelectPaper }: SimilarPapersPanelProps) {
  const [papers, setPapers] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query) return;

    const fetchSimilarPapers = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiService.findSimilarPapers({
          query,
          limit: 5,
        });
        // 过滤掉当前论文
        const filtered = response.papers.filter(p => p.paper_id !== currentPaperId);
        setPapers(filtered);
      } catch (err) {
        console.error('Failed to fetch similar papers:', err);
        setError('获取相似论文失败');
      } finally {
        setLoading(false);
      }
    };

    fetchSimilarPapers();
  }, [query, currentPaperId]);

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">正在搜索相关论文...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-primary-600" />
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
          相关论文推荐
        </h4>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          (基于向量相似度)
        </span>
      </div>

      <div className="space-y-2">
        {papers.map((paper) => (
          <button
            key={paper.id}
            onClick={() => onSelectPaper(paper)}
            className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-primary-600 transition-colors">
                  {paper.title}
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                  {paper.authors}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                    {paper.year}
                  </span>
                  <span className="text-xs text-gray-400">
                    质量: {(paper.quality_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
