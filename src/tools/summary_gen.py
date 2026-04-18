from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from typing import Dict, Any, List


class SummaryGenerator:
    def __init__(self, llm):
        self.llm = llm

    def generate_concise_summary(self, paper_data: Dict[str, Any]) -> str:
        """生成简洁摘要"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是一位专业的学术研究助手。请为以下学术论文生成简洁的摘要，包含：
            1. 研究问题和目标
            2. 主要方法或技术
            3. 关键发现或结果
            4. 研究意义

            保持学术严谨性，字数控制在200-300字。"""),
            ("human", """
            论文标题: {title}
            作者: {authors}
            摘要: {abstract}
            正文内容: {content}
            """)
        ])

        chain = prompt | self.llm | StrOutputParser()

        content = paper_data.get("full_text", "")[:2000]  # 限制长度

        response = chain.invoke({
            "title": paper_data.get("title", ""),
            "authors": ", ".join(paper_data.get("authors", [])),
            "abstract": paper_data.get("abstract", ""),
            "content": content
        })

        return response

    def generate_comprehensive_summary(self, paper_data: Dict[str, Any]) -> str:
        """生成详细摘要"""
        prompt = ChatPromptTemplate.from_messages([
            ("system", """你是一位专业的学术研究助手。请为以下学术论文生成全面的摘要，包含：
            1. 研究背景和问题陈述
            2. 相关工作回顾
            3. 研究方法和技术细节
            4. 实验设置和数据集
            5. 主要实验结果和分析
            6. 结论和未来工作方向

            保持学术严谨性，结构化输出。"""),
            ("human", """
            论文标题: {title}
            作者: {authors}
            摘要: {abstract}
            正文内容: {content}
            """)
        ])

        chain = prompt | self.llm | StrOutputParser()

        content = paper_data.get("full_text", "")[:4000]  # 更长的内容

        response = chain.invoke({
            "title": paper_data.get("title", ""),
            "authors": ", ".join(paper_data.get("authors", [])),
            "abstract": paper_data.get("abstract", ""),
            "content": content
        })

        return response

    def compare_papers(self, papers: List[Dict[str, Any]]) -> str:
        """比较多篇论文"""
        if len(papers) < 2:
            return "需要至少两篇论文进行比较"

        prompt = ChatPromptTemplate.from_messages([
            ("system", """请比较以下多篇学术论文，分析它们的：
            1. 研究主题和问题的异同
            2. 方法论的差异
            3. 主要发现的对比
            4. 技术贡献的优劣
            5. 未来发展方向的思考"""),
            ("human", """
            论文1: {paper1_title} - {paper1_abstract}
            论文2: {paper2_title} - {paper2_abstract}
            论文3: {paper3_title} - {paper3_abstract}
            """)
        ])

        chain = prompt | self.llm | StrOutputParser()

        response = chain.invoke({
            "paper1_title": papers[0].get("title", ""),
            "paper1_abstract": papers[0].get("abstract", ""),
            "paper2_title": papers[1].get("title", ""),
            "paper2_abstract": papers[1].get("abstract", ""),
            "paper3_title": papers[2].get("title", "") if len(papers) > 2 else "",
            "paper3_abstract": papers[2].get("abstract", "") if len(papers) > 2 else ""
        })

        return response