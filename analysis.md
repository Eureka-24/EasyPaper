# PaperEasy 后端项目详细分析

## 项目概述

PaperEasy 是一个基于 LangChain + LangGraph + DeepSeek API 构建的学术论文智能摘要助手。项目采用分层架构设计，实现了论文搜索、PDF解析、智能摘要生成、记忆管理和监控告警等核心功能。

---

## 一、入口层 (src/main.py)

### 1.1 作用
作为整个应用的入口点，负责：
- 初始化 FastAPI Web 服务
- 配置 CORS 跨域支持
- 定义 RESTful API 接口
- 集成监控指标收集

### 1.2 关键实现步骤

#### 步骤1: 环境加载与依赖导入
```python
from dotenv import load_dotenv
load_dotenv()
```
**为什么这么做**: 使用 python-dotenv 加载环境变量，将敏感配置（如 API Key）与代码分离，符合 12-Factor App 原则。

#### 步骤2: FastAPI 应用初始化
```python
app = FastAPI(title="Literature Summarization Agent", version="1.0.0")
```
**为什么这么做**: FastAPI 提供高性能异步支持、自动 API 文档生成（/docs）、类型校验，适合构建现代 API 服务。

#### 步骤3: CORS 配置
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
**为什么这么做**: 前端 React 开发服务器运行在 5173 端口，需要配置跨域支持才能正常调用后端 API。

#### 步骤4: 全局组件初始化
```python
workflows = LiteratureWorkflows()
monitor = AgentMonitor(port=settings.MONITORING_PORT)
literature_searcher = LiteratureSearcher()
```
**为什么这么做**: 在应用启动时初始化核心组件，避免每次请求重复创建对象，提升性能。

#### 步骤5: 请求模型定义（Pydantic）
```python
class SummarizeRequest(BaseModel):
    paper_id: str
    summary_type: str = "concise"
    include_comparison: bool = False
```
**为什么这么做**: Pydantic 提供自动数据验证、序列化和文档生成，确保接口数据类型安全。

#### 步骤6: API 端点实现
- `POST /summarize`: 单篇论文摘要生成
- `POST /batch-summarize`: 批量论文摘要生成
- `POST /search`: 论文搜索（支持 arXiv 和 Semantic Scholar）
- `GET /search`: 搜索接口的 GET 版本（便于浏览器直接访问）
- `GET /metrics`: 获取监控指标

**为什么这么做**: 提供多种接口形式满足不同使用场景，如 GET /search 便于浏览器直接测试。

### 1.3 效果
- 提供标准化的 RESTful API 接口
- 支持异步处理，提高并发能力
- 自动数据验证和错误处理
- 集成监控指标收集

---

## 二、配置层 (src/config/settings.py)

### 2.1 作用
集中管理应用配置，支持从环境变量加载敏感信息。

### 2.2 关键实现步骤

#### 步骤1: 使用 Pydantic Settings
```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL_NAME: str = "deepseek-chat"
    LANCEDB_URI: str = "./data/lancedb"
    ...
```
**为什么这么做**: Pydantic Settings v2 提供类型安全的配置管理，自动从环境变量加载，支持默认值和验证。

#### 步骤2: 配置分类
- **API 配置**: DeepSeek API Key 和模型名称
- **数据库配置**: LanceDB 存储路径
- **记忆配置**: 对话窗口大小、Token 限制、温度参数
- **服务配置**: API 端口和监控端口

### 2.3 效果
- 配置与代码分离，便于不同环境部署
- 类型安全，减少配置错误
- 支持 .env 文件，开发体验友好

---

## 三、核心层 - 状态定义 (src/core/state.py)

### 3.1 作用
定义 LangGraph 工作流中传递的状态数据结构。

### 3.2 关键实现步骤

#### 步骤1: 使用 TypedDict 定义状态
```python
from typing import TypedDict

class LiteratureAgentState(TypedDict):
    paper_id: str
    paper_title: str
    paper_content: str
    parsed_sections: Dict[str, str]
    summary: str
    quality_score: float
    ...
```
**为什么这么做**: TypedDict 提供类型提示，同时保持字典的灵活性，适合 LangGraph 状态传递。

#### 步骤2: 状态字段分类设计
- **输入参数**: paper_id, paper_title, paper_content
- **中间状态**: parsed_sections, extracted_metadata, conversation_history
- **输出结果**: summary, quality_score, processing_time
- **错误处理**: error_message
- **记忆相关**: related_papers, comparison_results
- **监控指标**: step_times, total_steps

### 3.3 效果
- 清晰定义工作流中数据的流转结构
- 类型检查减少运行时错误
- 便于理解和维护工作流逻辑

---

## 四、核心层 - 智能体实现 (src/core/agent.py)

### 4.1 作用
实现论文摘要生成的核心智能体，基于 LangGraph 构建工作流。

### 4.2 关键实现步骤

#### 步骤1: LLM 初始化
```python
self.llm = ChatDeepSeek(
    model=settings.DEEPSEEK_MODEL_NAME,
    temperature=settings.TEMPERATURE,
    max_tokens=settings.MAX_TOKENS,
    api_key=settings.DEEPSEEK_API_KEY
)
```
**为什么这么做**: 使用 langchain-deepseek 集成 DeepSeek API，支持中文论文处理，性价比高。

#### 步骤2: 工具初始化
```python
self.pdf_parser = PDFParser()
self.literature_searcher = LiteratureSearcher()
self.summary_generator = SummaryGenerator(self.llm)
```
**为什么这么做**: 将功能拆分为独立工具类，符合单一职责原则，便于测试和复用。

#### 步骤3: 记忆系统初始化
```python
self.short_term_memory = ShortTermMemory(settings.CONVERSATION_WINDOW_SIZE)
self.long_term_memory = LongTermMemory(settings.LANCEDB_URI)
```
**为什么这么做**: 双记忆系统设计 - 短期记忆维护对话上下文，长期记忆存储历史摘要支持相似搜索。

#### 步骤4: LangGraph 工作流构建
```python
workflow = StateGraph(LiteratureAgentState)
workflow.add_node("fetch_paper", self._fetch_paper_node)
workflow.add_node("parse_content", self._parse_content_node)
workflow.add_node("generate_summary", self._generate_summary_node)
workflow.add_node("store_memory", self._store_memory_node)
workflow.add_node("error_handler", self._error_handler_node)
```
**为什么这么做**: LangGraph 提供状态机工作流编排，支持条件分支和错误处理，确保流程可靠性。

#### 步骤5: 条件边配置
```python
workflow.add_conditional_edges(
    "fetch_paper",
    self._should_continue,
    {"continue": "parse_content", "error": "error_handler"}
)
```
**为什么这么做**: 每个节点执行后检查是否有错误，有错误则跳转到错误处理节点，实现优雅的错误恢复。

#### 步骤6: 各节点实现

**fetch_paper 节点**:
- 支持 arXiv ID 格式（arxiv:xxx）
- 构建 PDF URL 并下载
- 调用 PDFParser 解析内容
- 记录执行时间

**parse_content 节点**:
- 提取论文各章节（Introduction, Method, Results, Discussion）
- 使用正则表达式匹配章节标题
- 限制章节内容长度避免 Token 超限

**generate_summary 节点**:
- 根据 summary_type 选择生成策略
- 调用 SummaryGenerator 生成摘要
- 计算质量分数

**store_memory 节点**:
- 存储到 LanceDB 长期记忆
- 更新短期记忆对话历史

**error_handler 节点**:
- 捕获并记录错误信息
- 返回错误状态

#### 步骤7: 质量分数计算
```python
def _calculate_quality_score(self, summary: str, original_text: str) -> float:
    # 关键词覆盖率 + 长度合理性
    coverage = len(summary_words.intersection(original_words)) / len(original_words)
    length_ratio = summary_length / original_length
    score = min(1.0, (coverage * 0.6 + (1 - abs(length_ratio - 0.1)) * 0.4))
```
**为什么这么做**: 基于关键词覆盖率和摘要长度比例计算质量分数，用于监控和筛选。

### 4.3 效果
- 工作流化设计确保处理流程标准化
- 错误处理机制提高系统健壮性
- 双记忆系统支持上下文理解和历史检索
- 质量评估提供反馈闭环

---

## 五、核心层 - 工作流编排 (src/core/workflows.py)

### 5.1 作用
封装高层业务逻辑，提供简洁的接口给 API 层调用。

### 5.2 关键实现步骤

#### 步骤1: 单篇论文处理
```python
async def process_single_paper(self, paper_id: str, summary_type: str = "concise") -> Dict[str, Any]:
    return self.agent.run(paper_id, summary_type)
```
**为什么这么做**: 异步接口支持并发处理，代理给 Agent 的 run 方法执行实际工作流。

#### 步骤2: 批量处理
```python
async def batch_process_papers(self, paper_ids: list, summary_type: str = "concise") -> Dict[str, Any]:
    results = {}
    for paper_id in paper_ids:
        try:
            result = await self.process_single_paper(paper_id, summary_type)
            results[paper_id] = result
        except Exception as e:
            results[paper_id] = {"error": str(e)}
    return {"batch_results": results, "total_processed": len(results)}
```
**为什么这么做**: 顺序处理每篇论文，单个失败不影响其他，返回完整处理结果。

#### 步骤3: 比较分析
```python
async def comparative_analysis(self, paper_ids: list) -> Dict[str, Any]:
    # 获取多篇论文摘要
    summaries = []
    for paper_id in paper_ids:
        result = await self.process_single_paper(paper_id, "concise")
        if "summary" in result:
            summaries.append({...})
    # 使用 LLM 进行比较
    comparison_result = self.agent.summary_generator.compare_papers(...)
```
**为什么这么做**: 先获取各论文摘要，再调用 LLM 进行综合分析，实现多篇论文对比。

### 5.3 效果
- 封装复杂业务逻辑，API 层调用简洁
- 支持批量处理和比较分析等高级功能
- 错误隔离，单点失败不影响整体

---

## 六、工具层 - 论文搜索 (src/tools/literature_search.py)

### 6.1 作用
提供多源论文搜索能力，支持 arXiv 和 Semantic Scholar。

### 6.2 关键实现步骤

#### 步骤1: arXiv 搜索实现
```python
def search_arxiv(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    base_url = "http://export.arxiv.org/api/query"
    params = {
        "search_query": f"all:{query}",
        "max_results": max_results,
        "sortBy": "relevance",
        "sortOrder": "descending"
    }
    response = requests.get(base_url, params=params, timeout=30)
```
**为什么这么做**: arXiv 提供免费的 API 接口，无需认证，适合快速集成。

#### 步骤2: XML 解析
```python
root = ET.fromstring(response.content)
for entry in root.findall('atom:entry', self.arxiv_ns):
    paper = self._parse_arxiv_entry(entry)
```
**为什么这么做**: arXiv 返回 Atom XML 格式，使用 ElementTree 解析提取结构化数据。

#### 步骤3: 数据字段提取
提取字段包括：
- 论文 ID、标题、作者列表
- 摘要、发布日期、更新日期
- 分类标签、PDF 链接

**为什么这么做**: 完整的元数据提取支持后续展示和下载。

#### 步骤4: Semantic Scholar 支持
```python
def search_semantic_scholar(self, query: str, max_results: int = 10) -> List[Dict[str, Any]]:
    headers = {"x-api-key": "YOUR_SEMANTIC_SCHOLAR_API_KEY"}
```
**为什么这么做**: 提供备选搜索源，Semantic Scholar 提供更丰富的引用数据。

### 6.3 效果
- 支持多源搜索，提高论文覆盖率
- 标准化返回格式，便于统一处理
- 完善的异常处理，网络问题不中断服务

---

## 七、工具层 - PDF 解析 (src/tools/pdf_parser.py)

### 7.1 作用
从 URL 或本地文件解析 PDF，提取文本和元数据。

### 7.2 关键实现步骤

#### 步骤1: 使用 PyPDF2
```python
from PyPDF2 import PdfReader
pdf_reader = PdfReader(io.BytesIO(response.content))
```
**为什么这么做**: PyPDF2 是纯 Python 实现，无需额外依赖，适合容器化部署。

#### 步骤2: 文本提取
```python
text = ""
for page in pdf_reader.pages:
    text += page.extract_text() + "\n"
```
**为什么这么做**: 逐页提取文本，保留页面分隔信息。

#### 步骤3: 元数据提取
```python
metadata = {
    "title": extract_title(text),
    "authors": extract_authors(text),
    "abstract": extract_abstract(text),
    "full_text": text,
    "page_count": len(pdf_reader.pages),
    "text_length": len(text)
}
```
**为什么这么做**: 调用 utils 模块的提取函数，从文本中解析标题、作者、摘要。

### 7.3 效果
- 支持 URL 和本地文件两种输入方式
- 提取完整文本和元数据
- 提供页面数和文本长度等统计信息

---

## 八、工具层 - 摘要生成 (src/tools/summary_gen.py)

### 8.1 作用
基于 LangChain 实现不同类型的摘要生成策略。

### 8.2 关键实现步骤

#### 步骤1: Prompt 模板设计
```python
prompt = ChatPromptTemplate.from_messages([
    ("system", """你是一位专业的学术研究助手。请为以下学术论文生成简洁的摘要..."""),
    ("human", "论文标题: {title}...")
])
```
**为什么这么做**: 使用 ChatPromptTemplate 定义系统提示词和用户输入模板，确保输出质量。

#### 步骤2: LangChain 链式调用
```python
chain = prompt | self.llm | StrOutputParser()
response = chain.invoke({...})
```
**为什么这么做**: 使用管道操作符（|）构建处理链，代码简洁且易于扩展。

#### 步骤3: 内容长度限制
```python
content = paper_data.get("full_text", "")[:2000]  # 简洁版限制 2000 字符
content = paper_data.get("full_text", "")[:4000]  # 详细版限制 4000 字符
```
**为什么这么做**: 控制输入长度避免 Token 超限，同时保留足够上下文。

#### 步骤4: 多类型摘要支持
- **concise**: 简洁摘要（200-300字），包含研究问题、方法、发现、意义
- **comprehensive**: 详细摘要，包含背景、相关工作、方法、实验、结论

#### 步骤5: 论文比较
```python
def compare_papers(self, papers: List[Dict[str, Any]]) -> str:
    prompt = ChatPromptTemplate.from_messages([
        ("system", "请比较以下多篇学术论文..."),
        ("human", "论文1: {paper1_title}...")
    ])
```
**为什么这么做**: 使用 LLM 进行多篇论文的综合比较分析。

### 8.3 效果
- 结构化 Prompt 确保输出质量
- 支持多种摘要类型满足不同需求
- 链式调用代码简洁可维护

---

## 九、工具层 - 工具函数 (src/tools/utils.py)

### 9.1 作用
提供文本处理的通用工具函数。

### 9.2 关键实现步骤

#### 步骤1: 标题提取
```python
def extract_title(content: str) -> str:
    patterns = [
        r'^\s*([A-Z][^.\n]{10,100})\s*\n\s*[A-Z]',
        r'^\s*([A-Z].{10,100}?)...'
    ]
```
**为什么这么做**: 使用多种正则模式匹配不同格式的标题，提高提取成功率。

#### 步骤2: 作者提取
```python
def extract_authors(content: str) -> List[str]:
    lines = content.split('\n')[:20]
    if '@' in line or 'email' in line.lower():
        prev_line = lines[i - 1] if i > 0 else ''
```
**为什么这么做**: 通过邮箱地址定位作者行，然后提取前一行作为作者信息。

#### 步骤3: 摘要提取
```python
def extract_abstract(content: str) -> str:
    abstract_patterns = [
        r'(?:Abstract|ABSTRACT|abstract)[\s\n:]*([^.]*?\.)',
        r'(?:\n[A-Z][a-z]*\s[A-Z][a-z]*\n)(.*?)...'
    ]
```
**为什么这么做**: 匹配 Abstract 关键字或章节格式提取摘要内容。

### 9.3 效果
- 从原始 PDF 文本中提取结构化元数据
- 多种模式匹配提高提取成功率
- 作为独立工具函数便于复用

---

## 十、记忆层 - 短期记忆 (src/memory/short_term.py)

### 10.1 作用
维护对话历史，支持上下文理解。

### 10.2 关键实现步骤

#### 步骤1: 使用双端队列
```python
from collections import deque
self.messages: deque = deque(maxlen=window_size * 2)
```
**为什么这么做**: deque 的 maxlen 特性自动实现滑动窗口，旧消息自动淘汰。

#### 步骤2: LangChain 消息类型
```python
from langchain_core.messages import HumanMessage, AIMessage
self.messages.append(HumanMessage(content=input_text))
self.messages.append(AIMessage(content=output_text))
```
**为什么这么做**: 使用 LangChain 标准消息类型，便于与 LangChain 链集成。

### 10.3 效果
- 自动维护最近 N 轮对话
- 支持上下文感知响应
- 内存占用可控

---

## 十一、记忆层 - 长期记忆 (src/memory/long_term.py)

### 11.1 作用
使用 LanceDB 向量数据库存储论文摘要，支持语义搜索。

### 11.2 关键实现步骤

#### 步骤1: LanceDB 连接
```python
import lancedb
self.db = lancedb.connect(db_path)
```
**为什么这么做**: LanceDB 是本地向量数据库，无需外部服务，适合单机部署。

#### 步骤2: Embedding 模型加载
```python
from langchain_community.embeddings import HuggingFaceEmbeddings
import torch
device = 'cuda' if torch.cuda.is_available() else 'cpu'
self.embeddings = HuggingFaceEmbeddings(
    model_name=local_model_path,
    model_kwargs={'device': device},
    encode_kwargs={'normalize_embeddings': True}
)
```
**为什么这么做**: 
- 使用本地 Embedding 模型（bge-small-zh-v1.5），无需网络调用
- 自动检测 GPU 加速
- 归一化向量便于相似度计算

#### 步骤3: 表结构定义
```python
import pyarrow as pa
schema = pa.schema([
    ("id", pa.string()),
    ("text", pa.string()),
    ("paper_id", pa.string()),
    ("title", pa.string()),
    ...
])
```
**为什么这么做**: 使用 PyArrow Schema 定义表结构，支持复杂数据类型。

#### 步骤4: 数据存储
```python
def store_summary(self, paper_id: str, title: str, ...):
    data = [{...}]
    df = pd.DataFrame(data)
    table.add(df.to_dict('records'))
```
**为什么这么做**: 使用 Pandas DataFrame 便于数据处理，转换为字典列表存储。

#### 步骤5: 向量搜索
```python
def search_similar(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
    results = table.search(query).limit(limit).to_list()
```
**为什么这么做**: LanceDB 内置向量搜索，自动使用 Embedding 模型转换查询。

### 11.3 效果
- 本地向量存储，无需外部依赖
- 支持语义相似搜索
- 持久化存储历史摘要

---

## 十二、记忆层 - 结构化记忆 (src/memory/structured.py)

### 12.1 作用
使用 Neo4j 图数据库存储论文关系（作者、引用）。

### 12.2 关键实现步骤

#### 步骤1: Neo4j 连接
```python
import neo4j
self.driver = neo4j.GraphDatabase.driver(uri, auth=(username, password))
```
**为什么这么做**: Neo4j 是成熟的图数据库，适合存储和查询复杂关系。

#### 步骤2: 关系建模
```python
def store_paper_relationships(self, paper_id: str, ...):
    # 创建论文节点
    session.run("MERGE (p:Paper {paper_id: $paper_id})...")
    # 创建作者关系
    session.run("MERGE (a:Author {name: $author})...")
    # 创建引用关系
    session.run("MATCH (p1:Paper {paper_id: $paper_id})...")
```
**为什么这么做**: 使用图模型表示论文-作者、论文-引用关系，支持复杂查询。

#### 步骤3: 关系查询
```python
def find_related_papers(self, paper_id: str, depth: int = 2):
    MATCH path = (start)-[:CITES|:AUTHORED*..$depth]-(related:Paper)
```
**为什么这么做**: 使用 Cypher 查询语言，支持多跳关系遍历发现相关论文。

### 12.3 效果
- 图结构存储论文关系网络
- 支持基于关系的论文推荐
- 可分析学术影响力路径

---

## 十三、评估层 - 监控 (src/evaluation/monitoring.py)

### 13.1 作用
使用 Prometheus 收集和暴露监控指标。

### 13.2 关键实现步骤

#### 步骤1: Prometheus 指标定义
```python
from prometheus_client import Counter, Histogram, Gauge

self.summary_generation_count = Counter(...)
self.summary_generation_time = Histogram(...)
self.quality_score_gauge = Gauge(...)
self.active_agents_gauge = Gauge(...)
```
**为什么这么做**: 使用 Prometheus 客户端库定义指标，支持多种指标类型。

#### 步骤2: 监控服务器启动
```python
def start_monitoring_server(self):
    def run_server():
        start_http_server(self.port)
    server_thread = threading.Thread(target=run_server, daemon=True)
```
**为什么这么做**: 在独立线程启动 HTTP 服务暴露指标，不阻塞主应用。

#### 步骤3: 指标记录
```python
def log_summary_generation(self, paper_id: str, ...):
    self.summary_generation_count.labels(status=status, summary_type=summary_type).inc()
    self.summary_generation_time.labels(summary_type=summary_type).observe(duration)
```
**为什么这么做**: 在 API 层调用记录指标，支持按状态、类型等维度统计。

### 13.3 效果
- 实时监控系统运行状态
- 支持 Grafana 可视化
- 便于性能调优和故障排查

---

## 十四、评估层 - 质量指标 (src/evaluation/quality_metrics.py)

### 14.1 作用
实现摘要质量评估算法。

### 14.2 关键实现步骤

#### 步骤1: ROUGE 分数计算
```python
def calculate_rouge_scores(self, generated: str, reference: str) -> Dict[str, float]:
    gen_words = set(generated.lower().split())
    ref_words = set(reference.lower().split())
    intersection = len(gen_words.intersection(ref_words))
    precision = intersection / len(gen_words) if gen_words else 0
    recall = intersection / len(ref_words) if ref_words else 0
```
**为什么这么做**: ROUGE 是文本摘要的标准评估指标，基于 n-gram 重叠计算。

#### 步骤2: BLEU 分数计算
```python
def calculate_bleu_score(self, generated: str, reference: str) -> float:
    common = set(gen_tokens).intersection(set(ref_tokens))
    bleu = len(common) / len(gen_tokens) if gen_tokens else 0
```
**为什么这么做**: BLEU 是机器翻译常用指标，也可用于评估摘要质量。

#### 步骤3: 连贯性评估
```python
def calculate_coherence_score(self, summary: str) -> float:
    sentences = summary.split('.')
    sentence_count = len([s for s in sentences if s.strip()])
    if 3 <= sentence_count <= 10:
        coherence = 0.8
```
**为什么这么做**: 基于句子数量判断摘要结构合理性。

#### 步骤4: 综合评分
```python
def evaluate_summary(self, generated_summary: str, reference_summary: str = None):
    if reference_summary:
        overall_score = (
            weights["rouge_f1"] * metrics["rouge_f1"] +
            weights["bleu_score"] * metrics["bleu_score"] +
            weights["coherence_score"] * metrics["coherence_score"]
        )
```
**为什么这么做**: 加权综合多个指标，提供统一的质量分数。

### 14.3 效果
- 量化评估摘要质量
- 支持有参考和无参考两种评估模式
- 历史记录便于趋势分析

---

## 十五、部署配置

### 15.1 Dockerfile

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc g++
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
EXPOSE 8000
CMD ["python", "-m", "src.main"]
```

**为什么这么做**:
- 使用 Python 3.11 slim 镜像减小体积
- 安装 gcc/g++ 编译依赖
- 分层构建缓存依赖安装
- 暴露 8000 端口提供服务

### 15.2 docker-compose.yml

```yaml
services:
  literature-agent:
    build: .
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
      - ./logs:/app/logs
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
  grafana:
    image: grafana/grafana-enterprise
    ports:
      - "3000:3000"
```

**为什么这么做**:
- 三服务编排：应用 + 监控 + 可视化
- 数据卷持久化 LanceDB 数据
- 端口映射便于本地访问

### 15.3 prometheus.yml

```yaml
scrape_configs:
  - job_name: 'literature-agent'
    static_configs:
      - targets: ['literature-agent:8000']
```

**为什么这么做**: 配置 Prometheus 抓取应用指标，使用服务名作为主机名（Docker 网络内）。

---

## 十六、依赖管理 (requirements.txt)

### 16.1 依赖分类

| 类别 | 依赖包 | 作用 |
|------|--------|------|
| LangChain 生态 | langchain, langchain-core, langgraph, langchain-deepseek | LLM 应用框架 |
| 向量数据库 | lancedb, pyarrow | 本地向量存储 |
| Embedding | torch, sentence-transformers | 文本向量化 |
| 文档处理 | PyPDF2 | PDF 解析 |
| Web 框架 | fastapi, uvicorn | API 服务 |
| 配置管理 | pydantic, pydantic-settings | 类型安全配置 |
| 监控 | prometheus-client | 指标收集 |

### 16.2 版本策略
- 使用 `>=` 允许小版本更新
- LangChain 生态统一使用 0.2.x 版本
- Pydantic 使用 v2 版本

---

## 十七、架构设计总结

### 17.1 分层架构

```
┌─────────────────────────────────────────────────────────────┐
│                    API 层 (main.py)                          │
│              FastAPI + CORS + 监控指标                        │
├─────────────────────────────────────────────────────────────┤
│                  工作流层 (workflows.py)                      │
│            单篇处理 / 批量处理 / 比较分析                      │
├─────────────────────────────────────────────────────────────┤
│                  智能体层 (agent.py)                          │
│         LangGraph 工作流: fetch → parse → summary → store    │
├─────────────────────────────────────────────────────────────┤
│                   工具层 (tools/)                             │
│      论文搜索 / PDF解析 / 摘要生成 / 工具函数                  │
├─────────────────────────────────────────────────────────────┤
│                   记忆层 (memory/)                            │
│      短期记忆(滑动窗口) / 长期记忆(LanceDB) / 结构化(Neo4j)    │
├─────────────────────────────────────────────────────────────┤
│                  评估层 (evaluation/)                         │
│           Prometheus监控 / ROUGE-BLEU质量评估                  │
├─────────────────────────────────────────────────────────────┤
│                  配置层 (config/)                             │
│              Pydantic Settings 环境变量管理                    │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 设计亮点

1. **工作流编排**: 使用 LangGraph 实现状态机工作流，支持错误恢复和条件分支
2. **双记忆系统**: 短期记忆维护上下文，长期记忆支持语义搜索
3. **多源搜索**: 支持 arXiv 和 Semantic Scholar，提高论文覆盖率
4. **质量评估**: 内置 ROUGE/BLEU 评估，支持监控和质量反馈
5. **容器化部署**: Docker Compose 一键启动完整环境

### 17.3 可改进点

1. **异步优化**: PDF 解析和 Embedding 计算可进一步优化异步性能
2. **缓存机制**: 可添加 Redis 缓存热门论文摘要
3. **并发控制**: 批量处理可引入并发限制避免资源耗尽
4. **测试覆盖**: 当前测试目录为空，需补充单元测试和集成测试
