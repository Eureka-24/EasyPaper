import neo4j
from typing import Dict, Any, List


class StructuredMemory:
    def __init__(self, uri: str, username: str, password: str):
        self.driver = neo4j.GraphDatabase.driver(uri, auth=(username, password))

    def close(self):
        """关闭连接"""
        self.driver.close()

    def store_paper_relationships(self, paper_id: str, title: str, authors: List[str],
                                  references: List[str], citations: List[str]):
        """存储论文关系"""
        with self.driver.session() as session:
            # 创建论文节点
            session.run("""
                MERGE (p:Paper {paper_id: $paper_id})
                SET p.title = $title,
                    p.created_at = datetime()
            """, paper_id=paper_id, title=title)

            # 创建作者关系
            for author in authors:
                session.run("""
                    MERGE (a:Author {name: $author})
                    WITH a
                    MATCH (p:Paper {paper_id: $paper_id})
                    MERGE (a)-[:AUTHORED]->(p)
                """, author=author, paper_id=paper_id)

            # 创建引用关系
            for ref_id in references:
                session.run("""
                    MATCH (p1:Paper {paper_id: $paper_id}), (p2:Paper {paper_id: $ref_id})
                    MERGE (p1)-[:CITES]->(p2)
                """, paper_id=paper_id, ref_id=ref_id)

    def find_related_papers(self, paper_id: str, depth: int = 2) -> List[Dict[str, Any]]:
        """查找相关论文"""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (start:Paper {paper_id: $paper_id})
                MATCH path = (start)-[:CITES|:AUTHORED*..$depth]-(related:Paper)
                WHERE start.paper_id <> related.paper_id
                RETURN DISTINCT related.paper_id as paper_id,
                       related.title as title,
                       count(path) as distance
                ORDER BY distance
                LIMIT 10
            """, paper_id=paper_id, depth=depth)

            return [record.data() for record in result]