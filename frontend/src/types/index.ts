// 论文类型定义
export interface Paper {
  id: string;
  arxiv_id: string;
  title: string;
  authors: string[];
  abstract: string;
  published: string;
  updated: string;
  categories: string[];
  primary_category: string;
  url: string;
  pdf_url: string;
}

// 搜索结果类型
export interface SearchResult {
  query: string;
  source: string;
  total_results: number;
  search_time: number;
  papers: Paper[];
}

// 摘要请求类型
export interface SummarizeRequest {
  paper_id: string;
  summary_type: 'concise' | 'comprehensive';
  include_comparison?: boolean;
}

// 摘要结果类型
export interface SummaryResult {
  paper_id: string;
  title: string;
  authors: string[];
  summary: string;
  summary_type: string;
  quality_score: number;
  processing_time: number;
  step_times?: Record<string, number>;
  error?: string;
}

// 批量摘要请求
export interface BatchSummarizeRequest {
  paper_ids: string[];
  summary_type: 'concise' | 'comprehensive';
}

// 批量摘要结果
export interface BatchSummaryResult {
  total_processed: number;
  total_failed: number;
  batch_results: Record<string, SummaryResult | { error: string }>;
}

// 监控指标类型
export interface Metrics {
  total_summaries: number;
  avg_quality_score: number;
  avg_processing_time: number;
  error_rate: number;
  active_agents: number;
  timestamp: string;
}

// 搜索请求类型
export interface SearchRequest {
  query: string;
  source: 'arxiv' | 'semantic_scholar';
  max_results: number;
}

// 对比分析结果
export interface ComparisonResult {
  papers: Paper[];
  comparison_summary: string;
  common_themes: string[];
  differences: string[];
}

// ==================== 记忆系统类型定义 ====================

// 历史记录项
export interface HistoryRecord {
  id: string;
  paper_id: string;
  title: string;
  authors: string;
  year: number;
  text: string;  // 摘要内容
  summary_type: string;
  quality_score: number;
  created_at: string;
}

// 历史记录响应
export interface HistoryResponse {
  total: number;
  records: HistoryRecord[];
}

// 记忆库统计
export interface MemoryStatistics {
  total_papers: number;
  avg_quality_score: number;
  summary_type_distribution: Record<string, number>;
  recent_activity: Array<{
    title: string;
    created_at: string;
    quality_score: number;
  }>;
}

// 相似论文请求
export interface SimilarPapersRequest {
  query: string;
  limit?: number;
}

// 相似论文响应
export interface SimilarPapersResponse {
  query: string;
  total: number;
  papers: HistoryRecord[];
}

// 对话请求
export interface ChatRequest {
  paper_id: string;
  question: string;
  conversation_id?: string;
}

// 对话消息
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// 对话响应
export interface ChatResponse {
  paper_id: string;
  paper_title: string;
  question: string;
  answer: string;
  conversation_history: ChatMessage[];
}
