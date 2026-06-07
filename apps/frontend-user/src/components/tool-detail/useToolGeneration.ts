'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { taskApi } from '@/lib/api/modules/task';
import { toast } from '@/lib/toast';

export interface StartGenerationOptions {
  /** 工具对象（必须提供 id；task_type 默认取 tool.slug ?? tool.id） */
  tool: { id: string; slug?: string; name?: string };
  /** 已经组装并完成文件上传的 input_params（由 DynamicToolForm.onSubmit 输出） */
  inputParams: Record<string, any>;
  /** 前端预估积分（仅供后端记录/调试，最终扣费以后端 PricingService 为准） */
  estimatedCost?: number;
  /** 显式覆盖 task_type；不传则用 tool.slug ?? tool.id（保留 legacy alias 兼容） */
  taskType?: string;
  /** 来源标记，便于埋点；'form' / 'dialog' / 自定义 */
  source?: 'form' | 'dialog' | string;
}

export interface ToolGenerationState {
  /** 正在调用 createTask */
  isCreating: boolean;
  /** ProgressModal 当前绑定的 taskId */
  progressTaskId: string | null;
  /** ProgressModal 是否打开 */
  showProgressModal: boolean;
  /** 启动生成：调用 createTask，成功后自动打开 ProgressModal */
  startGeneration: (options: StartGenerationOptions) => Promise<void>;
  /** 关闭 ProgressModal（用户主动取消） */
  closeProgressModal: () => void;
  /** ProgressModal 完成回调：默认跳转 /works/detail/{workId} */
  handleProgressComplete: (workId: string) => void;
}

/**
 * 共享生成流程 hook：
 * - 统一 createTask 调用、错误处理（含余额不足）
 * - 统一打开/关闭 ProgressModal
 * - 统一完成态跳转到作品详情
 *
 * 与 DynamicToolForm 分离：
 *   DynamicToolForm.onSubmit(inputParams) → useToolGeneration.startGeneration({ tool, inputParams, estimatedCost })
 *
 * 页面只负责把 hook 暴露的 state 绑定到 <ProgressModal />。
 */
export function useToolGeneration(): ToolGenerationState {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [progressTaskId, setProgressTaskId] = useState<string | null>(null);
  const [showProgressModal, setShowProgressModal] = useState(false);

  const startGeneration = useCallback(
    async ({ tool, inputParams, estimatedCost, taskType }: StartGenerationOptions) => {
      if (!tool?.id) {
        toast.error('工具配置异常，请刷新页面后重试');
        return;
      }
      const resolvedTaskType = taskType ?? tool.slug ?? tool.id;
      setIsCreating(true);
      try {
        const task = await taskApi.createTask({
          tool_id: tool.id,
          task_type: resolvedTaskType,
          ...(typeof estimatedCost === 'number' ? { estimated_cost: estimatedCost } : {}),
          input_params: inputParams,
        });
        setProgressTaskId(task.id);
        setShowProgressModal(true);
      } catch (error: any) {
        // 与现有标杆页保持一致的错误识别口径
        const detail: string = error?.response?.data?.detail || '';
        const status: number | undefined = error?.response?.status;
        if (
          detail.includes('余额') ||
          detail.toLowerCase().includes('insufficient') ||
          status === 402 ||
          // 兼容旧实现：400 + 余额相关文案
          (status === 400 && detail.includes('积分'))
        ) {
          toast.warning('积分余额不足，请先充值', {
            label: '去充值',
            onClick: () => router.push('/pricing'),
          });
        } else {
          toast.error(detail || '创建任务失败，请稍后重试');
        }
        // 抛出由调用方决定是否重置表单 loading 等，但本 hook 不再处理
      } finally {
        setIsCreating(false);
      }
    },
    [router]
  );

  const closeProgressModal = useCallback(() => {
    setShowProgressModal(false);
    setProgressTaskId(null);
  }, []);

  const handleProgressComplete = useCallback(
    (workId: string) => {
      setShowProgressModal(false);
      setProgressTaskId(null);
      router.push(`/works/detail/${workId}`);
    },
    [router]
  );

  return {
    isCreating,
    progressTaskId,
    showProgressModal,
    startGeneration,
    closeProgressModal,
    handleProgressComplete,
  };
}
