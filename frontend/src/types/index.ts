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
