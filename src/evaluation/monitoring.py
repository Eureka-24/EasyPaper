from prometheus_client import Counter, Histogram, Gauge, start_http_server
from typing import Dict, Any, List
import threading
import time
from collections import deque


class AgentMonitor:
    def __init__(self, port: int = 8000):
        self.port = port

        # Prometheus指标
        self.summary_generation_count = Counter(
            'literature_summary_total',
            'Total literature summaries generated',
            ['status', 'summary_type']
        )

        self.summary_generation_time = Histogram(
            'literature_summary_duration_seconds',
            'Time spent generating literature summaries',
            ['summary_type']
        )

        self.quality_score_gauge = Gauge(
            'literature_summary_quality_score',
            'Current average quality score',
            ['summary_type']
        )

        self.active_agents_gauge = Gauge(
            'active_literature_agents',
            'Number of active literature agents'
        )

        # 质量评价相关指标
        self.evaluation_metrics_count = Counter(
            'literature_evaluation_total',
            'Total quality evaluations performed',
            ['evaluation_type']
        )

        self.evaluation_score_histogram = Histogram(
            'literature_evaluation_score',
            'Distribution of quality evaluation scores',
            ['metric_name']
        )

        # 存储最近的质量评价结果（用于计算统计信息）
        self._quality_scores: deque = deque(maxlen=100)
        self._processing_times: deque = deque(maxlen=100)
        self._evaluation_results: deque = deque(maxlen=50)

        # 启动监控服务器
        self.start_monitoring_server()

    def start_monitoring_server(self):
        """启动监控服务器"""

        def run_server():
            start_http_server(self.port)

        server_thread = threading.Thread(target=run_server, daemon=True)
        server_thread.start()
        print(f"Monitoring server started on port {self.port}")

    def log_summary_generation(self, paper_id: str, summary_type: str,
                               quality_score: float, duration: float, status: str = "success"):
        """记录摘要生成事件"""
        self.summary_generation_count.labels(status=status, summary_type=summary_type).inc()
        self.summary_generation_time.labels(summary_type=summary_type).observe(duration)
        self.quality_score_gauge.labels(summary_type=summary_type).set(quality_score)

        # 存储到内存中用于报告
        self._quality_scores.append(quality_score)
        self._processing_times.append(duration)

    def update_active_agents(self, count: int):
        """更新活跃Agent数量"""
        self.active_agents_gauge.set(count)

    def log_evaluation_metrics(self, evaluation_results: Dict[str, Any]):
        """记录质量评价指标
        
        Args:
            evaluation_results: 质量评价结果字典，包含各种评价指标
        """
        # 记录评价次数
        self.evaluation_metrics_count.labels(evaluation_type='quality').inc()

        # 记录各个评价指标分数
        for metric_name, value in evaluation_results.items():
            if isinstance(value, (int, float)) and 0 <= value <= 1:
                self.evaluation_score_histogram.labels(metric_name=metric_name).observe(value)

        # 存储评价结果
        self._evaluation_results.append({
            'timestamp': time.time(),
            'metrics': evaluation_results
        })

    def get_metrics_report(self) -> Dict[str, Any]:
        """获取指标报告"""
        # 计算统计信息
        total_summaries = len(self._quality_scores)
        avg_quality_score = sum(self._quality_scores) / len(self._quality_scores) if self._quality_scores else 0
        avg_processing_time = sum(self._processing_times) / len(self._processing_times) if self._processing_times else 0

        # 计算错误率（简化：假设失败的质量分数为0）
        error_count = sum(1 for score in self._quality_scores if score == 0)
        error_rate = error_count / total_summaries if total_summaries > 0 else 0

        # 计算评价指标统计
        evaluation_stats = {}
        if self._evaluation_results:
            all_metrics: Dict[str, List[float]] = {}
            for result in self._evaluation_results:
                for metric_name, value in result['metrics'].items():
                    if isinstance(value, (int, float)):
                        if metric_name not in all_metrics:
                            all_metrics[metric_name] = []
                        all_metrics[metric_name].append(value)

            evaluation_stats = {
                metric: {
                    'avg': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values),
                    'count': len(values)
                }
                for metric, values in all_metrics.items()
            }

        report = {
            "timestamp": time.time(),
            "total_summaries": total_summaries,
            "avg_quality_score": round(avg_quality_score, 3),
            "avg_processing_time": round(avg_processing_time, 2),
            "error_rate": round(error_rate, 3),
            "active_agents": int(self.active_agents_gauge._value.get() or 0),
            "evaluation_metrics": evaluation_stats
        }

        return report