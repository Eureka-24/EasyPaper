from prometheus_client import Counter, Histogram, Gauge, start_http_server
from typing import Dict, Any
import threading
import time


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

    def update_active_agents(self, count: int):
        """更新活跃Agent数量"""
        self.active_agents_gauge.set(count)

    def get_metrics_report(self) -> Dict[str, Any]:
        """获取指标报告"""
        from prometheus_client import REGISTRY

        # 这里可以添加自定义指标收集逻辑
        report = {
            "timestamp": time.time(),
            "active_agents": self.active_agents_gauge._value.get()
        }

        return report