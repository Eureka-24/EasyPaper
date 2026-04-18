import re
import requests
from typing import Dict, Any, List


def extract_title(content: str) -> str:
    """从PDF内容中提取标题"""
    # 尝试多种标题提取模式
    patterns = [
        r'^\s*([A-Z][^.\n]{10,100})\s*\n\s*[A-Z]',  # 大写字母开头，后跟换行
        r'^\s*([A-Z].{10,100}?)(?:\n|\r\n)',  # 行首大写标题
        r'^\s*(.{10,100}?)(?:\n\s*\n|\r\n\s*\r\n)'  # 连续两行分隔的标题
    ]

    for pattern in patterns:
        match = re.search(pattern, content, re.MULTILINE)
        if match:
            title = match.group(1).strip()
            # 清理标题
            title = re.sub(r'\s+', ' ', title)
            if len(title) > 5 and len(title) < 200:
                return title

    return "Unknown Title"


def extract_authors(content: str) -> List[str]:
    """从PDF内容中提取作者"""
    # 查找作者部分（通常在标题之后几行）
    lines = content.split('\n')[:20]  # 只看前20行

    for i, line in enumerate(lines):
        # 寻找可能的作者行
        if '@' in line or 'email' in line.lower():
            # 从上一行开始查找作者名
            prev_line = lines[i - 1] if i > 0 else ''
            if prev_line.strip() and len(prev_line.strip()) < 200:
                authors = [name.strip() for name in prev_line.split(',') if name.strip()]
                return authors if authors else [prev_line.strip()]

    return ["Unknown Author"]


def extract_abstract(content: str) -> str:
    """提取摘要"""
    abstract_patterns = [
        r'(?:Abstract|ABSTRACT|abstract)[\s\n:]*([^.]*?\.)',
        r'(?:\n[A-Z][a-z]*\s[A-Z][a-z]*\n)(.*?)(?:\n[A-Z]{2,}\n)',
        r'(?:Introduction|INTRODUCTION).*?(?:\n[A-Z]{2,}\n)'
    ]

    for pattern in abstract_patterns:
        match = re.search(pattern, content, re.DOTALL | re.IGNORECASE)
        if match:
            abstract = match.group(1) if len(match.groups()) > 0 else match.group(0)
            abstract = re.sub(r'\s+', ' ', abstract.strip())
            if len(abstract) > 50:
                return abstract[:500]  # 限制长度

    return ""