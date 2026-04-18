import asyncio
import os
import time
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from .core.workflows import LiteratureWorkflows
from .evaluation.monitoring import AgentMonitor
from .evaluation.quality_metrics import QualityMetrics
from .config.settings import settings
from .tools.literature_search import LiteratureSearcher
from .memory.long_term import LongTermMemory
from .memory.short_term import ShortTermMemory

load_dotenv()

app = FastAPI(title="Literature Summarization Agent", version="1.0.0")

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # 前端开发服务器地址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化组件
workflows = LiteratureWorkflows()
monitor = AgentMonitor(port=settings.MONITORING_PORT)
literature_searcher = LiteratureSearcher()
quality_evaluator = QualityMetrics()
long_term_memory = LongTermMemory(settings.LANCEDB_URI)
short_term_memory = ShortTermMemory(settings.CONVERSATION_WINDOW_SIZE)


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


class ChatRequest(BaseModel):
    paper_id: str
    question: str
    conversation_id: Optional[str] = None


class SimilarPapersRequest(BaseModel):
    query: str
    limit: int = 5


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

        # 进行质量评价并反馈到监控
        if "summary" in result and "paper_content" in result:
            evaluation = quality_evaluator.evaluate_summary(
                generated_summary=result["summary"],
                reference_summary=result.get("reference_summary")
            )
            # 将评价结果反馈到监控
            monitor.log_evaluation_metrics(evaluation)
            # 将评价结果添加到返回结果中
            result["evaluation_metrics"] = evaluation

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
        batch_results = result.get("batch_results", {})
        valid_results = [r for r in batch_results.values() if isinstance(r, dict) and "quality_score" in r]
        avg_quality = sum(r.get("quality_score", 0) for r in valid_results) / len(valid_results) if valid_results else 0

        monitor.log_summary_generation(
            paper_id="batch",
            summary_type=request.summary_type,
            quality_score=avg_quality,
            duration=duration
        )

        # 对每篇论文进行质量评价并反馈到监控
        for paper_id, paper_result in batch_results.items():
            if isinstance(paper_result, dict) and "summary" in paper_result:
                evaluation = quality_evaluator.evaluate_summary(
                    generated_summary=paper_result["summary"],
                    reference_summary=paper_result.get("reference_summary")
                )
                # 将评价结果反馈到监控
                monitor.log_evaluation_metrics(evaluation)
                # 将评价结果添加到返回结果中
                paper_result["evaluation_metrics"] = evaluation

        # 更新返回结果
        result["total_processed"] = len(batch_results)
        result["total_failed"] = sum(1 for r in batch_results.values() if isinstance(r, dict) and "error" in r)

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


# ==================== 记忆系统API ====================

@app.get("/memory/history")
async def get_history(limit: int = 50, offset: int = 0, days: Optional[int] = None):
    """获取历史摘要记录
    
    Args:
        limit: 返回记录数量限制
        offset: 偏移量（用于分页）
        days: 可选，只返回最近N天的记录
    """
    try:
        if days:
            results = long_term_memory.get_recent_summaries(days=days, limit=limit)
        else:
            results = long_term_memory.get_all_summaries(limit=limit, offset=offset)
        
        return {
            "total": len(results),
            "records": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取历史记录失败: {str(e)}")


@app.get("/memory/statistics")
async def get_memory_statistics():
    """获取记忆库统计信息"""
    try:
        stats = long_term_memory.get_statistics()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@app.post("/memory/similar")
async def find_similar_papers(request: SimilarPapersRequest):
    """搜索相似论文（基于向量相似度）"""
    try:
        results = long_term_memory.search_similar(
            query=request.query,
            limit=request.limit
        )
        return {
            "query": request.query,
            "total": len(results),
            "papers": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"相似论文搜索失败: {str(e)}")


@app.get("/memory/similar")
async def find_similar_papers_get(query: str, limit: int = 5):
    """搜索相似论文 (GET方式)"""
    request = SimilarPapersRequest(query=query, limit=limit)
    return await find_similar_papers(request)


@app.post("/chat")
async def chat_with_paper(request: ChatRequest):
    """与论文进行对话式交互
    
    基于短期记忆维护对话上下文，支持对论文内容的追问
    """
    try:
        # 获取论文信息
        paper_records = long_term_memory.get_by_paper_id(request.paper_id)
        if not paper_records:
            raise HTTPException(status_code=404, detail="未找到该论文的摘要记录")
        
        paper_info = paper_records[0]
        
        # 将当前问题添加到短期记忆
        short_term_memory.add_interaction(
            input_text=f"关于论文 '{paper_info['title']}' 的问题: {request.question}",
            output_text=""  # 将在生成回复后更新
        )
        
        # 获取对话历史
        conversation_history = short_term_memory.get_history()
        
        # 使用LLM生成回复（基于论文内容和对话历史）
        from langchain_deepseek import ChatDeepSeek
        from langchain_core.prompts import ChatPromptTemplate
        
        llm = ChatDeepSeek(
            model=settings.DEEPSEEK_MODEL_NAME,
            temperature=0.7,
            api_key=settings.DEEPSEEK_API_KEY
        )
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是一个专业的学术助手，正在帮助用户理解一篇论文。
            论文标题: {title}
            论文摘要: {summary}
            
            请基于论文内容回答用户的问题。如果问题超出论文范围，请明确说明。
            保持回答简洁、专业、准确。"""),
            *[(msg.type, msg.content) for msg in conversation_history[-6:]],  # 最近3轮对话
            ("human", "{question}")
        ])
        
        chain = prompt | llm
        response = await chain.ainvoke({
            "title": paper_info['title'],
            "summary": paper_info['text'],
            "question": request.question
        })
        
        # 更新短期记忆中的回复
        short_term_memory.add_interaction(
            input_text=request.question,
            output_text=response.content
        )
        
        return {
            "paper_id": request.paper_id,
            "paper_title": paper_info['title'],
            "question": request.question,
            "answer": response.content,
            "conversation_history": [
                {"role": "user" if msg.type == "human" else "assistant", "content": msg.content}
                for msg in conversation_history[-6:]
            ]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"对话处理失败: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    # 更新活跃Agent数量
    monitor.update_active_agents(1)

    # 启动API服务
    uvicorn.run(app, host="0.0.0.0", port=settings.API_PORT)