# 设计系统规范

## 色彩系统

| 用途       | 色值                  | 说明                         |
| ---------- | --------------------- | ---------------------------- |
| 主色调     | `#1E3A5F`             | 深蓝色，品牌主色。           |
| 主色调渐变 | `#2563EB`             | 蓝色，强调和渐变。           |
| 强调色     | `#059669` → `#10B981` | 绿色渐变，主按钮、成功状态。 |
| 边框色     | `#E4E7EB`             | 浅灰，卡片边框。             |
| 背景色     | `#F8FAFC`             | 极浅蓝，悬浮背景。           |
| 文字色     | `#1F2937`             | 深灰，主文字。               |

## 字体规范

- 首选字体：`DM Sans`。
- 备用字体：`system-ui, -apple-system, sans-serif`。
- 字体粗细：400（常规）、500（中等）、700（粗体）。

## 组件交互规范

```css
.card-hover {
  transition: all 0.25s ease-out;
}
.card-hover:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(30, 58, 95, 0.12);
}

.btn-primary {
  background: linear-gradient(135deg, #059669 0%, #10b981 100%);
}
.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(5, 150, 105, 0.3);
}

.progress-fill {
  background: linear-gradient(90deg, #059669, #10b981);
}
```
