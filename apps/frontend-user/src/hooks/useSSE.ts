/**
 * 灵创AI工具箱 - SSE (Server-Sent Events) Hook
 * 支持自动重连、断线重连状态恢复、事件分发等功能
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  SSEEvent,
} from '../lib/api/types';
import { tokenStorage } from '../lib/api/client';

// SSE配置
const SSE_BASE_URL = process.env['NEXT_PUBLIC_API_BASE_URL'] || 'http://localhost:8000/api/v1';
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY_BASE = 1000; // 1秒
const RECONNECT_DELAY_MAX = 30000; // 30秒

// 事件回调类型
type SSEEventCallback<T = any> = (data: T) => void;

// 事件订阅器类型
interface SSESubscription {
  id: string;
  eventType: string | '*';
  callback: SSEEventCallback;
}

// 任务进度事件类型
interface TaskProgressEventData {
  status?: string;
  progress?: number;
  progressMessage?: string;
  work_id?: string;
  error_message?: string;
}

// Hook返回类型
interface UseSSEReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastEvent: SSEEvent | null;
  error: Error | null;
  connect: (taskId: string) => void;
  disconnect: () => void;
  subscribe: <T = any>(eventType: string | '*', callback: SSEEventCallback<T>) => () => void;
  subscribeToTask: (taskId: string, callback: SSEEventCallback<TaskProgressEventData>) => () => void;
  getEventSource: () => EventSource | null;
}

// 计算重连延迟（指数退避）
const calculateReconnectDelay = (attempt: number): number => {
  const delay = Math.min(
    RECONNECT_DELAY_BASE * Math.pow(2, attempt),
    RECONNECT_DELAY_MAX
  );
  // 添加随机抖动，避免多个客户端同时重连
  return delay + Math.random() * 1000;
};

// 生成唯一ID
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

export const useSSE = (): UseSSEReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const subscriptionsRef = useRef<SSESubscription[]>([]);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventIdRef = useRef<string>('');
  const currentTaskIdRef = useRef<string | null>(null);

  // 清理重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 分发事件到订阅者
  const dispatchEvent = useCallback((event: SSEEvent) => {
    setLastEvent(event);

    subscriptionsRef.current.forEach((subscription) => {
      if (subscription.eventType === '*' || subscription.eventType === event.type) {
        try {
          subscription.callback(event.data);
        } catch (err) {
          console.error(`Error in SSE event callback for ${event.type}:`, err);
        }
      }
    });
  }, []);

  // 处理消息
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      // 更新最后一个事件ID（EventSource 自动通过 Last-Event-ID 头发送）
      if (event.lastEventId) {
        lastEventIdRef.current = event.lastEventId;
      }

      // 后端发送的数据是扁平 JSON: {type: 'progress', progress: 45, message: '...', ...}
      // 包装为 SSEEvent 格式，将完整 payload 放入 data 字段
      const parsed = JSON.parse(event.data);
      const sseEvent: SSEEvent = {
        type: parsed.type || event.type || 'message',
        data: parsed,
        timestamp: parsed.timestamp || Math.floor(Date.now() / 1000),
      };
      dispatchEvent(sseEvent);
    } catch (err) {
      console.error('Failed to parse SSE message:', err);
    }
  }, [dispatchEvent]);

  // 处理连接打开
  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setIsReconnecting(false);
    setReconnectAttempts(0);
    setError(null);
    clearReconnectTimer();
  }, [clearReconnectTimer]);

  // 处理错误和重连
  const handleError = useCallback((err: Event) => {
    console.error('SSE connection error:', err);
    setIsConnected(false);
    setError(new Error('SSE连接错误'));

    // 关闭当前连接
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    // 只在有当前任务ID时尝试重连
    if (!currentTaskIdRef.current) {
      return;
    }

    // 尝试重连
    const attemptReconnect = (attempt: number) => {
      if (attempt >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max SSE reconnect attempts reached');
        setIsReconnecting(false);
        return;
      }

      setIsReconnecting(true);
      setReconnectAttempts(attempt);

      const delay = calculateReconnectDelay(attempt);
      console.log(`SSE reconnecting in ${delay}ms (attempt ${attempt + 1}/${MAX_RECONNECT_ATTEMPTS})`);

      reconnectTimerRef.current = setTimeout(() => {
        if (currentTaskIdRef.current) {
          connect(currentTaskIdRef.current);
        }
      }, delay);
    };

    attemptReconnect(reconnectAttempts);
  }, [clearReconnectTimer, reconnectAttempts]);

  // 连接SSE
  const connect = useCallback((taskId: string) => {
    // 如果已经连接，先断开
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    clearReconnectTimer();
    currentTaskIdRef.current = taskId;

    // 构建URL
    const token = tokenStorage.getToken();
    const url = new URL(`${SSE_BASE_URL}/stream/tasks/${taskId}/stream`);

    // 添加认证token到查询参数（因为EventSource不支持headers）
    if (token) {
      url.searchParams.append('token', token);
    }

    try {
      const eventSource = new EventSource(url.toString(), {
        withCredentials: true,
      });
      eventSourceRef.current = eventSource;

      eventSource.onopen = handleOpen;
      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;

      // 监听特定事件类型
      eventSource.addEventListener('progress', (event) => handleMessage(event as MessageEvent));
      eventSource.addEventListener('completed', (event) => {
        handleMessage(event as MessageEvent);
        // 任务完成后自动断开连接
        setTimeout(() => disconnect(), 1000);
      });
      eventSource.addEventListener('failed', (event) => {
        handleMessage(event as MessageEvent);
        setTimeout(() => disconnect(), 1000);
      });
      eventSource.addEventListener('cancelled', (event) => {
        handleMessage(event as MessageEvent);
        setTimeout(() => disconnect(), 1000);
      });
      eventSource.addEventListener('timeout', (event) => {
        handleMessage(event as MessageEvent);
        setTimeout(() => disconnect(), 1000);
      });
    } catch (err) {
      console.error('Failed to create EventSource:', err);
      setError(err instanceof Error ? err : new Error('Failed to create EventSource'));
    }
  }, [clearReconnectTimer, handleOpen, handleMessage, handleError]);

  // 断开连接
  const disconnect = useCallback(() => {
    clearReconnectTimer();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    currentTaskIdRef.current = null;
    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
  }, [clearReconnectTimer]);

  // 订阅事件
  const subscribe = useCallback(<T = any>(
    eventType: string | '*',
    callback: SSEEventCallback<T>
  ): (() => void) => {
    const subscription: SSESubscription = {
      id: generateId(),
      eventType,
      callback: callback as SSEEventCallback,
    };

    subscriptionsRef.current.push(subscription);

    // 返回取消订阅函数
    return () => {
      const index = subscriptionsRef.current.findIndex((s) => s.id === subscription.id);
      if (index !== -1) {
        subscriptionsRef.current.splice(index, 1);
      }
    };
  }, []);

  // 获取当前EventSource实例
  const getEventSource = useCallback(() => {
    return eventSourceRef.current;
  }, []);

  // 组件卸载时断开连接
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // 订阅任务进度事件的便捷方法
  const subscribeToTask = useCallback((
    taskId: string,
    callback: SSEEventCallback<TaskProgressEventData>
  ): (() => void) => {
    // 先连接到指定任务的 SSE 流
    connect(taskId);

    // 订阅进度事件（映射后端字段名: message → progressMessage，提升嵌套 data 字段）
    const unsubscribeProgress = subscribe('progress', (data: TaskProgressEventData) => {
      callback({
        ...data,
        ...((data as any).data || {}),
        progressMessage: (data as any).message || data.progressMessage,
      });
    });

    // 也订阅 completed/failed 事件
    const unsubscribeCompleted = subscribe('completed', (data: TaskProgressEventData) => {
      callback({
        ...data,
        ...((data as any).data || {}),
        progressMessage: (data as any).message || data.progressMessage,
      });
    });
    const unsubscribeFailed = subscribe('failed', (data: TaskProgressEventData) => {
      callback({
        ...data,
        ...((data as any).data || {}),
        progressMessage: (data as any).message || data.progressMessage,
      });
    });

    // 返回统一取消订阅函数
    return () => {
      unsubscribeProgress();
      unsubscribeCompleted();
      unsubscribeFailed();
    };
  }, [connect, subscribe]);

  return {
    isConnected,
    isReconnecting,
    reconnectAttempts,
    lastEvent,
    error,
    connect,
    disconnect,
    subscribe,
    subscribeToTask,
    getEventSource,
  };
};

export default useSSE;
