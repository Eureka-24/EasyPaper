from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from typing import List, Dict, Any
from collections import deque


class ShortTermMemory:
    """基于双端队列的短期记忆实现（滑动窗口）"""
    
    def __init__(self, window_size: int = 8):
        self.window_size = window_size
        # 使用双端队列存储消息对 (input, output)
        self.messages: deque = deque(maxlen=window_size * 2)
    
    def add_interaction(self, input_text: str, output_text: str):
        """添加对话交互"""
        self.messages.append(HumanMessage(content=input_text))
        self.messages.append(AIMessage(content=output_text))
    
    def get_history(self) -> List[BaseMessage]:
        """获取对话历史"""
        return list(self.messages)
    
    def clear_history(self):
        """清空历史记录"""
        self.messages.clear()
