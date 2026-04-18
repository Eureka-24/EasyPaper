import asyncio
import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from .core.workflows import LiteratureWorkflows
from .evaluation.monitoring import AgentMonitor
from .config.settings import settings
from .tools.literature_search import LiteratureSearcher

load_dotenv()

app = FastAPI(title="Literature Summarization Agent", version="1.0.0")

# 初始化组件
workflows = LiteratureWorkflows()
monitor = AgentMonitor(port=settings.MONITORING_PORT)
literature_searcher = LiteratureSearcher()


class SummarizeRequest(BaseModel):
    paper_id: str
    summary_type: str = "concise"  # "concise" or "comprehensive"
    include_comparison: bool = False


class BatchSummarizeRequest(BaseModel):
    paper_ids: List[str]
    summary_type: str = "concise"


class SearchRequest(BaseModel):
    query: str
    source: str = "arxiv"  # "arxiv" or "semantic_scholar"
    max_results: int = 10


@app.post("/summarize")
async def summarize_paper(request: SummarizeRequest):
    """单篇论文摘要生成"""
    try:
        start_time = time.time()

        # 执行摘要生成
        result = await workflows.process_single_paper(
            request.paper_id,
            request.summary_type
        )

        duration = time.time() - start_time

        # 记录监控指标
        quality_score = result.get("quality_score", 0.0)
        monitor.log_summary_generation(
            paper_id=request.paper_id,
            summary_type=request.summary_type,
            quality_score=quality_score,
            duration=duration
        )

        return result

    except Exception as e:
        monitor.log_summary_generation(
            paper_id=request.paper_id,
            summary_type=request.summary_type,
            quality_score=0.0,
            duration=time.time() - start_time if 'start_time' in locals() else 0,
            status="error"
        )
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/batch-summarize")
async def batch_summarize(request: BatchSummarizeRequest):
    """批量论文摘要生成"""
    try:
        start_time = time.time()

        result = await workflows.batch_process_papers(
            request.paper_ids,
            request.summary_type
        )

        duration = time.time() - start_time

        # 记录平均指标
        avg_quality = sum(
            r.get("quality_score", 0) for r in result.get("batch_results", {}).values()
            if isinstance(r, dict) and "quality_score" in r
        ) / len(result.get("batch_results", {}))

        monitor.log_summary_generation(
            paper_id="batch",
            summary_type=request.summary_type,
            quality_score=avg_quality,
            duration=duration
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/metrics")
async def get_metrics():
    """获取监控指标"""
    return monitor.get_metrics_report()


@app.post("/search")
async def search_papers(request: SearchRequest):
    """搜索论文
    
    支持arXiv和Semantic Scholar搜索
    - arXiv: 无需API Key，直接搜索
    - semantic_scholar: 需要配置API Key
    """
    try:
        start_time = time.time()
        
        if request.source == "arxiv":
            results = literature_searcher.search_arxiv(
                query=request.query,
                max_results=request.max_results
            )
        elif request.source == "semantic_scholar":
            results = literature_searcher.search_semantic_scholar(
                query=request.query,
                max_results=request.max_results
            )
        else:
            raise HTTPException(
                status_code=400, 
                detail=f"不支持的搜索源: {request.source}"
            )
        
        duration = time.time() - start_time
        
        return {
            "query": request.query,
            "source": request.source,
            "total_results": len(results),
            "search_time": round(duration, 2),
            "papers": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"搜索失败: {str(e)}")


@app.get("/search")
async def search_papers_get(
    query: str,
    source: str = "arxiv",
    max_results: int = 10
):
    """搜索论文 (GET方式，便于浏览器直接访问)"""
    request = SearchRequest(
        query=query,
        source=source,
        max_results=max_results
    )
    return await search_papers(request)


if __name__ == "__main__":
    import uvicorn

    # 更新活跃Agent数量
    monitor.update_active_agents(1)

    # 启动API服务
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)