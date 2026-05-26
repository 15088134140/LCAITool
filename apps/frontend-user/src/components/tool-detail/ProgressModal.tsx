'use client';

import { useEffect, useState, useRef } from 'react';
import { useSSE } from '@/hooks/useSSE';
import { cn } from '@/lib/utils';
import { workApi } from '@/lib/api/modules/work';
import { tokenStorage } from '@/lib/api/client';
import type { WorkFile } from '@/lib/api/types';

const API_BASE_URL: string = (process.env['NEXT_PUBLIC_API_BASE_URL'] as string) || 'http://localhost:8000/api/v1';

interface StepItem {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  subProgress?: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  taskId: string | null;
  toolName?: string;
  onClose: () => void;
  onComplete: (workId: string) => void;
}

const funFacts = [
  '高质量的描述可以生成更精美的插图哦！',
  '尝试添加更多细节，比如角色的性格、场景氛围等',
  '不同的艺术风格适合不同类型的故事~',
  'AI 生成的成果保证独一无二！',
  '详细的描述能帮助 AI 更准确理解您的需求',
  '多轮对话可以逐步完善您的创意想法',
];

function randomFunFact(): string {
  return funFacts[Math.floor(Math.random() * funFacts.length)]!;
}

// Progress stages for description when no step info yet
const waitingMessages = [
  '正在准备创作资源...',
  'AI正在构思内容...',
  '正在分析您的需求...',
  '正在分配计算资源...',
];

export function ProgressModal({
  isOpen,
  taskId,
  toolName,
  onClose,
  onComplete,
}: ProgressModalProps) {
  const { subscribeToTask, disconnect } = useSSE();

  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('正在准备...');
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
  const [steps, setSteps] = useState<StepItem[]>([]);
  const [totalSteps, setTotalSteps] = useState(4);
  const [funFact, setFunFact] = useState(randomFunFact());
  const [workId, setWorkId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [files, setFiles] = useState<WorkFile[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [waitingMsgIndex, setWaitingMsgIndex] = useState(0);

  const completedRef = useRef(false);

  // Cycle through waiting messages when no SSE progress yet
  useEffect(() => {
    if (status !== 'running' || steps.length > 0 || progress > 0) return;
    const interval = setInterval(() => {
      setWaitingMsgIndex((prev) => (prev + 1) % waitingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [status, steps.length, progress]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen && taskId) {
      setProgress(0);
      setMessage('正在准备...');
      setStatus('running');
      setSteps([]);
      setTotalSteps(4);
      setFunFact(randomFunFact());
      setWorkId(null);
      setErrorMessage('');
      setShowResults(false);
      setFiles([]);
      setDownloading(false);
      setWaitingMsgIndex(0);
      completedRef.current = false;
    }
  }, [isOpen, taskId]);

  // Rotate fun facts periodically
  useEffect(() => {
    if (status !== 'running') return;
    const interval = setInterval(() => {
      setFunFact(randomFunFact());
    }, 5000);
    return () => clearInterval(interval);
  }, [status]);

  // Fetch work files when completed
  useEffect(() => {
    if (status !== 'completed' || !workId || showResults) return;
    const fetchFiles = async () => {
      try {
        const fileList = await workApi.getWorkFiles(workId);
        setFiles(fileList);
      } catch {
        // Files not critical - user can still navigate to detail page
      }
    };
    fetchFiles();
  }, [status, workId, showResults]);

  // Trigger results section fade-in after a brief delay on completion
  useEffect(() => {
    if (status !== 'completed') return;
    const timer = setTimeout(() => {
      setShowResults(true);
    }, 400);
    return () => clearTimeout(timer);
  }, [status]);

  // SSE subscription
  useEffect(() => {
    if (!isOpen || !taskId) return;

    const unsubscribe = subscribeToTask(taskId, (event) => {
      if (event.status === 'completed' || (event as any).type === 'completed') {
        if (completedRef.current) return;
        completedRef.current = true;
        setStatus('completed');
        setProgress(100);
        setMessage('生成完成！');
        setSteps((prev) =>
          prev.map((s) => ({ ...s, status: 'completed' as const }))
        );
        const wid = event.work_id || (event as any).work_id || '';
        if (wid) {
          setWorkId(wid);
        }
        return;
      }

      if (event.status === 'failed' || (event as any).type === 'failed') {
        setStatus('failed');
        setErrorMessage(event.error_message || '生成失败，请稍后重试');
        setSteps((prev) => {
          const runningIdx = prev.findIndex((s) => s.status === 'running');
          if (runningIdx >= 0) {
            const copy = [...prev];
            copy[runningIdx] = {
              name: copy[runningIdx]?.name || `步骤 ${runningIdx + 1}`,
              status: 'failed',
            };
            return copy;
          }
          return prev;
        });
        return;
      }

      // Progress update
      if (event.progress !== undefined) {
        setProgress(event.progress);
      }
      if (event.progressMessage) {
        setMessage(event.progressMessage);
      }

      // Update steps based on structured progress data
      const stepIndex = (event as any).step_index;
      const totalStepsVal = (event as any).total_steps;
      const stepStatus = (event as any).step_status;
      const subProgress = (event as any).sub_progress;

      if (stepIndex !== undefined && totalStepsVal !== undefined) {
        setTotalSteps(totalStepsVal);

        setSteps((prev) => {
          const next = [...prev];
          // Ensure we have enough slots
          while (next.length < totalStepsVal) {
            next.push({
              name: `步骤 ${next.length + 1}`,
              status: 'pending',
            });
          }

          // Update step name from message
          const stepName =
            event.progressMessage || next[stepIndex]?.name || `步骤 ${stepIndex + 1}`;

          // Mark all previous steps as completed
          for (let i = 0; i < stepIndex; i++) {
            const prevStep = next[i];
            if (prevStep && prevStep.status !== 'completed') {
              next[i] = { name: prevStep.name || `步骤 ${i + 1}`, status: 'completed' };
            }
          }

          // Update current step
          const currentStep = next[stepIndex];
          if (currentStep) {
            next[stepIndex] = {
              name: stepName,
              status: stepStatus === 'completed' ? 'completed' : 'running',
              subProgress: subProgress || currentStep.subProgress,
            };
          }

          return next;
        });

      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, taskId, subscribeToTask]);

  // Handle cancel
  const handleCancel = async () => {
    if (taskId) {
      try {
        const { taskApi } = await import('@/lib/api/modules/task');
        await taskApi.cancelTask(taskId);
      } catch {
        // ignore cancel error
      }
    }
    disconnect();
    onClose();
  };

  // Handle download single file
  const handleDownload = async (file: WorkFile) => {
    try {
      setDownloading(true);
      const token = tokenStorage.getToken();
      const response = await fetch(
        `${API_BASE_URL}/files/works/${file.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('下载失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Silent fail — user can still download from detail page
    } finally {
      setDownloading(false);
    }
  };

  // Handle download all (dynamic zip from server)
  const handleDownloadAll = async () => {
    try {
      // 优先使用服务端动态打包接口
      const token = tokenStorage.getToken();
      const response = await fetch(
        `${API_BASE_URL}/works/${workId}/download`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error('服务端打包失败');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `work_${workId}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // 回退：查找预生成的 ZIP 文件
      const zipFile = files.find(
        (f) => f.file_type === 'other' && f.file_name?.endsWith('.zip')
      );
      if (zipFile) {
        await handleDownload(zipFile);
      } else if (files.length > 0) {
        const firstFile = files[0];
        if (firstFile) {
          await handleDownload(firstFile);
        }
      }
    }
  };

  // Get current description text (show waiting message cycler before steps arrive)
  const completedCount = steps.filter((s) => s.status === 'completed').length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] overflow-y-auto">
      <div className="min-h-full flex items-center justify-center p-4 sm:p-6 pt-16 sm:pt-20">
      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .step-enter {
          animation: fadeInUp 0.35s ease-out forwards;
        }
        .results-enter {
          animation: fadeIn 0.5s ease-out forwards;
        }
        .icon-completed {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
      <div className="bg-white rounded-2xl p-5 sm:p-8 max-w-lg w-full shadow-2xl relative">
        {/* Close button (completed / failed states) */}
        {status !== 'running' && (
          <button
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F8FAFC] transition-all"
            onClick={onClose}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {/* Header Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981] flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              {status === 'running' && (
                <svg className="w-8 h-8 text-[#059669] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {status === 'completed' && (
                <svg className="w-8 h-8 text-[#059669] icon-completed" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {status === 'failed' && (
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          </div>

          <h3 className="text-xl font-bold text-[#1E3A5F]">
            {status === 'running' && (toolName ? `正在${toolName}` : '正在生成')}
            {status === 'completed' && '生成完成！'}
            {status === 'failed' && '生成失败'}
          </h3>
          <p className={cn(
            'mt-2',
            status === 'failed' ? 'text-red-500' : 'text-[#64748B]'
          )}>
            {status === 'running' && (steps.length > 0 ? message : waitingMessages[waitingMsgIndex])}
            {status === 'failed' && errorMessage}
            {status === 'completed' && '所有步骤已完成'}
          </p>
        </div>

        {/* Progress Bar — always visible from start */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#64748B]">
              步骤 {completedCount}/{totalSteps}
            </span>
            <span className="font-medium text-[#059669]">{progress}%</span>
          </div>
          <div className="h-3 bg-[#E4E7EB] rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full bg-gradient-to-r from-[#059669] to-[#10B981] rounded-full transition-all duration-500 ease-out',
                status === 'failed' && 'from-red-500 to-red-500'
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps List — container always present to prevent layout shift */}
        <div className="space-y-3 mb-6 min-h-[0px]">
          {steps.map((step, index) => (
            <div
              key={index}
              className={cn(
                'step-enter flex items-center gap-3 p-3 rounded-lg',
                step.status === 'completed' && 'bg-green-50',
                step.status === 'running' && 'bg-blue-50/70',
                step.status === 'failed' && 'bg-red-50',
                step.status === 'pending' && 'bg-gray-50/70'
              )}
            >
              {step.status === 'completed' ? (
                <svg className="w-5 h-5 text-[#059669] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : step.status === 'running' ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#2563EB] border-t-transparent animate-spin flex-shrink-0" />
              ) : step.status === 'failed' ? (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0 flex items-center gap-2">
                <span
                  className={cn(
                    'font-medium',
                    step.status === 'completed' && 'text-[#059669]',
                    step.status === 'running' && 'text-[#2563EB]',
                    step.status === 'failed' && 'text-red-600',
                    step.status === 'pending' && 'text-[#64748B]'
                  )}
                >
                  {step.name}
                </span>
                {step.subProgress && (
                  <span className="text-xs text-[#475569] font-medium">{step.subProgress}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Results Section (smooth fade-in on completion) */}
        {status === 'completed' && showResults && (
          <div className="results-enter mb-6">
            {/* Results info */}
            <div className="bg-[#F0FDF4] rounded-xl p-5 border border-[#BBF7D0] space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[#059669]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-[#1E3A5F]">成果已就绪</span>
              </div>
              <p className="text-sm text-[#64748B]">
                您的{files.length > 0 ? `${files.length} 个文件` : '成果'}已生成完毕，可查看详情或下载。
              </p>
              <div className="flex gap-3">
                {files.length > 0 && (
                  <button
                    onClick={handleDownloadAll}
                    disabled={downloading}
                    className="flex-1 px-4 py-2.5 bg-white border border-[#D1D5DB] text-[#1E3A5F] rounded-xl font-medium text-sm hover:bg-[#F8FAFC] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                    </svg>
                    {downloading ? '下载中...' : '下载压缩包'}
                  </button>
                )}
                <button
                  onClick={() => workId && onComplete(workId)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-xl font-medium text-sm hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  查看成果详情
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Failed error with retry suggestion */}
        {status === 'failed' && (
          <div className="mb-6 bg-red-50 rounded-xl p-4 border border-red-100">
            <p className="text-sm text-red-700 text-center">
              生成过程遇到问题，请稍后重试
            </p>
          </div>
        )}

        {/* Fun Fact (during running, after completion, but not when failed) */}
        {status !== 'failed' && (
          <div className="mb-6 text-center">
            <p className="text-sm text-[#94A3B8]">💡 {funFact}</p>
          </div>
        )}

        {/* Cancel / Close button */}
        {status === 'running' ? (
          <button
            className="w-full py-3 border border-[#E4E7EB] text-[#64748B] rounded-xl font-medium hover:bg-[#F8FAFC] transition-all"
            onClick={handleCancel}
          >
            取消生成
          </button>
        ) : status === 'failed' && (
          <button
            className="w-full py-3 border border-[#E4E7EB] text-[#64748B] rounded-xl font-medium hover:bg-[#F8FAFC] transition-all"
            onClick={onClose}
          >
            关闭
          </button>
        )}
      </div>
      </div>
    </div>
  );
}

export default ProgressModal;
