/**
 * 灵创AI工具箱 - SSE (Server-Sent Events) Hook
 * 支持自动重连、断线重连状态恢复、事件分发等功能
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  SSEEvent,
  SSEEventType,
  TaskProgressEvent,
  TaskCompletedEvent,
  TaskFailedEvent,
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
  eventType: SSEEventType | '*';
  callback: SSEEventCallback;
}

// Hook返回类型
interface UseSSEReturn {
  isConnected: boolean;
  isReconnecting: boolean;
  reconnectAttempts: number;
  lastEvent: SSEEvent | null;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: <T = any>(eventType: SSEEventType | '*', callback: SSEEventCallback<T>) => () => void;
  subscribeToTask: (taskId: string, callback: SSEEventCallback<TaskProgressEvent | TaskCompletedEvent | TaskFailedEvent>) => () => void;
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
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventIdRef = useRef<string>('');

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
      // 更新最后一个事件ID
      if (event.lastEventId) {
        lastEventIdRef.current = event.lastEventId;
      }

      const sseEvent: SSEEvent = JSON.parse(event.data);
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
        connect();
      }, delay);
    };

    attemptReconnect(reconnectAttempts);
  }, [clearReconnectTimer, reconnectAttempts]);

  // 连接SSE
  const connect = useCallback(() => {
    // 如果已经连接，先断开
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    clearReconnectTimer();

    // 构建URL
    const token = tokenStorage.getToken();
    const url = new URL(`${SSE_BASE_URL}/events`);

    // 添加认证token
    if (token) {
      url.searchParams.append('token', token);
    }

    // 添加最后一个事件ID用于断线恢复
    if (lastEventIdRef.current) {
      url.searchParams.append('lastEventId', lastEventIdRef.current);
    }

    try {
      const eventSource = new EventSource(url.toString());
      eventSourceRef.current = eventSource;

      eventSource.onopen = handleOpen;
      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;
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

    setIsConnected(false);
    setIsReconnecting(false);
    setReconnectAttempts(0);
  }, [clearReconnectTimer]);

  // 订阅事件
  const subscribe = useCallback(<T = any>(
    eventType: SSEEventType | '*',
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

  // 订阅特定任务的事件
  const subscribeToTask = useCallback((
    taskId: string,
    callback: SSEEventCallback<TaskProgressEvent | TaskCompletedEvent | TaskFailedEvent>
  ): (() => void) => {
    return subscribe('*', (data) => {
      // 检查事件是否与该任务相关
      if (
        data.task_id === taskId &&
        (data.status || data.work_id || data.error_message)
      ) {
        callback(data);
      }
    });
  }, [subscribe]);

  // 组件挂载时自动连接，卸载时断开
  useEffect(() => {
    // 只在客户端连接
    if (typeof window === 'undefined') return;

    // 监听认证登出事件
    const handleAuthLogout = () => {
      disconnect();
    };

    window.addEventListener('auth:logout', handleAuthLogout);

    // 监听认证登录事件
    const handleAuthLogin = () => {
      connect();
    };

    window.addEventListener('auth:login', handleAuthLogin);

    // 如果用户已认证，自动连接
    const token = tokenStorage.getToken();
    if (token) {
      connect();
    }

    return () => {
      window.removeEventListener('auth:logout', handleAuthLogout);
      window.removeEventListener('auth:login', handleAuthLogin);
      disconnect();
    };
  }, [connect, disconnect]);

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
  };
};

export default useSSE;
