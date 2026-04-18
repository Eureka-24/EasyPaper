import lancedb
from typing import List, Dict, Any
import uuid
from datetime import datetime
import os


class LongTermMemory:
    def __init__(self, db_path: str, embedding_model: str = None):
        self.db = lancedb.connect(db_path)
        
        # 尝试加载 Embedding 模型（可选）
        self.embeddings = None
        try:
            from langchain_community.embeddings import HuggingFaceEmbeddings
            
            # 检测是否有 CUDA (NVIDIA GPU)
            import torch
            device = 'cuda' if torch.cuda.is_available() else 'cpu'
            print(f"Using device: {device} for embeddings")
            
            # 优先使用本地模型
            local_model_path = "./models/bge-small-zh-v1.5"
            if os.path.exists(local_model_path):
                print(f"Loading local model from: {local_model_path}")
                model_name = local_model_path
            else:
                print(f"Local model not found at {local_model_path}, embedding search disabled")
                model_name = None
            
            if model_name:
                self.embeddings = HuggingFaceEmbeddings(
                    model_name=model_name,
                    model_kwargs={'device': device},
                    encode_kwargs={'normalize_embeddings': True}
                )
        except Exception as e:
            print(f"Embedding model loading failed: {e}")
            print("Running without embedding search")

        # 初始化向量表
        self.table_name = "literature_summaries"
        if self.table_name not in self.db.table_names():
            self._create_table()

    def _create_table(self):
        """创建向量表"""
        import pyarrow as pa
        
        schema = pa.schema([
            ("id", pa.string()),
            ("text", pa.string()),
            ("paper_id", pa.string()),
            ("title", pa.string()),
            ("authors", pa.string()),
            ("year", pa.int32()),
            ("summary_type", pa.string()),
            ("created_at", pa.string()),
            ("quality_score", pa.float64())
        ])
        self.db.create_table(self.table_name, schema=schema)

    def store_summary(self, paper_id: str, title: str, authors: str, year: int,
                      summary: str, summary_type: str, quality_score: float):
        """存储摘要到长期记忆"""
        import pandas as pd

        data = [{
            "id": str(uuid.uuid4()),
            "text": summary,
            "paper_id": paper_id,
            "title": title,
            "authors": authors,
            "year": year,
            "summary_type": summary_type,
            "created_at": datetime.now().isoformat(),
            "quality_score": quality_score
        }]

        df = pd.DataFrame(data)
        table = self.db.open_table(self.table_name)
        table.add(df.to_dict('records'))

    def search_similar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """搜索相似的文献摘要"""
        if self.embeddings is None:
            print("Warning: Embedding model not loaded, returning empty results")
            return []
        
        table = self.db.open_table(self.table_name)

        # 使用向量搜索
        results = table.search(query).limit(limit).to_list()
        return results

    def get_by_paper_id(self, paper_id: str) -> List[Dict[str, Any]]:
        """根据论文ID获取摘要"""
        table = self.db.open_table(self.table_name)
        results = table.where(f"paper_id = '{paper_id}'").to_list()
        return results