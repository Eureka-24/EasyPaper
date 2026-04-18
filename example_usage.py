import asyncio
from src.main import app
from src.core.workflows import LiteratureWorkflows


async def main():
    workflows = LiteratureWorkflows()

    # 单篇论文摘要
    result = await workflows.process_single_paper(
        paper_id="arxiv:2401.00001",
        summary_type="concise"
    )
    print("Single paper summary:", result["summary"][:200])

    # 批量处理
    batch_result = await workflows.batch_process_papers([
        "arxiv:2401.00001",
        "arxiv:2401.00002",
        "arxiv:2401.00003"
    ])
    print(f"Processed {batch_result['total_processed']} papers")

    # 比较分析
    comparison_result = await workflows.comparative_analysis([
        "arxiv:2401.00001",
        "arxiv:2401.00002"
    ])
    print("Comparison summary:", comparison_result["comparison_summary"][:300])


if __name__ == "__main__":
    asyncio.run(main())