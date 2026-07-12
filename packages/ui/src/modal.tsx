import * as React from "react";
import { X } from "lucide-react";
import { cn } from "./lib/utils";

export interface ModalProps {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  /** 传入则显示底部"取消/确认"按钮;不传则由 children 自行处理按钮(表单型)。 */
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
} as const;

/**
 * 统一 Modal:替代各列表页逐字重复的内联 Modal 定义。
 * - 确认型:传 onConfirm,显示底部"取消/确认"按钮(支持 danger 红色)。
 * - 表单型:不传 onConfirm,children 内自行渲染 form 与提交按钮。
 */
const Modal = ({
  title,
  children,
  onClose,
  onConfirm,
  confirmText = "确定",
  cancelText = "取消",
  confirmVariant = "primary",
  size = "md",
  className,
}: ModalProps) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div
      className={cn(
        "relative bg-white rounded-xl shadow-xl w-full mx-4 p-6",
        sizeMap[size],
        className
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="关闭"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      {onConfirm ? <div className="mb-6">{children}</div> : children}
      {onConfirm && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 rounded-lg text-white transition-colors",
              confirmVariant === "danger"
                ? "bg-red-500 hover:bg-red-600"
                : "bg-brand-dark hover:bg-brand-dark/90"
            )}
          >
            {confirmText}
          </button>
        </div>
      )}
    </div>
  </div>
);

export { Modal };
