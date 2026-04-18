# PaperEasy - 学术论文智能摘要助手

基于 LangChain + LangGraph + DeepSeek API 构建的学术论文摘要生成智能体，支持 arXiv 论文搜索、PDF 解析和智能摘要生成。

## 功能特性

### 核心功能
- **论文搜索**: 支持 arXiv 和 Semantic Scholar 论文检索
- **PDF 解析**: 自动提取论文标题、作者、摘要和章节内容
- **智能摘要**: 生成简洁版或详细版论文摘要
- **批量处理**: 支持多篇论文批量摘要生成
- **比较分析**: 多篇论文对比分析

### 技术特性
- **记忆管理**: 长期记忆（LanceDB 向量存储）+ 短期记忆（对话窗口）
- **工作流编排**: LangGraph 状态机实现可靠的任务流程
- **监控告警**: Prometheus + Grafana 指标监控
- **错误处理**: 完善的异常捕获和错误恢复机制

## 技术栈

| 组件 | 技术 |
|------|------|
| LLM 引擎 | DeepSeek API (deepseek-chat) |
| 工作流框架 | LangGraph + LangChain |
| 向量数据库 | LanceDB |
| Embedding | HuggingFace (all-MiniLM-L6-v2) |
| Web 框架 | FastAPI |
| 监控 | Prometheus + Grafana |
| 部署 | Docker Compose |

## 项目结构

```
PaperEasy/
├── src/
│   ├── core/           # 智能体核心
│   │   ├── agent.py    # 论文摘要智能体
│   │   ├── state.py    # 状态定义
│   │   └── workflows.py # 工作流编排
│   ├── tools/          # 研究工具集
│   │   ├── literature_search.py  # 论文搜索
│   │   ├── pdf_parser.py         # PDF 解析
│   │   ├── summary_gen.py        # 摘要生成
│   │   └── utils.py              # 工具函数
│   ├── memory/         # 记忆管理
│   │   ├── short_term.py  # 短期记忆
│   │   └── long_term.py   # 长期记忆
│   ├── evaluation/     # 效果评估
│   │   ├── monitoring.py      # 监控指标
│   │   └── quality_metrics.py # 质量评估
│   ├── config/         # 配置管理
│   │   └── settings.py
│   └── main.py         # FastAPI 入口
├── tests/              # 测试目录
├── docker-compose.yml  # Docker 编排
├── Dockerfile          # 镜像构建
├── prometheus.yml      # 监控配置
├── requirements.txt    # Python 依赖
└── .env.example        # 环境变量示例
```

## 快速开始

### 1. 环境准备

复制环境变量文件并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
DEEPSEEK_API_KEY=sk-your-api-key-here
DEEPSEEK_MODEL_NAME=deepseek-chat
LANCEDB_URI=./data/lancedb
CONVERSATION_WINDOW_SIZE=8
MAX_TOKENS=4000
TEMPERATURE=0.3
MONITORING_PORT=8000
```

### 2. Docker 启动（推荐）

```bash
docker-compose up -d
```

### 3. 本地启动

```bash
# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
python -m src.main
```

## API 接口

### 论文搜索

**GET /search**
```bash
curl "http://localhost:8000/search?query=machine+learning&source=arxiv&max_results=5"
```

**POST /search**
```bash
curl -X POST "http://localhost:8000/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "deep learning",
    "source": "arxiv",
    "max_results": 10
  }'
```

### 单篇论文摘要

**POST /summarize**
```bash
curl -X POST "http://localhost:8000/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "paper_id": "arxiv:2401.12345",
    "summary_type": "comprehensive"
  }'
```

参数说明：
- `paper_id`: 论文 ID（支持 arxiv:xxx 格式）
- `summary_type`: 摘要类型，`concise`（简洁）或 `comprehensive`（详细）

### 批量论文摘要

**POST /batch-summarize**
```bash
curl -X POST "http://localhost:8000/batch-summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "paper_ids": ["arxiv:2401.12345", "arxiv:2401.12346"],
    "summary_type": "concise"
  }'
```

### 监控指标

**GET /metrics**
```bash
curl "http://localhost:8000/metrics"
```

## 服务端口

| 服务 | 端口 | 访问地址 |
|------|------|----------|
| 主服务 | 8000 | http://localhost:8000 |
| Prometheus | 9090 | http://localhost:9090 |
| Grafana | 3000 | http://localhost:3000 |

## 工作流说明

论文摘要生成的工作流：

```
fetch_paper → parse_content → generate_summary → store_memory → END
     ↓              ↓               ↓
error_handler ←←←←←←←←←←←←←←←←←←←←
```

1. **fetch_paper**: 从 arXiv 获取 PDF
2. **parse_content**: 解析 PDF 内容，提取章节
3. **generate_summary**: 调用 LLM 生成摘要
4. **store_memory**: 存储到长期记忆
5. **error_handler**: 错误处理和恢复

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| DEEPSEEK_API_KEY | DeepSeek API 密钥 | 必填 |
| DEEPSEEK_MODEL_NAME | 模型名称 | deepseek-chat |
| LANCEDB_URI | 向量数据库路径 | ./data/lancedb |
| CONVERSATION_WINDOW_SIZE | 短期记忆窗口大小 | 8 |
| MAX_TOKENS | LLM 最大输出 token | 4000 |
| TEMPERATURE | 生成温度 | 0.3 |
| MONITORING_PORT | 监控端口 | 8000 |

### Docker 卷映射

- `./data:/data` - LanceDB 数据持久化
- `./logs:/app/logs` - 应用日志
- `./prometheus.yml:/etc/prometheus/prometheus.yml` - 监控配置

## 开发计划

- [x] 基础工作流实现
- [x] arXiv 论文搜索（XML 解析）
- [x] PDF 解析和章节提取
- [x] 长期/短期记忆管理
- [x] RESTful API 接口
- [x] Prometheus 监控
- [ ] Semantic Scholar API Key 配置
- [ ] 单元测试覆盖
- [ ] 质量评估算法优化
- [ ] 支持更多论文来源

## 许可证

MIT License
