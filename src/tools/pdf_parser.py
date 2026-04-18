from PyPDF2 import PdfReader
import io
import requests
from typing import Dict, Any
from .utils import extract_title, extract_authors, extract_abstract


class PDFParser:
    def __init__(self):
        pass

    def parse_pdf_from_url(self, url: str) -> Dict[str, Any]:
        """从URL解析PDF"""
        try:
            response = requests.get(url)
            response.raise_for_status()

            # 解析PDF
            pdf_reader = PdfReader(io.BytesIO(response.content))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"

            # 提取元数据
            metadata = {
                "title": extract_title(text),
                "authors": extract_authors(text),
                "abstract": extract_abstract(text),
                "full_text": text,
                "page_count": len(pdf_reader.pages),
                "text_length": len(text)
            }

            return metadata
        except Exception as e:
            raise Exception(f"PDF parsing failed: {str(e)}")

    def parse_local_pdf(self, file_path: str) -> Dict[str, Any]:
        """解析本地PDF文件"""
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PdfReader(file)
                text = ""
                for page in pdf_reader.pages:
                    text += page.extract_text() + "\n"

                metadata = {
                    "title": extract_title(text),
                    "authors": extract_authors(text),
                    "abstract": extract_abstract(text),
                    "full_text": text,
                    "page_count": len(pdf_reader.pages),
                    "text_length": len(text)
                }

                return metadata
        except Exception as e:
            raise Exception(f"Local PDF parsing failed: {str(e)}")