from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # DeepSeek API配置
    DEEPSEEK_API_KEY: str = ""
    DEEPSEEK_MODEL_NAME: str = "deepseek-chat"

    # 向量数据库配置
    LANCEDB_URI: str = "./data/lancedb"
    EMBEDDING_MODEL: str = "text-embedding-3-small"

    # 记忆配置
    CONVERSATION_WINDOW_SIZE: int = 8
    MAX_TOKENS: int = 4000
    TEMPERATURE: float = 0.3

    # 服务端口配置
    API_PORT: int = 8888
    MONITORING_PORT: int = 9090

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()