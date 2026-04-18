import requests
import xml.etree.ElementTree as ET
from typing import List, Dict, Any
from datetime import datetime


class LiteratureSearcher:
    def __init__(self):
        self.arxiv_ns = {
            'atom': 'http://www.w3.org/2005/Atom',
            'arxiv': 'http://arxiv.org/schemas/atom'
        }

    def search_arxiv(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索arXiv论文 - 完整XML解析实现"""
        base_url = "http://export.arxiv.org/api/query"
        params = {
            "search_query": f"all:{query}",
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }

        try:
            response = requests.get(base_url, params=params, timeout=30)
            response.raise_for_status()

            # 解析XML响应
            root = ET.fromstring(response.content)
            papers = []

            # 遍历所有entry节点
            for entry in root.findall('atom:entry', self.arxiv_ns):
                paper = self._parse_arxiv_entry(entry)
                if paper:
                    papers.append(paper)

            return papers
        except ET.ParseError as e:
            print(f"ArXiv XML解析失败: {str(e)}")
            return []
        except requests.RequestException as e:
            print(f"ArXiv请求失败: {str(e)}")
            return []
        except Exception as e:
            print(f"ArXiv搜索失败: {str(e)}")
            return []

    def _parse_arxiv_entry(self, entry: ET.Element) -> Dict[str, Any]:
        """解析单个arXiv条目"""
        try:
            # 提取ID (格式: http://arxiv.org/abs/2401.12345)
            id_elem = entry.find('atom:id', self.arxiv_ns)
            if id_elem is None:
                return None
            
            arxiv_url = id_elem.text
            arxiv_id = arxiv_url.split('/abs/')[-1] if '/abs/' in arxiv_url else arxiv_url

            # 提取标题
            title_elem = entry.find('atom:title', self.arxiv_ns)
            title = title_elem.text.strip() if title_elem is not None else "Unknown Title"

            # 提取作者列表
            authors = []
            for author in entry.findall('atom:author', self.arxiv_ns):
                name_elem = author.find('atom:name', self.arxiv_ns)
                if name_elem is not None:
                    authors.append(name_elem.text)

            # 提取摘要
            summary_elem = entry.find('atom:summary', self.arxiv_ns)
            abstract = summary_elem.text.strip() if summary_elem is not None else ""

            # 提取发布日期
            published_elem = entry.find('atom:published', self.arxiv_ns)
            published = published_elem.text[:10] if published_elem is not None else ""

            # 提取更新日期
            updated_elem = entry.find('atom:updated', self.arxiv_ns)
            updated = updated_elem.text[:10] if updated_elem is not None else published

            # 提取分类/标签
            categories = []
            for category in entry.findall('atom:category', self.arxiv_ns):
                term = category.get('term')
                if term:
                    categories.append(term)

            # 提取PDF链接
            pdf_url = f"https://arxiv.org/pdf/{arxiv_id}.pdf"
            for link in entry.findall('atom:link', self.arxiv_ns):
                if link.get('title') == 'pdf':
                    pdf_url = link.get('href')
                    break

            # 提取主分类
            primary_category = entry.find('arxiv:primary_category', self.arxiv_ns)
            primary_cat = primary_category.get('term') if primary_category is not None else (categories[0] if categories else "")

            return {
                "id": f"arxiv:{arxiv_id}",
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "abstract": abstract,
                "published": published,
                "updated": updated,
                "categories": categories,
                "primary_category": primary_cat,
                "url": f"https://arxiv.org/abs/{arxiv_id}",
                "pdf_url": pdf_url
            }
        except Exception as e:
            print(f"解析arXiv条目失败: {str(e)}")
            return None

    def search_semantic_scholar(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """搜索Semantic Scholar"""
        base_url = "https://api.semanticscholar.org/graph/v1/paper/search"
        headers = {
            "x-api-key": "YOUR_SEMANTIC_SCHOLAR_API_KEY"  # 需要申请API密钥
        }
        params = {
            "query": query,
            "limit": max_results,
            "fields": "title,authors,abstract,url,venue,year,citationCount,influentialCitationCount"
        }

        try:
            response = requests.get(base_url, params=params, headers=headers)
            response.raise_for_status()

            data = response.json()
            papers = []
            for paper in data.get("data", []):
                papers.append({
                    "id": paper.get("paperId"),
                    "title": paper.get("title", ""),
                    "authors": [author.get("name", "") for author in paper.get("authors", [])],
                    "abstract": paper.get("abstract", ""),
                    "venue": paper.get("venue", ""),
                    "year": paper.get("year"),
                    "citation_count": paper.get("citationCount", 0),
                    "url": paper.get("url", "")
                })

            return papers
        except Exception as e:
            print(f"Semantic Scholar search failed: {str(e)}")
            return []