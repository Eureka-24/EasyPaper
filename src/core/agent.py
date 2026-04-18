from langchain_deepseek import ChatDeepSeek
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
import time
from typing import Dict, Any
from .state import LiteratureAgentState
from ..tools.pdf_parser import PDFParser
from ..tools.literature_search import LiteratureSearcher
from ..tools.summary_gen import SummaryGenerator
from ..memory.short_term import ShortTermMemory
from ..memory.long_term import LongTermMemory
from ..config.settings import settings


class LiteratureSummarizerAgent:
    def __init__(self):
        # 初始化大模型
        self.llm = ChatDeepSeek(
            model=settings.DEEPSEEK_MODEL_NAME,
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS,
            api_key=settings.DEEPSEEK_API_KEY
        )

        # 初始化工具
        self.pdf_parser = PDFParser()
        self.literature_searcher = LiteratureSearcher()
        self.summary_generator = SummaryGenerator(self.llm)

        # 初始化记忆
        self.short_term_memory = ShortTermMemory(settings.CONVERSATION_WINDOW_SIZE)
        self.long_term_memory = LongTermMemory(settings.LANCEDB_URI)

        # 构建工作流
        self.agent = self._build_workflow()

    def _build_workflow(self):
        """构建Agent工作流"""
        workflow = StateGraph(LiteratureAgentState)

        # 添加节点
        workflow.add_node("fetch_paper", self._fetch_paper_node)
        workflow.add_node("parse_content", self._parse_content_node)
        workflow.add_node("generate_summary", self._generate_summary_node)
        workflow.add_node("store_memory", self._store_memory_node)
        workflow.add_node("error_handler", self._error_handler_node)

        # 设置入口点
        workflow.set_entry_point("fetch_paper")

        # 添加条件边 - 错误处理
        workflow.add_conditional_edges(
            "fetch_paper",
            self._should_continue,
            {"continue": "parse_content", "error": "error_handler"}
        )
        workflow.add_conditional_edges(
            "parse_content",
            self._should_continue,
            {"continue": "generate_summary", "error": "error_handler"}
        )
        workflow.add_conditional_edges(
            "generate_summary",
            self._should_continue,
            {"continue": "store_memory", "error": "error_handler"}
        )
        workflow.add_edge("store_memory", END)
        workflow.add_edge("error_handler", END)

        return workflow.compile()

    def _fetch_paper_node(self, state: LiteratureAgentState) -> Dict[str, Any]:
        """获取论文节点"""
        start_time = time.time()

        try:
            # 如果是arXiv ID，构建PDF URL
            if state["paper_id"].startswith("arxiv:"):
                arxiv_id = state["paper_id"].replace("arxiv:", "")
                pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"

                # 解析PDF
                paper_data = self.pdf_parser.parse_pdf_from_url(pdf_url)

                result = {
                    "paper_content": paper_data["full_text"],
                    "extracted_metadata": {
                        "title": paper_data["title"],
                        "authors": paper_data["authors"],
                        "abstract": paper_data["abstract"]
                    },
                    "step_times": {**state.get("step_times", {}), "fetch": time.time() - start_time}
                }

            else:
                # 本地文件或其他来源
                raise ValueError("Currently only supports arXiv papers")

        except Exception as e:
            result = {
                "error_message": str(e),
                "step_times": {**state.get("step_times", {}), "fetch": time.time() - start_time}
            }

        return result

    def _parse_content_node(self, state: LiteratureAgentState) -> Dict[str, Any]:
        """解析内容节点"""
        start_time = time.time()

        if state.get("error_message"):
            return {"step_times": {**state.get("step_times", {}), "parse": time.time() - start_time}}

        try:
            content = state["paper_content"]

            # 提取章节（简化版）
            sections = {
                "title": state["extracted_metadata"]["title"],
                "abstract": state["extracted_metadata"]["abstract"],
                "introduction": self._extract_section(content, ["Introduction", "INTRODUCTION"]),
                "methodology": self._extract_section(content, ["Method", "Methods", "METHOD", "METHODOLOGY"]),
                "results": self._extract_section(content, ["Results", "RESULTS", "Experiments", "EXPERIMENTS"]),
                "discussion": self._extract_section(content, ["Discussion", "DISCUSSION", "Conclusion", "CONCLUSION"])
            }

            result = {
                "parsed_sections": sections,
                "step_times": {**state.get("step_times", {}), "parse": time.time() - start_time}
            }

        except Exception as e:
            result = {
                "error_message": f"Parse error: {str(e)}",
                "step_times": {**state.get("step_times", {}), "parse": time.time() - start_time}
            }

        return result

    def _extract_section(self, content: str, keywords: list) -> str:
        """提取特定章节内容"""
        import re

        for keyword in keywords:
            pattern = rf'(?:\n|^)\s*{keyword}\s*(?:\n|\s*)(.*?)(?=\n\s*[A-Z][A-Z]+\s*\n|\n\s*[A-Z][a-z]*\s+[A-Z][a-z]*\s*\n|$)'
            match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
            if match:
                section = match.group(1).strip()
                if len(section) > 100:  # 至少100字符
                    return section[:1000]  # 限制长度

        return ""

    def _generate_summary_node(self, state: LiteratureAgentState) -> Dict[str, Any]:
        """生成摘要节点"""
        start_time = time.time()

        if state.get("error_message"):
            return {"step_times": {**state.get("step_times", {}), "summary": time.time() - start_time}}

        try:
            # 选择摘要类型
            summary_type = state.get("summary_type", "concise")

            paper_data = {
                "title": state["extracted_metadata"]["title"],
                "authors": state["extracted_metadata"]["authors"],
                "abstract": state["extracted_metadata"]["abstract"],
                "full_text": state["paper_content"]
            }

            if summary_type == "comprehensive":
                summary = self.summary_generator.generate_comprehensive_summary(paper_data)
            else:
                summary = self.summary_generator.generate_concise_summary(paper_data)

            # 计算质量分数（简化版）
            quality_score = self._calculate_quality_score(summary, paper_data["full_text"])

            result = {
                "summary": summary,
                "summary_type": summary_type,
                "quality_score": quality_score,
                "processing_time": time.time() - start_time,
                "step_times": {**state.get("step_times", {}), "summary": time.time() - start_time}
            }

        except Exception as e:
            result = {
                "error_message": f"Summary generation error: {str(e)}",
                "step_times": {**state.get("step_times", {}), "summary": time.time() - start_time}
            }

        return result

    def _calculate_quality_score(self, summary: str, original_text: str) -> float:
        """计算摘要质量分数（简化版）"""
        import re

        # 基本指标
        summary_length = len(summary.split())
        original_length = len(original_text.split())

        # 关键词覆盖率（简化）
        summary_words = set(re.findall(r'\w+', summary.lower()))
        original_words = set(re.findall(r'\w+', original_text.lower()))

        coverage = len(summary_words.intersection(original_words)) / len(original_words) if original_words else 0

        # 长度合理性
        length_ratio = summary_length / original_length if original_length > 0 else 0

        # 质量分数（0-1之间）
        score = min(1.0, (coverage * 0.6 + (1 - abs(length_ratio - 0.1)) * 0.4))

        return round(score, 2)

    def _store_memory_node(self, state: LiteratureAgentState) -> Dict[str, Any]:
        """存储记忆节点"""
        start_time = time.time()

        if state.get("error_message"):
            return {"step_times": {**state.get("step_times", {}), "memory": time.time() - start_time}}

        try:
            # 存储到长期记忆
            self.long_term_memory.store_summary(
                paper_id=state["paper_id"],
                title=state["extracted_metadata"]["title"],
                authors=", ".join(state["extracted_metadata"]["authors"]),
                year=2024,  # 从日期提取或默认值
                summary=state["summary"],
                summary_type=state["summary_type"],
                quality_score=state["quality_score"]
            )

            # 更新短期记忆
            self.short_term_memory.add_interaction(
                input_text=f"Summarized paper: {state['paper_id']}",
                output_text=state["summary"][:200]  # 存储摘要预览
            )

            result = {
                "step_times": {**state.get("step_times", {}), "memory": time.time() - start_time}
            }

        except Exception as e:
            result = {
                "error_message": f"Memory storage error: {str(e)}",
                "step_times": {**state.get("step_times", {}), "memory": time.time() - start_time}
            }

        return result

    def _should_continue(self, state: LiteratureAgentState) -> str:
        """判断工作流是否继续"""
        if state.get("error_message"):
            return "error"
        return "continue"

    def _error_handler_node(self, state: LiteratureAgentState) -> Dict[str, Any]:
        """错误处理节点"""
        error_msg = state.get("error_message", "Unknown error occurred")
        print(f"Agent Error: {error_msg}")
        return {"error": error_msg}

    def run(self, paper_id: str, summary_type: str = "concise") -> Dict[str, Any]:
        """运行Agent"""
        initial_state = {
            "paper_id": paper_id,
            "summary_type": summary_type,
            "step_times": {},
            "total_steps": 0
        }

        result = self.agent.invoke(initial_state)
        return result