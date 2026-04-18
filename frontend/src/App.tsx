import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { PaperCard } from './components/PaperCard';
import { SummaryModal } from './components/SummaryModal';
import { MetricsPanel } from './components/MetricsPanel';
import { BatchSummaryPanel } from './components/BatchSummaryPanel';
import { BatchResultsPanel } from './components/BatchResultsPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { apiService } from './services/api';
import type { Paper, SearchResult, SummaryResult, HistoryRecord } from './types';
import { Search, AlertCircle, FileText, History } from 'lucide-react';

function App() {
  const [, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selectedPapers, setSelectedPapers] = useState<Paper[]>([]);
  const [summarizingId, setSummarizingId] = useState<string | null>(null);

  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [currentSummary, setCurrentSummary] = useState<SummaryResult | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  const [batchResults, setBatchResults] = useState<Record<string, SummaryResult> | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // 搜索论文
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setIsSearching(true);
    setSearchError(null);
    setSearchResults(null);
    setSelectedPapers([]);
    setBatchResults(null);

    try {
      const results = await apiService.searchPapers({
        query,
        source: 'arxiv',
        max_results: 10,
      });
      setSearchResults(results);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 选择/取消选择论文
  const togglePaperSelection = useCallback((paper: Paper) => {
    setSelectedPapers((prev) => {
      const exists = prev.find((p) => p.id === paper.id);
      if (exists) {
        return prev.filter((p) => p.id !== paper.id);
      }
      return [...prev, paper];
    });
  }, []);

  // 生成单篇摘要
  const handleSummarize = useCallback(async (paper: Paper) => {
    setSummarizingId(paper.id);
    setSummaryModalOpen(true);
    setIsSummaryLoading(true);
    setCurrentSummary(null);

    try {
      const result = await apiService.summarizePaper({
        paper_id: paper.id,
        summary_type: 'concise',
      });
      setCurrentSummary(result);
    } catch (err) {
      setCurrentSummary({
        paper_id: paper.id,
        title: paper.title,
        authors: paper.authors,
        summary: '',
        summary_type: 'concise',
        quality_score: 0,
        processing_time: 0,
        error: err instanceof Error ? err.message : '生成摘要失败',
      });
    } finally {
      setIsSummaryLoading(false);
      setSummarizingId(null);
    }
  }, []);

  // 批量摘要完成
  const handleBatchComplete = useCallback((results: Record<string, SummaryResult>) => {
    setBatchResults(results);
    setSelectedPapers([]);
  }, []);

  // 从历史记录选择论文
  const handleSelectFromHistory = useCallback((record: HistoryRecord) => {
    // 将历史记录转换为摘要结果格式
    const summaryResult: SummaryResult = {
      paper_id: record.paper_id,
      title: record.title,
      authors: record.authors.split(', '),
      summary: record.text,
      summary_type: record.summary_type,
      quality_score: record.quality_score,
      processing_time: 0,
    };
    setCurrentSummary(summaryResult);
    setSummaryModalOpen(true);
    setIsHistoryOpen(false);
  }, []);

  // 从相似论文推荐选择
  const handleSelectRelatedPaper = useCallback((record: HistoryRecord) => {
    handleSelectFromHistory(record);
  }, [handleSelectFromHistory]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      {/* History Toggle Button */}
      <button
        onClick={() => setIsHistoryOpen(true)}
        className="fixed right-4 top-24 z-40 flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 shadow-lg rounded-full hover:shadow-xl transition-shadow"
      >
        <History className="w-4 h-4 text-primary-600" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">历史记录</span>
      </button>

      {/* History Panel */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPaper={handleSelectFromHistory}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metrics Panel */}
        <div className="mb-8">
          <MetricsPanel />
        </div>

        {/* Search Section */}
        <div className="mb-8">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
              搜索学术论文
            </h2>
            <SearchBar
              onSearch={handleSearch}
              isLoading={isSearching}
              placeholder="输入关键词搜索 arXiv 论文..."
            />
          </div>
        </div>

        {/* Error Message */}
        {searchError && (
          <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{searchError}</p>
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            {/* Results Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  搜索结果
                </h3>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm rounded-md">
                  {searchResults.total_results} 篇论文
                </span>
                <span className="text-sm text-gray-400">
                  ({searchResults.search_time}s)
                </span>
              </div>
              {selectedPapers.length > 0 && (
                <button
                  onClick={() => setSelectedPapers([])}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  清除选择 ({selectedPapers.length})
                </button>
              )}
            </div>

            {/* Batch Summary Panel */}
            {selectedPapers.length > 0 && (
              <div className="mb-6">
                <BatchSummaryPanel
                  selectedPapers={selectedPapers}
                  onClearSelection={() => setSelectedPapers([])}
                  onSummariesGenerated={handleBatchComplete}
                />
              </div>
            )}

            {/* Batch Results */}
            {batchResults && Object.keys(batchResults).length > 0 && (
              <div className="mb-6">
                <BatchResultsPanel
                  results={batchResults}
                  onClose={() => setBatchResults(null)}
                />
              </div>
            )}

            {/* Papers Grid */}
            {searchResults.papers.length > 0 ? (
              <div className="grid gap-4">
                {searchResults.papers.map((paper) => (
                  <PaperCard
                    key={paper.id}
                    paper={paper}
                    isSelected={selectedPapers.some((p) => p.id === paper.id)}
                    onSelect={togglePaperSelection}
                    onSummarize={handleSummarize}
                    isSummarizing={summarizingId === paper.id}
                    showSelect={true}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  未找到相关论文
                </p>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchResults && !isSearching && !searchError && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              开始搜索论文
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              输入关键词搜索 arXiv 论文，使用 AI 生成智能摘要，支持批量处理和多论文对比分析
            </p>
          </div>
        )}
      </main>

      {/* Summary Modal */}
      <SummaryModal
        isOpen={summaryModalOpen}
        onClose={() => setSummaryModalOpen(false)}
        summary={currentSummary}
        isLoading={isSummaryLoading}
        onSelectRelatedPaper={handleSelectRelatedPaper}
      />
    </div>
  );
}

export default App;
