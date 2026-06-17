'use client';

/**
 * StorybookForm — 绘本生成器 定制页表单
 *
 * 该组件现在是 DynamicToolForm 的薄壳：
 * - 表单渲染、字段校验、文件上传、input_params 组装：交给 DynamicToolForm
 * - 任务创建、ProgressModal、余额不足、完成跳转：交给 useToolGeneration
 * - 价格预估：交给 useToolCostEstimate + PriceEstimatePanel
 * - 该页面专属外壳（标题、说明、示例）保留在外层 page 中
 *
 * 等价行为依赖 tool.param_schema 已按 PRD §1.1/§2.2 配置（见 seed_data）。
 * 旧手写实现位于 git 历史（提交 6562294 之前），作为回滚兜底。
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/types';
import { DynamicToolForm } from '@/components/tool-detail/DynamicToolForm';
import { PriceEstimatePanel } from '@/components/tool-detail/PriceEstimatePanel';
import { ProgressModal } from '@/components/tool-detail/ProgressModal';
import { useToolCostEstimate } from '@/components/tool-detail/useToolCostEstimate';
import { useToolGeneration } from '@/components/tool-detail/useToolGeneration';
import { useAuthStore } from '@/store';

interface StorybookFormProps {
  tool: Tool;
}

export function StorybookForm({ tool }: StorybookFormProps) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const generation = useToolGeneration();
  const estimate = useToolCostEstimate(tool, formValues);

  // 未配置 schema 时友好降级（理论上不该发生，schema 已写入 seed）
  if (!tool.param_schema || tool.param_schema.length === 0) {
    return (
      <section id="start-creation" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-white rounded-2xl p-12 border border-gray-200">
            <div className="text-6xl mb-6">🚧</div>
            <h3 className="text-xl font-semibold text-brand-dark mb-2">表单配置缺失</h3>
            <p className="text-gray-500">该工具的动态表单 schema 暂未配置，请联系管理员。</p>
          </div>
        </div>
      </section>
    );
  }

  const handleSubmit = async (inputParams: Record<string, any>) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    await generation.startGeneration({
      tool,
      inputParams,
      estimatedCost: estimate.total,
      source: 'form',
    });
  };

  return (
    <>
      <section id="start-creation" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">
              选择适合您的创作方式，简单几步即可生成专属绘本
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
                <DynamicToolForm
                  paramSchema={tool.param_schema}
                  toolId={tool.id}
                  onSubmit={handleSubmit}
                  onValuesChange={(vals) => setFormValues(vals)}
                  disabled={generation.isCreating}
                  submitLabel={
                    !isAuthenticated
                      ? '请先登录'
                      : generation.isCreating
                      ? '正在创建任务...'
                      : '🚀 开始生成'
                  }
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <PriceEstimatePanel estimate={estimate} className="mb-6" />
                <div className="bg-white rounded-2xl p-6 border border-gray-200">
                  <p className="text-sm text-gray-500 text-center">预计耗时：2-5 分钟</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProgressModal
        isOpen={generation.showProgressModal}
        taskId={generation.progressTaskId}
        toolName={tool.name}
        onClose={generation.closeProgressModal}
        onComplete={generation.handleProgressComplete}
      />
    </>
  );
}
