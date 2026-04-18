from typing import TypedDict, List, Dict, Any, Optional
from langchain_core.messages import BaseMessage


class LiteratureAgentState(TypedDict):
    # 输入参数
    paper_id: str
    paper_title: str
    paper_content: str
    search_query: Optional[str]

    # 中间状态
    parsed_sections: Dict[str, str]
    extracted_metadata: Dict[str, Any]
    conversation_history: List[BaseMessage]

    # 输出结果
    summary: str
    summary_type: str
    quality_score: float
    processing_time: float
    error_message: Optional[str]

    # 记忆相关
    related_papers: List[Dict[str, Any]]
    comparison_results: Dict[str, Any]

    # 监控指标
    step_times: Dict[str, float]
    total_steps: int