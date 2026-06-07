'use client';

import { useState } from 'react';
import { DialogMode } from './DialogMode';
import { DynamicToolForm } from './DynamicToolForm';
import { PriceEstimatePanel } from './PriceEstimatePanel';
import { ProgressModal } from './ProgressModal';
import { useToolCostEstimate } from './useToolCostEstimate';
import { useToolGeneration } from './useToolGeneration';
import type { Tool } from '@/types';

interface ToolCreationFormProps {
  tool: Tool;
}

export function ToolCreationForm({ tool }: ToolCreationFormProps) {
  const usageModes = tool.usage_modes || ['form'];

  if (usageModes.length === 1 && usageModes[0] === 'dialog') {
    return <DialogMode tool={tool} />;
  }

  if (usageModes.includes('form') && usageModes.includes('dialog')) {
    return <ToolCreationFormWithTabs tool={tool} />;
  }

  const hasDynamicSchema = tool.param_schema && tool.param_schema.length > 0;

  if (!hasDynamicSchema) {
    // Default: form mode (show "under development")
    return (
      <section id="start-creation" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto">该工具正在开发中，敬请期待</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl p-12 border border-gray-200 text-center">
              <div className="text-6xl mb-6">🚧</div>
              <h3 className="text-xl font-semibold text-brand-dark mb-2">开发中</h3>
              <p className="text-gray-500">
                该工具正在积极开发中，<br />
                请稍后再来体验！
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return <DynamicToolPage tool={tool} />;
}

function DynamicToolPage({ tool }: { tool: Tool }) {
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const generation = useToolGeneration();
  const estimate = useToolCostEstimate(tool, formValues);

  const handleSubmit = async (inputParams: Record<string, any>) => {
    await generation.startGeneration({
      tool,
      inputParams,
      estimatedCost: estimate.total,
    });
  };

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
        </div>
        <div className="max-w-2xl mx-auto">
          <DynamicToolForm
            paramSchema={tool.param_schema!}
            toolId={tool.id}
            onSubmit={handleSubmit}
            onValuesChange={(vals) => setFormValues(vals)}
            disabled={generation.isCreating}
            submitLabel={generation.isCreating ? '正在创建任务...' : '开始生成'}
            rightSlot={
              <PriceEstimatePanel
                estimate={estimate}
                className="mt-6"
              />
            }
          />
        </div>
      </div>

      <ProgressModal
        isOpen={generation.showProgressModal}
        taskId={generation.progressTaskId}
        toolName={tool.name}
        onClose={generation.closeProgressModal}
        onComplete={generation.handleProgressComplete}
      />
    </section>
  );
}

// --- Tab switching for form+dialog mode ---

function ToolCreationFormWithTabs({ tool }: { tool: Tool }) {
  const [mode, setMode] = useState<'form' | 'dialog'>('form');

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
        </div>
        <div className="flex justify-center mb-12">
          <div className="bg-white p-2 rounded-2xl border border-gray-200 shadow-sm">
            <button
              className={`px-8 py-4 rounded-xl font-semibold transition-all text-lg ${
                mode === 'form' ? 'bg-[#1E3A5F] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setMode('form')}
            >
              📝 表单模式
            </button>
            <button
              className={`px-8 py-4 rounded-xl font-semibold transition-all text-lg ${
                mode === 'dialog' ? 'bg-[#1E3A5F] text-white' : 'text-gray-500 hover:bg-gray-50'
              }`}
              onClick={() => setMode('dialog')}
            >
              💬 对话模式
            </button>
          </div>
        </div>
        {mode === 'form' ? (
          tool.param_schema && tool.param_schema.length > 0 ? (
            <DynamicToolPage tool={tool} />
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">该工具的表单模式正在开发中...</p>
            </div>
          )
        ) : (
          <DialogMode tool={tool} />
        )}
      </div>
    </section>
  );
}