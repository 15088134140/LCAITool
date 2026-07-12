import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./lib/utils";

export interface PaginationProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 当前页码（1-based） */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总记录数；为 0 时组件不渲染 */
  total: number;
  /** 可选每页条数，默认 [10, 20, 50] */
  pageSizeOptions?: number[];
  /** 是否显示跳页输入框，默认 true */
  showQuickJumper?: boolean;
  /** 是否显示每页条数选择器，默认 true */
  showSizeChanger?: boolean;
  /** 页码变化回调 */
  onPageChange: (page: number) => void;
  /** 每页条数变化回调 */
  onPageSizeChange?: (size: number) => void;
}

/**
 * 统一分页器：页码窗口 + 上下页 + 跳页输入 + 每页条数选择。
 *
 * 替代各列表页手写的 Variant A（5 页码窗口）/ Variant B（仅上下页）。
 * `total === 0` 时不渲染，修复旧实现空数据仍显示分页栏的问题。
 */
const Pagination = React.forwardRef<HTMLDivElement, PaginationProps>(
  (
    {
      page,
      pageSize,
      total,
      pageSizeOptions = [10, 20, 50],
      showQuickJumper = true,
      showSizeChanger = true,
      onPageChange,
      onPageSizeChange,
      className,
      ...props
    },
    ref
  ) => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(Math.max(1, page), totalPages);

    const [jumpInput, setJumpInput] = React.useState(String(safePage));
    React.useEffect(() => {
      setJumpInput(String(safePage));
    }, [safePage]);

    // total === 0 时不渲染分页栏
    if (total === 0) return null;

    // 页码窗口：最多 5 个，current 居中
    const getWindowPages = (): number[] => {
      const maxButtons = 5;
      if (totalPages <= maxButtons) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
      }
      let start = Math.max(1, safePage - 2);
      const end = Math.min(totalPages, start + maxButtons - 1);
      start = Math.max(1, end - maxButtons + 1);
      return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    const handleJump = () => {
      const target = parseInt(jumpInput, 10);
      if (Number.isNaN(target)) {
        setJumpInput(String(safePage));
        return;
      }
      const clamped = Math.min(Math.max(1, target), totalPages);
      setJumpInput(String(clamped));
      if (clamped !== safePage) onPageChange(clamped);
    };

    const pageBtnClass = (active: boolean) =>
      cn(
        "min-w-[2.25rem] h-9 px-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-brand-dark text-white"
          : "border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
      );

    const arrowBtnClass =
      "p-2 rounded-lg border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors";

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-100",
          className
        )}
        {...props}
      >
        <div className="text-sm text-muted-foreground">
          共 {total} 条记录，第 {safePage} / {totalPages} 页
        </div>

        <div className="flex items-center gap-2">
          {showSizeChanger && onPageSizeChange && (
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 px-2 border border-input bg-background rounded-lg text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="每页条数"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} 条/页
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className={cn(arrowBtnClass, "disabled:opacity-50 disabled:cursor-not-allowed")}
            aria-label="上一页"
          >
            <ChevronLeft size={16} />
          </button>

          {getWindowPages().map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={pageBtnClass(p === safePage)}
              aria-label={`第 ${p} 页`}
              aria-current={p === safePage ? "page" : undefined}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={cn(arrowBtnClass, "disabled:opacity-50 disabled:cursor-not-allowed")}
            aria-label="下一页"
          >
            <ChevronRight size={16} />
          </button>

          {showQuickJumper && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>跳至</span>
              <input
                type="text"
                value={jumpInput}
                onChange={(e) => setJumpInput(e.target.value)}
                onBlur={handleJump}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="w-12 h-9 px-2 text-center border border-input bg-background rounded-lg text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="跳转到指定页"
              />
              <span>页</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);
Pagination.displayName = "Pagination";

export { Pagination };
