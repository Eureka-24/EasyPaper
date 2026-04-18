import { useState, useRef, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ChatMessage } from '../types';
import { Send, Bot, User, Loader2, MessageCircle } from 'lucide-react';

interface ChatPanelProps {
  paperId: string;
  paperTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatPanel({ paperId, paperTitle, isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const question = input.trim();
    setInput('');
    
    // 添加用户消息
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const response = await apiService.chatWithPaper({
        paper_id: paperId,
        question: question,
      });

      // 添加助手回复
      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: '抱歉，处理您的问题时出现了错误。请稍后重试。' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 md:inset-auto md:right-4 md:bottom-4 md:w-[480px] md:max-h-[600px] bg-white dark:bg-gray-800 rounded-t-2xl md:rounded-2xl shadow-2xl z-50 flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              论文助手
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
              {paperTitle}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <span className="sr-only">关闭</span>
          <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <Bot className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm text-center">
              我可以帮您理解这篇论文的内容
              <br />
              试着问我："这篇论文的主要贡献是什么？"
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-primary-100 dark:bg-primary-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-primary-600" />
                ) : (
                  <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              <Bot className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入您的问题..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:outline-none"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          基于论文摘要内容回答您的问题
        </p>
      </div>
    </div>
  );
}
