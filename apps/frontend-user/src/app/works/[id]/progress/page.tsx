'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ProgressBar, StepIndicator } from '@/components/task/ProgressBar';
import { taskApi } from '@/lib/api/modules/task';
import { useSSE } from '@/hooks/useSSE';
import type { Task, TaskLog } from '@/lib/api/types';

// 模拟的步骤 - 根据不同工具类型会有所不同
const defaultSteps = [
  '接收任务请求',
  '生成内容大纲',
  '创建媒体资源',
  '合成最终结果',
  '保存并完成'
];

const storybookSteps = [
  '接收任务请求',
  '生成故事大纲',
  '创作绘本内容',
  '生成绘本插图',
  '合成语音旁白',
  '排版生成PDF',
  '保存并完成'
];

const ecommerceSteps = [
  '接收任务请求',
  '分析商品信息',
  '生成营销文案',
  '创建商品图片',
  '设计详情页布局',
  '保存并完成'
];

export default function TaskProgressPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [logs, setLogs] = useState<TaskLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const { subscribeToTask, isConnected } = useSSE();

  // 获取当前步骤
  const getCurrentStep = (progress: number, steps: string[]) => {
    return Math.ceil((progress / 100) * steps.length);
  };

  // 根据任务类型获取步骤
  const getStepsForTask = (taskType?: string) => {
    if (!taskType) return defaultSteps;
    if (taskType.toLowerCase().includes('storybook') || taskType.toLowerCase().includes('绘本')) {
      return storybookSteps;
    }
    if (taskType.toLowerCase().includes('ecommerce') || taskType.toLowerCase().includes('电商')) {
      return ecommerceSteps;
    }
    return defaultSteps;
  };

  // 滚动到日志底部
  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  // 初始获取任务数据
  useEffect(() => {
    if (!taskId) return;

    const fetchTaskData = async () => {
      try {
        setIsLoading(true);
        const [taskData, logsData] = await Promise.all([
          taskApi.getTask(taskId),
          taskApi.getTaskLogs(taskId)
        ]);
        setTask(taskData);
        setLogs(logsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaskData();
  }, [taskId]);

  // 订阅 SSE 实时更新
  useEffect(() => {
    if (!taskId) return;

    const unsubscribe = subscribeToTask(taskId, (event) => {
      // 更新任务状态
      setTask(prev => prev ? {
        ...prev,
        status: event.status ?? prev.status,
        progress: event.progress ?? prev.progress,
        progressMessage: event.progressMessage ?? prev.progressMessage,
        resultPreview: event.work_id ? event.work_id : prev.resultPreview
      } : null);

      // 添加日志
      if (event.progressMessage) {
        setLogs(prev => [...prev, {
          id: `log-${Date.now()}`,
          taskId: taskId,
          level: 'info',
          message: event.progressMessage,
          timestamp: Math.floor(Date.now() / 1000),
          createdAt: Math.floor(Date.now() / 1000),
          updatedAt: Math.floor(Date.now() / 1000)
        } as TaskLog]);
      }
    });

    return unsubscribe;
  }, [taskId, subscribeToTask]);

  // 任务完成后自动跳转
  useEffect(() => {
    if (task?.status === 'completed' && task.resultPreview) {
      // 延迟3秒后跳转，让用户看到完成状态
      const timer = setTimeout(() => {
        router.push(`/works/${task.resultPreview}`);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [task?.status, task?.resultPreview, router]);

  // 处理重试
  const handleRetry = async () => {
    if (!taskId) return;
    try {
      await taskApi.retryTask(taskId);
      // 重新获取任务状态
      const [taskData, logsData] = await Promise.all([
        taskApi.getTask(taskId),
        taskApi.getTaskLogs(taskId)
      ]);
      setTask(taskData);
      setLogs(logsData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '重试失败');
    }
  };

  // 处理取消
  const handleCancel = async () => {
    if (!taskId) return;
    try {
      await taskApi.cancelTask(taskId);
      const taskData = await taskApi.getTask(taskId);
      setTask(taskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '取消失败');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white border-4 border-[#E4E7EB] border-t-brand-light animate-spin"></div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2">加载中...</h1>
            <p className="text-[#64748B]">正在获取任务信息</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">加载失败</h2>
            <p className="text-[#64748B] mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <Link href="/tools" className="btn-secondary px-6 py-3 rounded-xl font-semibold">
                返回工具列表
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="btn-primary px-6 py-3 text-white rounded-xl font-semibold"
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const steps = getStepsForTask(task?.taskType);
  const currentStep = getCurrentStep(task?.progress || 0, steps);
  const isCompleted = task?.status === 'completed';
  const isFailed = task?.status === 'failed' || task?.status === 'timeout';
  const isCancelled = task?.status === 'cancelled';
  const isRunning = task?.status === 'running' || task?.status === 'pending';

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href="/works"
              className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#1E3A5F] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              返回我的成果
            </Link>

            {/* Connection Status */}
            <div className="flex items-center gap-2 text-sm">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full',
                isConnected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'
              )} />
              <span className="text-[#64748B]">
                {isConnected ? '实时连接' : '连接中...'}
              </span>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-[#1E3A5F] mb-2">
            {isCompleted ? '🎉 任务完成' :
             isFailed ? '❌ 任务失败' :
             isCancelled ? '⏸️ 任务已取消' :
             '🔄 正在处理您的任务'}
          </h1>
          <p className="text-[#64748B]">
            {task?.taskType || 'AI创作任务'} · 任务ID: {taskId}
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Progress & Steps */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Card */}
            <div className="bg-white rounded-2xl border border-[#E4E7EB] p-8">
              {/* Main Icon */}
              <div className="flex items-start gap-6 mb-8">
                <div className={cn(
                  'w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0',
                  isCompleted ? 'bg-gradient-to-br from-success-dark to-success-light' :
                  isFailed || isCancelled ? 'bg-gradient-to-br from-red-500 to-red-600' :
                  'bg-gradient-to-br from-brand-dark to-brand-light animate-pulse'
                )}>
                  {isCompleted ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isFailed || isCancelled ? (
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-10 h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1">
                  <h2 className="text-xl font-bold text-[#1E3A5F] mb-2">
                    {task?.progressMessage ||
                     (isCompleted ? '您的成果已准备好！' :
                      isFailed ? '任务处理过程中遇到问题' :
                      isCancelled ? '任务已被取消' :
                      '请稍候，AI正在努力创作中...')}
                  </h2>

                  {task?.errorMessage && (
                    <p className="text-red-500 bg-red-50 rounded-lg p-4 mb-4">
                      {task.errorMessage}
                    </p>
                  )}

                  {/* Progress Bar */}
                  <div className="max-w-md">
                    <ProgressBar
                      progress={task?.progress || 0}
                      status={task?.status || 'pending'}
                      size="lg"
                      animated={isRunning}
                    />
                  </div>
                </div>
              </div>

              {/* Step Indicator */}
              <div className="border-t border-[#E4E7EB] pt-8">
                <h3 className="font-semibold text-[#1E3A5F] mb-6">处理步骤</h3>
                <StepIndicator
                  currentStep={isFailed ? currentStep : isCompleted ? steps.length : currentStep}
                  totalSteps={steps.length}
                  steps={steps}
                  status={isFailed ? 'failed' : isCompleted ? 'completed' : isCancelled ? 'failed' : 'running'}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              {isCompleted && task?.resultPreview && (
                <Link
                  href={`/works/${task.resultPreview}`}
                  className="btn-primary px-8 py-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 flex-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  查看成果
                </Link>
              )}

              {isFailed && (
                <>
                  <Link
                    href="/tools"
                    className="btn-secondary px-8 py-4 font-semibold rounded-xl flex items-center justify-center gap-2 flex-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    返回工具
                  </Link>
                  <button
                    onClick={handleRetry}
                    className="btn-primary px-8 py-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 flex-1"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    重试任务
                  </button>
                </>
              )}

              {isCancelled && (
                <Link
                  href="/tools"
                  className="btn-primary px-8 py-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 flex-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  创建新任务
                </Link>
              )}

              {isRunning && (
                <button
                  onClick={handleCancel}
                  className="btn-secondary px-8 py-4 font-semibold rounded-xl flex items-center justify-center gap-2 text-red-600 border-red-200 hover:bg-red-50 flex-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  取消任务
                </button>
              )}
            </div>
          </div>

          {/* Right Column - Logs */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E4E7EB] overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-[#E4E7EB] bg-[#F8FAFC]">
                <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  执行日志
                </h3>
              </div>
              <div className="h-96 overflow-y-auto p-4 space-y-3 bg-slate-50">
                {logs.length === 0 ? (
                  <div className="text-center py-8 text-[#64748B]">
                    <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">等待日志...</p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="flex gap-3 text-sm">
                      <div className={cn(
                        'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
                        log.level === 'error' ? 'bg-red-500' :
                        log.level === 'warn' ? 'bg-yellow-500' :
                        log.level === 'debug' ? 'bg-gray-400' :
                        'bg-success-light'
                      )} />
                      <div className="flex-1">
                        <p className={cn(
                          'break-words',
                          log.level === 'error' ? 'text-red-600' : 'text-[#475569]'
                        )}>
                          {log.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>

            {/* Cost Info */}
            <div className="mt-6 bg-white rounded-2xl border border-[#E4E7EB] p-6">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z" />
                </svg>
                费用信息
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#64748B]">预估费用</span>
                  <span className="font-medium text-[#1E3A5F]">{task?.estimatedCost || 0} 积分</span>
                </div>
                {task?.actualCost !== undefined && task?.actualCost !== null && (
                  <div className="flex justify-between text-sm pt-2 border-t border-[#E4E7EB]">
                    <span className="text-[#64748B]">实际费用</span>
                    <span className="font-bold text-success-dark">{task.actualCost} 积分</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
