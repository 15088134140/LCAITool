'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { chatApi, type ChatMessage } from '@/lib/api/modules/chat';
import { taskApi } from '@/lib/api/modules/task';
import { userApi } from '@/lib/api/modules/user';
import { ProgressModal } from './ProgressModal';
import { toast } from '@/lib/toast';

interface DialogModeProps {
  tool: Tool;
}

export function DialogMode({ tool }: DialogModeProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [totalCost, setTotalCost] = useState(0);
  const [balance, setBalance] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Create session on mount
  useEffect(() => {
    const initSession = async () => {
      setIsLoading(true);
      try {
        const session = await chatApi.createSession(tool.slug || tool.id);
        setSessionId(session.session_id);
        setMessages(session.messages);
      } catch (err) {
        console.error('创建会话失败:', err);
      } finally {
        setIsLoading(false);
      }
    };
    initSession();
  }, [tool]);

  // 计算预估费用和余额
  useEffect(() => {
    const imageFee = tool.image_fee ?? 0;
    const audioFee = tool.audio_fee ?? 0;
    let cost = tool.base_fee ?? 0;
    // 对话模式按默认参数估算
    if (imageFee > 0) cost += imageFee * 5; // 默认5张图
    if (audioFee > 0) cost += audioFee * 5; // 默认5段音频
    setTotalCost(cost);

    userApi.getBalance().then(res => setBalance(res.balance)).catch(() => {});
  }, [tool]);

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || isSending) return;

    const userMsg = inputValue.trim();
    setInputValue('');
    setIsSending(true);

    // Optimistically add user message
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: Date.now() / 1000 }]);

    try {
      const result = await chatApi.sendMessage(sessionId, userMsg);
      setMessages(result.messages);
    } catch (err) {
      console.error('发送消息失败:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，发送失败，请稍后重试。', timestamp: Date.now() / 1000 }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartGeneration = async () => {
    if (!sessionId) return;
    // Collect conversation context for task params
    const conversationText = messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n');

    try {
      const taskTypeMap: Record<string, string> = {
        'ai-storybook': 'storybook',
        'ecommerce-detail': 'ecommerce',
        'product-description': 'marketing',
      };
      const taskType = taskTypeMap[tool.slug] || tool.slug;

      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: taskType,
        estimated_cost: totalCost || undefined,
        input_params: {
          conversationContext: conversationText,
          source: 'dialog',
          sessionId: sessionId,
        },
      } as any);
      // Open ProgressModal instead of navigating to progress page
      setProgressTaskId(task.id);
      setShowProgressModal(true);
    } catch (err: any) {
      console.error('创建任务失败:', err);
      const detail = err?.response?.data?.detail || '';
      if (detail.includes('余额') || err?.response?.status === 400) {
        toast.warning('积分余额不足，请先充值', { label: '去充值', onClick: () => router.push('/payment') });
      } else {
        toast.error(detail || '创建任务失败，请稍后重试');
      }
    }
  };

  const handleProgressComplete = useCallback((workId: string) => {
    setShowProgressModal(false);
    setProgressTaskId(null);
    router.push(`/works/detail/${workId}`);
  }, [router]);

  const handleProgressClose = useCallback(() => {
    setShowProgressModal(false);
    setProgressTaskId(null);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <section id="start-creation" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E3A5F] mx-auto" />
          <p className="text-gray-500 mt-4">正在初始化对话...</p>
        </div>
      </section>
    );
  }

  return (
    <>
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4">对话创作</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">通过对话描述你的需求，AI将引导你完成创作</p>
        </div>

        {/* Chat area */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl p-4 ${
                  msg.role === 'user'
                    ? 'bg-[#1E3A5F] text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-800 rounded-bl-md'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                    {new Date(msg.timestamp * 1000).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-md p-4">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-3">
              <textarea
                className="flex-1 px-5 py-3 border border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
                rows={2}
                placeholder="描述你的创作需求..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <button
                className="px-6 py-3 bg-[#1E3A5F] text-white rounded-xl font-semibold hover:bg-[#162d4a] transition-all disabled:opacity-50 self-end"
                onClick={handleSend}
                disabled={!inputValue.trim() || isSending}
              >
                {isSending ? '...' : '发送'}
              </button>
            </div>
          </div>
        </div>

        {/* Generate button */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">基础费</span>
                  <span className="font-semibold text-brand-dark">{tool.base_fee ? `${tool.base_fee} 积分` : '免费'}</span>
                </div>
                {tool.image_fee ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">图片</span>
                    <span className="font-semibold text-brand-dark">{tool.image_fee} 积分/张</span>
                  </div>
                ) : null}
                {tool.audio_fee ? (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-500">配音</span>
                    <span className="font-semibold text-brand-dark">{tool.audio_fee} 积分/段</span>
                  </div>
                ) : null}
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">预估费用</span>
                  <span className="text-xl font-bold text-green-600">{totalCost} 积分</span>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">余额</span>
                  <span className="font-semibold text-brand-dark">{balance} 积分</span>
                </div>
              </div>
              <button
                className="px-10 py-4 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 whitespace-nowrap"
                onClick={handleStartGeneration}
                disabled={messages.length <= 1}
              >
                根据对话开始生成
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4 text-center">与AI充分沟通后，点击按钮即可基于对话内容开始创作</p>
          </div>
        </div>
      </div>
    </section>

      <ProgressModal
        isOpen={showProgressModal}
        taskId={progressTaskId}
        toolName={tool.name}
        onClose={handleProgressClose}
        onComplete={handleProgressComplete}
      />
    </>
  );
}
