import type {
  SearchRequest,
  SearchResult,
  SummarizeRequest,
  SummaryResult,
  BatchSummarizeRequest,
  BatchSummaryResult,
  Metrics,
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
}

export const apiService = new ApiService();
