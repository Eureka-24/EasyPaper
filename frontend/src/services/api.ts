import type {
  SearchRequest,
  SearchResult,
  SummarizeRequest,
  SummaryResult,
  BatchSummarizeRequest,
  BatchSummaryResult,
  Metrics,
  HistoryResponse,
  MemoryStatistics,
  SimilarPapersRequest,
  SimilarPapersResponse,
  ChatRequest,
  ChatResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8888';

class ApiService {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // 搜索论文
  async searchPapers(request: SearchRequest): Promise<SearchResult> {
    const params = new URLSearchParams({
      query: request.query,
      source: request.source,
      max_results: request.max_results.toString(),
    });
    return this.fetch<SearchResult>(`/search?${params}`);
  }

  // 生成单篇论文摘要
  async summarizePaper(request: SummarizeRequest): Promise<SummaryResult> {
    return this.fetch<SummaryResult>('/summarize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 批量生成摘要
  async batchSummarize(request: BatchSummarizeRequest): Promise<BatchSummaryResult> {
    return this.fetch<BatchSummaryResult>('/batch-summarize', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // 获取监控指标
  async getMetrics(): Promise<Metrics> {
    return this.fetch<Metrics>('/metrics');
  }

  // ==================== 记忆系统API ====================

  // 获取历史记录
  async getHistory(limit: number = 50, offset: number = 0, days?: number): Promise<HistoryResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });
    if (days) {
      params.append('days', days.toString());
    }
    return this.fetch<HistoryResponse>(`/memory/history?${params}`);
  }

  // 获取记忆库统计
  async getMemoryStatistics(): Promise<MemoryStatistics> {
    return this.fetch<MemoryStatistics>('/memory/statistics');
  }

  // 搜索相似论文
  async findSimilarPapers(request: SimilarPapersRequest): Promise<SimilarPapersResponse> {
    const params = new URLSearchParams({
      query: request.query,
      limit: (request.limit || 5).toString(),
    });
    return this.fetch<SimilarPapersResponse>(`/memory/similar?${params}`);
  }

  // 与论文对话
  async chatWithPaper(request: ChatRequest): Promise<ChatResponse> {
    return this.fetch<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiService = new ApiService();
