'use client';

import { useEffect, useState } from 'react';

interface ProgressStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  subProgress?: string;
}

interface ProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  steps: ProgressStep[];
  currentStep: number;
  progress: number;
  message: string;
  isRunning: boolean;
  onCancel: () => void;
}

export function ProgressModal({
  isOpen,
  onClose,
  title,
  steps,
  currentStep,
  progress,
  message,
  isRunning,
  onCancel,
}: ProgressModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-r from-green-600 to-green-500 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center">
              {isRunning ? (
                <svg className="w-8 h-8 text-green-600 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <h3 className="text-xl font-bold text-brand-dark">{title}</h3>
          <p className="text-gray-500 mt-2">{message}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">
              步骤 {currentStep}/{steps.length}
            </span>
            <span className="font-medium text-green-600">{progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-600 to-green-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-3 mb-6">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`flex items-center gap-3 p-3 rounded-lg ${
                step.status === 'completed' ? 'bg-green-50' :
                step.status === 'running' ? 'bg-blue-50' :
                step.status === 'failed' ? 'bg-red-50' :
                'bg-gray-50'
              }`}
            >
              {step.status === 'completed' ? (
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : step.status === 'running' ? (
                <div className="w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent animate-spin flex-shrink-0" />
              ) : step.status === 'failed' ? (
                <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
              )}
              <div className="flex-1">
                <span className={`font-medium ${
                  step.status === 'completed' ? 'text-green-600' :
                  step.status === 'running' ? 'text-blue-600' :
                  step.status === 'failed' ? 'text-red-600' :
                  'text-gray-500'
                }`}>{step.name}</span>
                {step.subProgress && (
                  <span className="text-xs text-gray-400 ml-2">{step.subProgress}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Cancel Button */}
        {isRunning && (
          <button
            className="w-full py-3 border border-gray-200 text-gray-500 rounded-xl font-medium hover:bg-gray-50 transition-all"
            onClick={onCancel}
          >
            取消生成
          </button>
        )}
      </div>
    </div>
  );
}

export default ProgressModal;
