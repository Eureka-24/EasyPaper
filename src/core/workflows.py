from typing import Dict, Any
from .state import LiteratureAgentState
from .agent import LiteratureSummarizerAgent


class LiteratureWorkflows:
    def __init__(self):
        self.agent = LiteratureSummarizerAgent()

    async def process_single_paper(self, paper_id: str, summary_type: str = "concise") -> Dict[str, Any]:
        """处理单篇论文"""
        return self.agent.run(paper_id, summary_type)

    async def batch_process_papers(self, paper_ids: list, summary_type: str = "concise") -> Dict[str, Any]:
        """批量处理多篇论文"""
        results = {}
        for paper_id in paper_ids:
            try:
                result = await self.process_single_paper(paper_id, summary_type)
                results[paper_id] = result
            except Exception as e:
                results[paper_id] = {"error": str(e)}

        return {"batch_results": results, "total_processed": len(results)}

    async def comparative_analysis(self, paper_ids: list) -> Dict[str, Any]:
        """论文比较分析"""
        # 获取多篇论文的摘要
        summaries = []
        for paper_id in paper_ids:
            result = await self.process_single_paper(paper_id, "concise")
            if "summary" in result:
                summaries.append({
                    "paper_id": paper_id,
                    "summary": result["summary"]
                })

        # 使用大模型进行比较
        comparison_result = self.agent.summary_generator.compare_papers([
            {"title": s["paper_id"], "abstract": s["summary"]} for s in summaries
        ])

        return {
            "comparison_summary": comparison_result,
            "individual_summaries": summaries
        }