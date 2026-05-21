'use client';

import { cn } from "@/lib/utils";

interface ProgressBarProps {
  progress: number; // 0-100
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'timeout';
}

export function ProgressBar({
  progress,
  showPercentage = true,
  size = 'md',
  animated = true,
  status = 'running'
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const getColorClasses = () => {
    switch (status) {
      case 'completed':
        return 'from-success-dark to-success-light';
      case 'failed':
      case 'timeout':
        return 'from-red-500 to-red-600';
      case 'pending':
        return 'from-gray-300 to-gray-400';
      default:
        return 'from-success-dark to-success-light';
    }
  };

  return (
    <div className="w-full">
      <div
        className={cn(
          'w-full bg-[#E4E7EB] rounded-full overflow-hidden',
          heightClasses[size]
        )}
      >
        <div
          className={cn(
            'h-full bg-gradient-to-r rounded-full transition-all duration-500 ease-out',
            getColorClasses(),
            animated && status === 'running' && 'animate-pulse'
          )}
          style={{
            width: `${clampedProgress}%`
          }}
        />
      </div>
      {showPercentage && (
        <div className="flex justify-between mt-2 text-sm">
          <span className="text-text-secondary">
            {status === 'pending' ? '等待开始...' :
             status === 'running' ? '处理中...' :
             status === 'completed' ? '已完成' :
             status === 'failed' ? '处理失败' : '已超时'}
          </span>
          <span className={cn(
            'font-semibold',
            status === 'failed' || status === 'timeout' ? 'text-red-500' :
            status === 'completed' ? 'text-success-dark' : 'text-brand-dark'
          )}>
            {Math.round(clampedProgress)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export function StepIndicator({
  currentStep,
  totalSteps,
  steps,
  status = 'running'
}: StepIndicatorProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCompleted = stepNumber < currentStep;
        const isCurrent = stepNumber === currentStep;
        const isPending = stepNumber > currentStep;

        let stepStatus: 'completed' | 'current' | 'pending' | 'error' = isCompleted ? 'completed' : isCurrent ? 'current' : 'pending';
        if (status === 'failed' && isCurrent) {
          stepStatus = 'error';
        }

        return (
          <div key={index} className="flex items-center gap-4">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300',
                stepStatus === 'completed' ? 'bg-gradient-to-br from-success-dark to-success-light text-white shadow-md' :
                stepStatus === 'current' ? 'bg-gradient-to-br from-brand-dark to-brand-light text-white shadow-md animate-pulse' :
                stepStatus === 'error' ? 'bg-red-500 text-white shadow-md' :
                'bg-gray-200 text-gray-400 border-2 border-dashed border-gray-300'
              )}>
                {stepStatus === 'completed' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : stepStatus === 'error' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  stepNumber
                )}
              </div>
              {/* Vertical Line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  'w-0.5 h-8 my-1 transition-colors duration-300',
                  isCompleted ? 'bg-success-light' : 'bg-gray-200'
                )} />
              )}
            </div>
            {/* Step Text */}
            <div className="flex-1 py-1">
              <p className={cn(
                'font-medium transition-colors duration-300',
                isCompleted ? 'text-success-dark' :
                isCurrent ? 'text-brand-dark' :
                'text-gray-400'
              )}>
                {step}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ProgressBar;
