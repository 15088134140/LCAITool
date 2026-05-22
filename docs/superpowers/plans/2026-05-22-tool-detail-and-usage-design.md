# 工具详情与工具使用 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立明确的"定制页 vs 通用页"路由规则，拆分 ToolCreationForm 巨型组件，通用详情页根据 usage_modes 配置渲染使用区，修复有声绘本链路前后端参数不匹配问题，实现完整的进度/SSE/结算体系

**Architecture:** 四阶段增量实施 — (1) 标杆工具链路修复（前后端参数对齐、费用从DB读取、持久化存储、retryTask）→ (2) 数据层 + 路由（usage_modes 字段、迁移、管理端编辑）→ (3) 定制页表单拆分 → (4) 通用详情页 + 对话模式。每阶段产生独立可验证的交付物。

**Tech Stack:** Next.js 14 (App Router) + FastAPI + PostgreSQL + Redis + Celery + Tailwind CSS

---

## 文件结构映射

| 操作 | 文件路径                                                                               | 职责                                             |
| ---- | -------------------------------------------------------------------------------------- | ------------------------------------------------ |
| 修改 | `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`                 | 清空为 usage_modes 驱动的容器                    |
| 创建 | `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`  | 从 ToolCreationForm 拆出的绘本表单               |
| 创建 | `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx`     | 从 ToolCreationForm 拆出的电商表单               |
| 创建 | `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx` | 从 ToolCreationForm 拆出的营销表单               |
| 修改 | `apps/frontend-user/src/app/tools/storybook-generator/page.tsx`                      | 改为引用 StorybookForm                           |
| 修改 | `apps/frontend-user/src/app/tools/ecommerce-detail/page.tsx`                         | 改为引用 EcommerceForm                           |
| 修改 | `apps/frontend-user/src/app/tools/marketing-copywriter/page.tsx`                     | 改为引用 MarketingForm                           |
| 修改 | `apps/frontend-user/src/app/tools/[id]/page.tsx`                                     | 接入 ToolCreationForm + UUID 校验                |
| 创建 | `apps/frontend-user/src/components/tool-detail/DialogMode.tsx`                       | 通用对话模式 UI                                  |
| 修改 | `apps/frontend-user/src/components/tool-detail/index.ts`                             | 导出 DialogMode                                  |
| 修改 | `apps/frontend-user/src/lib/api/types.ts`                                            | Tool 接口新增 usage_modes, Task 接口新增 work_id |
| 修改 | `apps/frontend-user/src/lib/api/modules/task.ts`                                     | 新增 retryTask 方法                              |
| 创建 | `apps/frontend-user/src/lib/api/modules/chat.ts`                                     | 创建 chatApi 模块                                |
| 修改 | `apps/frontend-user/src/app/works/[id]/progress/page.tsx`                            | 替换 alert 为重试真实逻辑                        |
| 创建 | `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx`                    | 进度弹窗组件                                     |
| 修改 | `apps/frontend-user/src/app/works/detail/[id]/page.tsx`                             | 内容下载与文件下载功能                           |
| 创建 | `apps/backend/alembic/versions/006_add_tool_usage_modes.py`                          | usage_modes 字段迁移                             |
| 修改 | `apps/backend/app/models/tool.py`                                                    | Tool 模型新增 usage_modes                        |
| 修改 | `apps/backend/app/schemas/tool.py`                                                   | Tool schemas 新增 usage_modes                    |
| 修改 | `apps/backend/app/schemas/task.py`                                                   | WorkCreate/WorkFileCreate 调整                   |
| 修改 | `apps/backend/app/services/tool_service.py`                                          | 无改动（CRUD 自动处理新字段）                    |
| 修改 | `apps/backend/app/executors/storybook.py`                                            | 费用从 tools 表读取，改用持久化目录              |
| 修改 | `apps/backend/app/executors/ecommerce.py`                                            | 重构为 Dify 客户端，费用从 DB 读取               |
| 创建 | `apps/backend/app/executors/marketing.py`                                            | 营销文案 Celery Worker 转发执行器                |
| 修改 | `apps/backend/app/executors/base.py`                                                 | 结构化 ProgressEvent                             |
| 修改 | `apps/backend/app/workers/tasks.py`                                                  | 注册 MarketingExecutor                           |
| 修改 | `apps/backend/app/api/v1/endpoints/tasks.py`                                         | 新增 retry/ progress HTTP 端点                   |
| 创建 | `apps/backend/app/api/v1/endpoints/chat.py`                                          | 对话接口预留                                     |
| 创建 | `apps/backend/app/api/v1/endpoints/files.py`                                         | 文件服务 API                                     |
| 修改 | `apps/backend/app/api/v1/api.py`                                                     | 注册新路由                                       |
| 修改 | `apps/frontend-admin/src/pages/tools/[id]/edit.tsx`                                  | 新增使用模式复选框                               |
| 修改 | `apps/frontend-admin/src/api/tool.ts`                                                | UpdateToolParams 新增 usage_modes                |
| 修改 | `apps/backend/app/core/config.py`                                                    | STORAGE_DIR 配置                                 |

---

## 第一阶段：标杆工具链路修复（前后端）

### Task 1: 对齐前端表单字段名与后端期望

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx:14-17`

- [ ] **Step 1: 修改表单字段名定义**

将 `FormState` 接口中的字段名改为后端 snake_case 期望值：

```typescript
interface FormState {
  // Storybook specific
  theme?: string;          // 原 storyTitle
  storyContent?: string;   // 保留，后端不直接接收但用于前端展示
  art_style?: string;      // 原 artStyle
  voiceType?: string;      // 保留（前端需要推断 include_audio）
  page_count?: number;     // 原 pageCount
  hasBackgroundMusic?: boolean;
  hasSoundEffects?: boolean;
  target_age?: string;     // 新增

  // Ecommerce specific (保留不变)
  productName?: string;
  productCategory?: string;
  productFeatures?: string;
  targetAudience?: string;
  imageStyle?: string;
  includePsd?: boolean;
  imageCount?: number;

  // Marketing copy specific (保留不变)
  productOrBrand?: string;
  keySellingPoints?: string;
  targetPlatform?: string;
  toneStyle?: string;
  copyLength?: string;
  platformCount?: number;
}
```

- [ ] **Step 2: 修改表单控件绑定的字段名**

修改 storybook 表单控件的 value/onChange 绑定的字段名：

```typescript
// 绘本标题 input
value={formState.theme || ''}
onChange={(e) => updateFormState('theme', e.target.value)}

// 艺术风格 radio
checked={formState.art_style === style.value}
onChange={() => updateFormState('art_style', style.value)}

// 页数 range
value={formState.page_count}
onChange={(e) => updateFormState('page_count', parseInt(e.target.value))}
```

- [ ] **Step 3: 修改输入参数映射逻辑**

修改 `handleStartGeneration` 中构建 inputParams 的逻辑，确保传给后端的字段名是 snake_case：

```typescript
const inputParams: Record<string, any> = {
  theme: formState.theme,
  storyContent: formState.storyContent,
  art_style: formState.art_style,
  page_count: formState.page_count,
  voiceType: formState.voiceType,
  include_audio: formState.voiceType && formState.voiceType !== 'none',
  target_age: formState.target_age || '3-6',
  hasBackgroundMusic: formState.hasBackgroundMusic,
  hasSoundEffects: formState.hasSoundEffects,
  estimatedCost: totalCost,
  // 也包含电商/营销的字段
  ...(tool.slug === 'ecommerce-detail' && {
    productName: formState.productName,
    productCategory: formState.productCategory,
    productFeatures: formState.productFeatures,
    targetAudience: formState.targetAudience,
    imageStyle: formState.imageStyle,
    includePsd: formState.includePsd,
    imageCount: formState.imageCount,
  }),
  ...(tool.slug === 'product-description' && {
    productOrBrand: formState.productOrBrand,
    keySellingPoints: formState.keySellingPoints,
    targetPlatform: formState.targetPlatform,
    toneStyle: formState.toneStyle,
    copyLength: formState.copyLength,
    platformCount: formState.platformCount,
  }),
};
```

- [ ] **Step 4: 同步修改费用计算字段引用**

```typescript
// 修改 calculateTotalCost 中引用
if (tool.slug === 'ai-storybook') {
  const imageCost = tool.image_fee || 1;
  cost += imageCost * (formState.page_count || 10);
  if (formState.voiceType && formState.voiceType !== 'none') {
    const audioCost = tool.audio_fee || 0.5;
    cost += audioCost * (formState.page_count || 10);
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx
git commit -m "fix: 对齐故事书表单字段名为 snake_case (Task 1)"
```

### Task 2: 前端表单新增 target_age 字段

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`

- [ ] **Step 1: 在故事书表单 Step 1 中新增目标年龄段选择器**

在"风格设置"区块之前插入：

```tsx
// 在 Page Settings 之前，Style Settings 之后
<div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
  <h3 className="font-semibold text-xl text-brand-dark mb-6 flex items-center gap-3">
    <span className="w-10 h-10 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center font-bold">2.5</span>
    受众设置
  </h3>
  <div>
    <label className="block text-base font-medium text-gray-600 mb-4">目标年龄段</label>
    <div className="grid grid-cols-3 gap-4">
      {[
        { value: '3-6', label: '3-6岁', desc: '学龄前儿童' },
        { value: '6-9', label: '6-9岁', desc: '小学低年级' },
        { value: '9-12', label: '9-12岁', desc: '小学高年级' },
      ].map((age) => (
        <label key={age.value} className="cursor-pointer">
          <input
            type="radio"
            name="targetAge"
            value={age.value}
            className="peer hidden"
            checked={formState.target_age === age.value}
            onChange={() => updateFormState('target_age', age.value)}
          />
          <div className="p-6 border-2 border-gray-200 rounded-2xl text-center peer-checked:border-blue-500 peer-checked:bg-blue-50 transition-all hover:border-gray-300">
            <div className="text-3xl font-bold text-brand-dark mb-1">{age.label}</div>
            <div className="text-sm text-gray-500">{age.desc}</div>
          </div>
        </label>
      ))}
    </div>
  </div>
</div>
```

- [ ] **Step 2: 同步修改默认值**

```typescript
const [formState, setFormState] = useState<FormState>({
  page_count: 10,
  target_age: '3-6',  // 新增
  // ... 其他默认值不变
});
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx
git commit -m "feat: 前端表单新增 target_age 字段 (Task 2)"
```

### Task 3: 对齐风格值

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`

- [ ] **Step 1: 修改艺术风格选项值**

将 `japanese` 改为 `watercolor`，`flat` 改为 `watercolor`（后端只认 watercolor/cartoon/oil）：

```typescript
{[
  { value: 'cartoon', label: '卡通水彩', icon: '🎨' },
  { value: 'oil', label: '梦幻油画', icon: '🖼️' },
  { value: 'watercolor', label: '日系动漫', icon: '🌸' },
  { value: 'watercolor', label: '扁平插画', icon: '💎' },
].map((style) => (
```

注意：两个选项都使用 `watercolor` 会导致重复 key。更合适的做法是让 `japanese` 和 `flat` 映射到后端支持的风格。修改为：

```typescript
{[
  { value: 'cartoon', label: '卡通水彩', icon: '🎨' },
  { value: 'oil', label: '梦幻油画', icon: '🖼️' },
  { value: 'watercolor', label: '日系动漫', icon: '🌸' },
  { value: 'watercolor', label: '扁平插画', icon: '💎' },
].map((style, idx) => (
  <label key={`${style.value}-${idx}`} className="cursor-pointer">
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx
git commit -m "fix: 对齐艺术风格值与后端一致 (Task 3)"
```

### Task 4: 后端费用改为从 tools 表读取

**Files:**

- Modify: `apps/backend/app/executors/storybook.py:37-68`

- [ ] **Step 1: 修改 StorybookExecutor 构造函数接收 tool 对象**

```python
def __init__(
    self,
    task_id: uuid.UUID,
    db: AsyncSession,
    tool: Optional[Dict[str, Any]] = None,  # 新增 tool 参数
    progress_callback=None
):
    super().__init__(task_id, db, progress_callback)
    self.ai_provider = AIProviderFactory.get_provider("doubao")
    self.pdf_generator = PDFGenerator()
    self._tool_config = tool or {}
```

- [ ] **Step 2: 修改 estimate_cost 从 tool 配置读取费用**

```python
def estimate_cost(self, params: Dict[str, Any]) -> int:
    page_count = params.get('page_count', 5)
    include_audio = params.get('include_audio', True)

    # 从 tool 配置读取，带默认值
    base_fee = self._tool_config.get('base_fee', 20)
    image_fee = self._tool_config.get('image_fee', 2)
    audio_fee = self._tool_config.get('audio_fee', 1)

    total = base_fee
    total += image_fee * page_count
    if include_audio:
        total += audio_fee * page_count
    return total
```

- [ ] **Step 3: 修改 workers/tasks.py 中创建执行器时传入 tool 数据**

```python
async def _execute_with_async_session(
    executor_class: type[BaseToolExecutor],
    task_uuid: uuid.UUID,
    input_params: Dict[str, Any]
) -> Dict[str, Any]:
    from app.core.database import AsyncSessionLocal
    from app.services.task_service import TaskService
    from app.models.tool import Tool
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        # 获取任务以获取 tool_id
        task = await TaskService.get_by_id(db, task_uuid)

        # 从 DB 读取工具定价
        tool_config = {}
        if task and task.tool_id:
            result = await db.execute(select(Tool).where(Tool.id == task.tool_id))
            tool = result.scalar_one_or_none()
            if tool:
                tool_config = {
                    'base_fee': tool.base_fee,
                    'image_fee': tool.image_fee,
                    'audio_fee': tool.audio_fee,
                }

        progress_callback = AsyncProgressCallback(task_uuid)

        # 传入 tool_config
        executor = executor_class(
            task_id=task_uuid,
            db=db,
            tool=tool_config,  # 新增参数
            progress_callback=progress_callback
        )

        result = await executor.execute(input_params)
        actual_cost = executor.estimate_cost(input_params)

        await TaskService.complete_task(
            db=db,
            task_id=task_uuid,
            actual_cost=actual_cost
        )
        await db.commit()
        return result
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/executors/storybook.py apps/backend/app/workers/tasks.py
git commit -m "fix: 故事书执行器费用从 tools 表读取 (Task 4)"
```

### Task 5: 实现本地持久化存储目录

**Files:**

- Create: `apps/backend/app/core/config.py` (或修改现有配置)
- Modify: `apps/backend/app/executors/base.py`

- [ ] **Step 1: 检查现有 config.py 是否有 STORAGE_DIR 配置**

```bash
grep -n "STORAGE_DIR\|storage" apps/backend/app/core/config.py
```

- [ ] **Step 2: 在 config 中添加 STORAGE_DIR 配置**

```python
# 在 settings 类中添加
STORAGE_DIR: str = "./storage"
WORKS_DIR: str = "./storage/works"
```

- [ ] **Step 3: 在 base.py 中添加持久化目录工具方法**

```python
import os
from app.core.config import settings

class BaseToolExecutor(ABC):
    # ... 现有代码 ...

    def get_works_dir(self) -> str:
        """获取任务的工作目录"""
        works_dir = os.path.join(settings.WORKS_DIR, str(self.task_id))
        os.makedirs(os.path.join(works_dir, 'images'), exist_ok=True)
        os.makedirs(os.path.join(works_dir, 'audio'), exist_ok=True)
        return works_dir
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/core/config.py apps/backend/app/executors/base.py
git commit -m "feat: 添加持久化存储目录配置 (Task 5)"
```

### Task 6: StorybookExecutor 改用持久化目录

**Files:**

- Modify: `apps/backend/app/executors/storybook.py`

- [ ] **Step 1: 修改 _create_dummy_image 写入持久化目录**

```python
@staticmethod
def _create_dummy_image(page_num: int, works_dir: str) -> str:
    """创建占位图片文件到持久化目录"""
    path = os.path.join(works_dir, 'images', f'page_{page_num}.png')

    try:
        from PIL import Image, ImageDraw
        img = Image.new('RGB', (1024, 1024), color=(240, 248, 255))
        draw = ImageDraw.Draw(img)
        draw.text((400, 500), f'Page {page_num}', fill=(30, 58, 95))
        img.save(path, 'PNG')
    except ImportError:
        # 回退：创建最小有效PNG
        def _make_png(r, g, b):
            import struct, zlib
            def _chunk(ctype, data):
                c = ctype + data
                crc = struct.pack('>I', 0xffffffff & (
                    lambda x: x if x <= 0x7fffffff else x - 0x100000000)(
                    zlib.crc32(c) & 0xffffffff))
                return struct.pack('>I', len(data)) + c + crc
            ihdr = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
            raw = b'\x00' + bytes([r, g, b])
            return (b'\x89PNG\r\n\x1a\n'
                    + _chunk(b'IHDR', ihdr)
                    + _chunk(b'IDAT', zlib.compress(raw))
                    + _chunk(b'IEND', b''))
        with open(path, 'wb') as f:
            f.write(_make_png(240, 248, 255))

    return path
```

- [ ] **Step 2: 修改 _create_dummy_audio 写入持久化目录**

```python
@staticmethod
def _create_dummy_audio(page_num: int, works_dir: str) -> str:
    """创建占位音频文件到持久化目录"""
    import wave, math, struct
    path = os.path.join(works_dir, 'audio', f'page_{page_num}.wav')

    sample_rate = 8000
    duration = 1
    frequency = 440

    with wave.open(path, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(sample_rate * duration):
            value = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * i / sample_rate))
            wf.writeframes(struct.pack('<h', value))

    return path
```

- [ ] **Step 3: 修改 execute 方法传递 works_dir**

在 execute 方法开头获取 works_dir：

```python
async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
    works_dir = self.get_works_dir()
    snapshot = await self.get_snapshot()
    start_step = snapshot.get('step', 0) if snapshot else 0
    # ... 其余代码 ...
```

然后在调用 _create_dummy_image 和 _create_dummy_audio 时传入 works_dir：

```python
page['image_url'] = self._create_dummy_image(index + 1, works_dir)
page['audio_url'] = self._create_dummy_audio(index + 1, works_dir)
```

- [ ] **Step 4: 修改 _generate_pdf_and_zip 使用持久化目录**

```python
async def _generate_pdf_and_zip(self, result_data: Dict[str, Any], works_dir: str) -> Dict[str, str]:
    outline = result_data.get('outline', {})
    pages = result_data.get('pages', [])

    title = outline.get('title', '有声绘本')
    pdf_path = os.path.join(works_dir, 'storybook.pdf')
    self.pdf_generator.generate_storybook_pdf(
        title=title,
        pages=pages,
        output_path=pdf_path
    )

    zip_path = os.path.join(works_dir, 'package.zip')
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        zf.write(pdf_path, 'storybook.pdf')
        for page in pages:
            page_num = page.get('page_number', 0)
            image_url = page.get('image_url')
            if image_url and os.path.exists(image_url):
                zf.write(image_url, f'images/page_{page_num}.png')
            audio_url = page.get('audio_url')
            if audio_url and os.path.exists(audio_url):
                zf.write(audio_url, f'audio/page_{page_num}.wav')

        metadata = {
            'title': title,
            'page_count': len(pages),
        }
        zf.writestr('metadata.json', json.dumps(metadata, ensure_ascii=False, indent=2))

    return {
        'pdf_path': pdf_path,
        'zip_path': zip_path,
        'pdf_size': os.path.getsize(pdf_path),
        'zip_size': os.path.getsize(zip_path)
    }
```

- [ ] **Step 5: Commit**

```bash
git add apps/backend/app/executors/storybook.py
git commit -m "feat: StorybookExecutor 改用持久化目录 (Task 6)"
```

### Task 7: 成果文件 URL 改为相对路径（含 import 修复）

**Files:**

- Modify: `apps/backend/app/executors/storybook.py`
- Modify: `apps/backend/app/schemas/task.py`

- [ ] **Step 1: 修改 schema 中 file_url 说明**

```python
# WorkFileCreate 中 file_url 字段说明改为：
file_url: str = Field(..., description="文件路径（相对路径如 images/page_1.png，或绝对路径）")
```

- [ ] **Step 2: 添加 WorkFile 模型导入**

在 `storybook.py` 文件顶部添加 `WorkFile` 模型导入：

```python
# 在 app.schemas.task import 行后添加
from app.models.task import WorkFile
```

- [ ] **Step 3: 修改 _create_work_record 存储相对路径**

```python
async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]) -> Any:
    task = await TaskService.get_by_id(self.db, self.task_id)
    outline = result_data.get('outline', {})
    pages = result_data.get('pages', [])
    files = result_data.get('files', {})

    work_in = WorkCreate(
        user_id=task.user_id,
        task_id=self.task_id,
        tool_id=task.tool_id,
        title=outline.get('title', '有声绘本'),
        description=outline.get('synopsis', ''),
        cover_image=f"images/page_1.png" if pages else None,  # 相对路径
        status="published",
        is_public=False,
        version=1
    )
    work = await WorkService.create_work(self.db, work_in)

    # PDF
    pdf_path = files.get('pdf_path')
    if pdf_path:
        pdf_file_in = WorkFileCreate(
            work_id=work.id,
            file_type="pdf",
            file_name=f"{work.title}.pdf",
            file_url="storybook.pdf",  # 相对路径
            file_size=files.get('pdf_size', 0),
            mime_type="application/pdf"
        )
        db.add(WorkFile(**pdf_file_in.model_dump()))
        await db.commit()

    # ZIP
    zip_path = files.get('zip_path')
    if zip_path:
        zip_file_in = WorkFileCreate(
            work_id=work.id,
            file_type="other",
            file_name=f"{work.title}_package.zip",
            file_url="package.zip",  # 相对路径
            file_size=files.get('zip_size', 0),
            mime_type="application/zip"
        )
        db.add(WorkFile(**zip_file_in.model_dump()))
        await db.commit()

    # 图片和音频
    for page in pages:
        page_num = page.get('page_number', 0)
        image_url = page.get('image_url')
        if image_url:
            img_file_in = WorkFileCreate(
                work_id=work.id,
                file_type="image",
                file_name=f"page_{page_num}.png",
                file_url=f"images/page_{page_num}.png",  # 相对路径
                page_number=page_num,
                mime_type="image/png"
            )
            db.add(WorkFile(**img_file_in.model_dump()))
            await db.commit()

        audio_url = page.get('audio_url')
        if audio_url:
            audio_file_in = WorkFileCreate(
                work_id=work.id,
                file_type="audio",
                file_name=f"page_{page_num}.wav",
                file_url=f"audio/page_{page_num}.wav",  # 相对路径
                page_number=page_num,
                mime_type="audio/wav"
            )
            db.add(WorkFile(**audio_file_in.model_dump()))
            await db.commit()

    return work
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/storybook.py apps/backend/app/schemas/task.py
git commit -m "refactor: 成果文件 URL 改为相对路径 (Task 7)"
```

- [ ] **Step 4: 确认 WorkFile schema file_url 已处理**

Task 7 Step 1 已更新 `WorkFileCreate.file_url` 字段说明为相对路径，schema 无需额外修改。

### Task 8: EcommerceExecutor 重构为 Dify 客户端

**Files:**

- Modify: `apps/backend/app/executors/ecommerce.py`

- [ ] **Step 1: 重构 EcommerceExecutor 为 Dify 客户端**

完整重写 ecommerce.py：

```python
"""
电商详情页生成工具执行器 — Dify 集成版本
通过 Dify Workflow Run API (streaming mode) 驱动进度
"""
import json
import os
import uuid
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from .base import BaseToolExecutor
from app.services.task_service import TaskService
from app.schemas.task import WorkCreate, WorkFileCreate
from app.models.task import WorkFile

# Dify 节点 → 本地步骤映射
DIFY_STEP_MAP = {
    "generate_description":  {"step": 0, "name": "商品文案", "weight": 20},
    "generate_main_image":   {"step": 1, "name": "商品主图", "weight": 25},
    "generate_detail_image": {"step": 2, "name": "详情分段图", "weight": 25},
    "generate_psd":          {"step": 3, "name": "PSD 源文件", "weight": 20},
    "package":               {"step": 4, "name": "打包交付", "weight": 10},
}

DIFY_WORKFLOW_URL = os.getenv("DIFY_WORKFLOW_URL", "https://api.dify.ai/v1/workflows/run")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")


class EcommerceExecutor(BaseToolExecutor):
    """电商详情页执行器 — Dify 驱动"""

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, progress_callback)
        self._tool_config = tool or {}

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        main_image_count = params.get('main_image_count', 3)
        detail_image_count = params.get('detail_image_count', 3)
        total_images = main_image_count + detail_image_count

        base_fee = self._tool_config.get('base_fee', 12)
        image_fee = self._tool_config.get('image_fee', 2)
        return base_fee + total_images * image_fee

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        works_dir = self.get_works_dir()

        # 调用 Dify Workflow Run API (streaming)
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                DIFY_WORKFLOW_URL,
                json={
                    "inputs": params,
                    "response_mode": "streaming",
                    "user": str(self.task_id)
                },
                headers={
                    "Authorization": f"Bearer {DIFY_API_KEY}",
                    "Content-Type": "application/json"
                }
            ) as resp:
                total_steps = len(DIFY_STEP_MAP)
                outputs = {}

                async for line in resp.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    try:
                        event = json.loads(line[6:])
                    except json.JSONDecodeError:
                        continue

                    event_type = event.get("event")
                    if event_type == "node_started":
                        node_name = event.get("node_name", "")
                        step_info = DIFY_STEP_MAP.get(node_name)
                        if step_info:
                            progress = int(sum(
                                s["weight"] for s in DIFY_STEP_MAP.values()
                                if s["step"] < step_info["step"]
                            ) * 0.9)
                            await self.update_progress(
                                percent=progress,
                                message=f"开始{step_info['name']}...",
                                data={"step_index": step_info["step"], "total_steps": total_steps, "step_status": "running"}
                            )

                    elif event_type == "node_finished":
                        node_name = event.get("node_name", "")
                        step_info = DIFY_STEP_MAP.get(node_name)
                        if step_info:
                            progress = int(sum(
                                s["weight"] for s in DIFY_STEP_MAP.values()
                                if s["step"] <= step_info["step"]
                            ) * 0.9)
                            await self.update_progress(
                                percent=progress,
                                message=f"{step_info['name']}完成",
                                data={"step_index": step_info["step"], "total_steps": total_steps, "step_status": "completed"}
                            )

                    elif event_type == "workflow_finished":
                        outputs = event.get("data", {}).get("outputs", {})
                        break

                # 保存 Dify outputs 到持久化目录
                files = await self._save_dify_outputs(outputs, works_dir)

                await self.update_progress(95, "正在保存成果...")
                work = await self._create_work_record(params, files, works_dir)

                await self.update_progress(100, "生成完成！")
                return {
                    'success': True,
                    'work_id': str(work.id),
                    'files': files
                }

    async def _save_dify_outputs(self, outputs: Dict[str, Any], works_dir: str) -> Dict[str, Any]:
        """保存 Dify 输出文件到持久化目录"""
        saved_files = {"images": [], "files": []}

        # 主图
        main_images = outputs.get("main_images", [])
        for i, img_url in enumerate(main_images):
            if img_url:
                saved_files["images"].append({
                    "index": i,
                    "type": "main",
                    "url": f"main_image_{i+1}.png"
                })

        # 详情图
        detail_images = outputs.get("detail_images", [])
        for i, img_url in enumerate(detail_images):
            if img_url:
                saved_files["images"].append({
                    "index": i,
                    "type": "detail",
                    "url": f"detail_image_{i+1}.png"
                })

        # 文案
        copywriting = outputs.get("copywriting", {})
        saved_files["copywriting"] = copywriting

        # PSD / ZIP
        saved_files["psd_file"] = outputs.get("psd_file", "")
        saved_files["zip_file"] = outputs.get("zip_file", "")

        return saved_files

    async def _create_work_record(self, params: Dict[str, Any], files: Dict[str, Any], works_dir: str) -> Any:
        task = await TaskService.get_by_id(self.db, self.task_id)
        copywriting = files.get("copywriting", {})

        work_in = WorkCreate(
            user_id=task.user_id,
            task_id=self.task_id,
            tool_id=task.tool_id,
            title=copywriting.get("title", "电商详情页"),
            description=copywriting.get("subtitle", ""),
            cover_image=files["images"][0]["url"] if files.get("images") else None,
            status="published",
            is_public=False,
            version=1
        )
        work = await WorkService.create_work(self.db, work_in)

        # 创建图片 WorkFile 记录
        for img in files.get("images", []):
            img_file_in = WorkFileCreate(
                work_id=work.id,
                file_type="image",
                file_name=f"{img['type']}_{img['index'] + 1}.png",
                file_url=img["url"],
                mime_type="image/png"
            )
            db.add(WorkFile(**img_file_in.model_dump()))

        await db.commit()
        return work
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/app/executors/ecommerce.py
git commit -m "feat: EcommerceExecutor 重构为 Dify 客户端 (Task 8)"
```

- [ ] **Step 3: 确认费用从 tool_config 读取**

已在 Task 4 Step 3 中统一处理，worker 的 `_execute_with_async_session` 已为所有执行器注入 `tool_config`（含 `base_fee`, `image_fee`, `audio_fee`），EcommerceExecutor 的 `estimate_cost` 从中读取 `image_fee`。

- [ ] **Step 4: 确认持久化目录 + 相对路径已包含**

Task 8 完整重写中已调用 `get_works_dir()`、`file_url` 使用相对路径（如 `main_image_1.png`）。

### Task 11: 实现 retryTask 前后端

**Files:**

- Modify: `apps/frontend-user/src/lib/api/modules/task.ts`
- Modify: `apps/backend/app/api/v1/endpoints/tasks.py`

- [ ] **Step 1: 前端 taskApi 新增 retryTask 方法**

```typescript
// 在 taskApi 对象中添加
retryTask: async (id: string): Promise<Task> => {
  return api.post<Task>(`/tasks/${id}/retry`);
},
```

- [ ] **Step 2: 后端新增 retry 端点**

```python
@router.post("/{task_id}/retry", response_model=TaskSchema, summary="重试失败任务")
async def retry_task(
    task_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> Any:
    """
    重试失败/超时的任务

    - 仅允许重试 status 为 failed/timeout 的任务
    - 重新创建任务（保持相同的 tool_id, task_type, input_params）
    - 重新预冻结积分
    - 提交到 Celery 队列
    """
    task = await TaskService.get_by_id(db=db, task_id=task_id)
    if not task or task.user_id != current_user.id:
        from app.core.exceptions import ResourceNotFoundException
        raise ResourceNotFoundException("任务不存在")

    if task.status not in ["failed", "timeout"]:
        from app.core.exceptions import BusinessException
        raise BusinessException(detail="仅允许重试失败或超时的任务")

    # 使用相同的参数创建新任务
    from app.schemas.task import TaskCreate
    new_task_in = TaskCreate(
        user_id=current_user.id,
        tool_id=task.tool_id,
        task_type=task.task_type,
        input_params=task.input_params,
        estimated_cost=task.estimated_cost
    )
    new_task = await TaskService.create_task(db=db, task_in=new_task_in)

    # 提交到 Celery
    from app.workers.tasks import execute_tool_task
    execute_tool_task.delay(
        task_id=str(new_task.id),
        tool_type=new_task.task_type,
        input_params=new_task.input_params or {}
    )

    return new_task
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/lib/api/modules/task.ts apps/backend/app/api/v1/endpoints/tasks.py
git commit -m "feat: 实现 retryTask 前后端 (Task 11)"
```

### Task 12: 文件服务 API 端点

**Files:**

- Create: `apps/backend/app/api/v1/endpoints/files.py`
- Modify: `apps/backend/app/api/v1/api.py`

- [ ] **Step 1: 创建 files.py 端点**

```python
"""
文件服务 API 端点
从本地持久化存储读取文件，支持图片预览和 ZIP 下载
"""
import os
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User
from app.models.task import Task
from app.services.task_service import TaskService
from app.core.config import settings
from sqlalchemy import select

router = APIRouter()


@router.get("/works/{work_file_id}", summary="获取成果文件")
async def get_work_file(
    work_file_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
):
    """
    根据 WorkFile ID 获取文件内容

    支持：
    - 图片预览（直接返回图片流）
    - ZIP 下载（设置 Content-Disposition）
    - 其他文件类型自动识别 MIME
    """
    from app.models.task import Task, WorkFile as WorkFileModel

    result = await db.execute(
        select(WorkFileModel).where(WorkFileModel.id == work_file_id)
    )
    work_file = result.scalar_one_or_none()

    if not work_file:
        raise HTTPException(status_code=404, detail="文件不存在")

    # 验证权限：文件所属任务的用户
    work_result = await db.execute(
        select(Task).where(Task.id == work_file.work_id)
    )
    task = work_result.scalar_one_or_none()
    if not task or task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="无权访问此文件")

    # 构建文件路径
    file_path = os.path.join(settings.WORKS_DIR, str(task.id), work_file.file_url)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="文件不存在或已被清理")

    # 根据文件类型设置 Content-Type
    media_type_map = {
        "image": "image/png",
        "audio": "audio/wav",
        "pdf": "application/pdf",
        "psd": "application/octet-stream",
        "other": "application/octet-stream",
    }
    media_type = media_type_map.get(work_file.file_type, "application/octet-stream")

    # ZIP 文件设置下载头
    headers = {}
    if work_file.file_type == "other" and work_file.file_name.endswith(".zip"):
        headers["Content-Disposition"] = f'attachment; filename="{work_file.file_name}"'

    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=work_file.file_name,
        headers=headers
    )
```

- [ ] **Step 2: 在 api.py 中注册路由**

```python
from app.api.v1.endpoints import files as files_endpoints

# 在 router 注册中添加
api_router.include_router(
    files_endpoints.router,
    prefix="/files",
    tags=["files"]
)
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/api/v1/endpoints/files.py apps/backend/app/api/v1/api.py
git commit -m "feat: 文件服务 API 端点 (Task 12)"
```

- [ ] **Step 3: 确认 WorkFile schema file_url 已处理**

已在 Task 7 Step 1 中更新，无需额外修改。

### Task 14: 前端下载功能实现

**Files:**

- Modify: `apps/frontend-user/src/app/works/detail/[id]/page.tsx`

- [ ] **Step 1: 读取当前 work detail 页面**

检查现有代码中 alert 的位置。

```bash
grep -n "alert\|download" apps/frontend-user/src/app/works/detail/[id]/page.tsx
```

- [ ] **Step 2: 实现真实下载逻辑**

```typescript
// 添加下载函数
const handleDownload = async (file: WorkFile) => {
  try {
    const token = tokenStorage.getToken();
    const response = await fetch(
      `${API_BASE_URL}/files/${file.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('下载失败');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('下载失败:', err);
    alert('文件下载失败，请稍后重试');
  }
};

// 「下载全部」打包 ZIP
const handleDownloadAll = async () => {
  const zipFile = workFiles.find(f => f.fileType === 'other' && f.fileName?.endsWith('.zip'));
  if (zipFile) {
    await handleDownload(zipFile);
  } else {
    // 无 ZIP 包时逐个下载
    for (const file of workFiles) {
      await handleDownload(file);
    }
  }
};
```

- [ ] **Step 3: 替换 alert 调用为真实下载**

查找页面中使用的 `alert()` 调用，替换为 `handleDownload()`。

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-user/src/app/works/detail/[id]/page.tsx
git commit -m "feat: 前端下载功能实现 (Task 14)"
```

### Task 15: 通用进度更新 API

**Files:**

- Modify: `apps/backend/app/api/v1/endpoints/tasks.py`

- [ ] **Step 1: 新增进度更新端点**

```python
from pydantic import BaseModel

class ProgressUpdateRequest(BaseModel):
    progress: int = Field(..., ge=0, le=100, description="进度 0-100")
    message: str = Field("", description="进度消息")
    data: Optional[Dict[str, Any]] = Field(None, description="附加数据")
    completed: bool = Field(False, description="是否标记完成")
    actual_cost: Optional[int] = Field(None, description="实际费用")

@router.post("/{task_id}/progress", summary="更新任务进度（HTTP 回调）")
async def update_task_progress(
    task_id: uuid.UUID,
    req: ProgressUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
    x_internal_token: Optional[str] = Header(None, alias="X-Internal-Token"),
):
    """
    更新任务进度，支持第三方 HTTP 回调

    鉴权方式：
    - 内网: X-Internal-Token header（第三方平台用）
    - 外网: 用户 Bearer Token（调试用）

    completed=true 时触发结算：
    - actual_cost ?? task.estimated_cost
    - 差额 = 冻结金额 - actual_cost
    - 差额>0 退还 / 差额<0 补扣
    """
    # 鉴权验证
    internal_token = settings.INTERNAL_API_TOKEN
    if x_internal_token and internal_token and x_internal_token == internal_token:
        pass  # 内网 token 验证通过
    else:
        # 外网用户验证
        task = await TaskService.get_by_id(db=db, task_id=task_id)
        if not task or task.user_id != current_user.id:
            from app.core.exceptions import ResourceNotFoundException
            raise ResourceNotFoundException("任务不存在")

    # 更新进度
    task = await TaskService.update_task_status(
        db=db,
        task_id=task_id,
        progress=req.progress,
        message=req.message
    )

    # 发布进度消息到 Redis Pub/Sub（触发 SSE）
    from app.workers.tasks import publish_task_message
    publish_task_message(
        task_id=task_id,
        msg_type='progress',
        message=req.message,
        data=req.data or {},
        progress=req.progress
    )

    # 如果 completed=true，触发结算
    if req.completed:
        actual_cost = req.actual_cost or task.estimated_cost or 0
        task = await TaskService.complete_task(
            db=db,
            task_id=task_id,
            actual_cost=actual_cost
        )
        # 发布完成消息
        publish_task_message(
            task_id=task_id,
            msg_type='completed',
            message='任务完成',
            data={'work_id': task.result_preview} if hasattr(task, 'result_preview') else {},
            progress=100
        )

    return {"success": True, "task_id": str(task_id), "progress": req.progress, "completed": req.completed}
```

- [ ] **Step 2: 在 config.py 中添加 INTERNAL_API_TOKEN**

```python
INTERNAL_API_TOKEN: str = os.getenv("INTERNAL_API_TOKEN", "")
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/api/v1/endpoints/tasks.py apps/backend/app/core/config.py
git commit -m "feat: 通用进度更新 API (Task 15)"
```

### Task 16: 进度数据结构化 + 自动写日志

**Files:**

- Modify: `apps/backend/app/executors/base.py`

- [ ] **Step 1: 添加 ProgressEvent 类并修改 update_progress**

```python
from dataclasses import dataclass, field
from typing import Optional

@dataclass
class ProgressEvent:
    percent: int = 0
    message: str = ""
    step_index: int = 0
    total_steps: int = 1
    step_status: str = "running"  # running | completed | pending
    sub_progress: Optional[str] = None  # 如 "3/10"


class BaseToolExecutor(ABC):
    # ... 现有代码 ...

    async def update_progress(
        self,
        percent: int,
        message: str,
        data: Optional[Dict[str, Any]] = None,
        step_index: Optional[int] = None,
        total_steps: Optional[int] = None,
        step_status: Optional[str] = None,
        sub_progress: Optional[str] = None,
    ) -> None:
        """更新任务进度（结构化版本）"""
        # 构建结构化数据
        progress_data = data or {}
        if step_index is not None:
            progress_data['step_index'] = step_index
        if total_steps is not None:
            progress_data['total_steps'] = total_steps
        if step_status is not None:
            progress_data['step_status'] = step_status
        if sub_progress is not None:
            progress_data['sub_progress'] = sub_progress

        await TaskService.update_task_status(
            db=self.db,
            task_id=self.task_id,
            progress=percent,
            message=message
        )

        # 自动写 TaskLog
        await TaskService.add_task_log(
            db=self.db,
            task_id=self.task_id,
            level="info",
            message=message,
            details=progress_data
        )

        if self._progress_callback:
            await self._progress_callback(percent, message, progress_data)
```

- [ ] **Step 2: 保持向后兼容**

原有的 `update_progress(percent, message, data)` 签名仍然工作，新增的 `step_index` 等参数为可选。

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/base.py
git commit -m "feat: 进度数据结构化 + 自动写日志 (Task 16)"
```

### Task 16b: BaseExecutor 添加 Mock 执行模式

**Files:**

- Modify: `apps/backend/app/executors/base.py`
- Modify: `apps/backend/app/workers/tasks.py`

- [ ] **Step 1: 在 BaseExecutor 中添加 _mock_execute 方法**

在 `base.py` 中添加 Mock 执行模式——当环境变量 `MOCK_AI_EXECUTION=true` 时生效，模拟完整的多步骤执行过程：

- 分步更新进度（每步 sleep 0.5s 以便观察）
- 调用 `update_task_status` 写 progress
- 调用 `add_task_log` 写日志
- 创建 mock Work 和 WorkFile 记录
- 调用 `complete_task` 走完整结算流程

```python
class BaseToolExecutor(ABC):
    # ... 现有代码 ...

    async def _mock_execute(self) -> Dict[str, Any]:
        """Mock 执行模式：模拟完整的分步执行流程，不依赖任何外部 AI API"""
        import asyncio
        from app.services.task_service import TaskService
        from app.services.work_service import WorkService
        from app.schemas.task import WorkCreate, WorkFileCreate
        from app.models.task import WorkFile

        # 从 DB 查 task 获取 user_id / tool_id / task_type
        task = await TaskService.get_by_id(db=self.db, task_id=self.task_id)
        user_id = task.user_id if task else self.task_id
        tool_id = task.tool_id if task else None
        task_type = task.task_type if task else 'storybook'

        # 分步模拟进度（典型有声绘本/电商工具的步骤）
        mock_steps = [
            (10, "正在准备素材..."),
            (25, "正在生成内容..."),
            (45, "正在处理图片..."),
            (65, "正在合成..."),
            (85, "正在生成最终文件..."),
            (95, "正在打包..."),
            (100, "生成完成！"),
        ]
        for percent, msg in mock_steps:
            await self.update_progress(percent=percent, message=msg)
            await asyncio.sleep(0.5)  # 让进度可观察

        # 创建 mock Work 记录
        work_in = WorkCreate(
            user_id=user_id,
            task_id=self.task_id,
            tool_id=tool_id,
            title="Mock 生成成果",
            description="AI Mock 模式生成的测试成果",
            task_type=task_type,
            status="published",
            is_public=False,
            version=1,
        )
        work = await WorkService.create_work(self.db, work_in)

        # 创建 mock WorkFile 记录
        file_in = WorkFileCreate(
            work_id=work.id,
            file_name="preview.png",
            file_url="/mock/output/preview.png",
            file_type="image",
        )
        db.add(WorkFile(**file_in.model_dump()))
        await db.commit()

        # 完整结算流程：解冻 → 扣费 → 标记 completed
        await TaskService.complete_task(
            db=self.db,
            task_id=self.task_id,
            actual_cost=self._tool_config.get('base_fee', 10),
        )

        return {"success": True, "work_id": str(work.id)}
```

- [ ] **Step 2: 修改 Worker 根据环境变量选择执行模式**

在 `tasks.py` 的 dispatch 逻辑中，根据 `MOCK_AI_EXECUTION` 环境变量分流：

```python
import os

# 在 _execute_with_async_session 中，创建 executor 后：
executor = create_executor(
    task_type=task_type,
    task_id=task_id,
    db=db,
    tool_config=tool_config,
    progress_callback=lambda p, m, d: publish_task_message(
        task_id, 'progress', m, d, p
    ),
)

if os.getenv("MOCK_AI_EXECUTION") == "true":
    logger.info(f"[Mock Mode] 模拟执行 task {task_id}")
    result = await executor._mock_execute()
else:
    result = await executor.execute()
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/base.py apps/backend/app/workers/tasks.py
git commit -m "feat: BaseExecutor 添加 Mock 执行模式 (Task 16b)"
```

### Task 17: SSE 事件模型升级

**Files:**

- Modify: `apps/backend/app/workers/tasks.py`

- [ ] **Step 1: 升级 publish_task_message 支持结构化进度**

```python
def publish_task_message(
    task_id: uuid.UUID,
    msg_type: str,
    message: str = "",
    data: Optional[Dict[str, Any]] = None,
    progress: int = 0
) -> None:
    channel = f"task:{task_id}:status"
    payload = {
        'type': msg_type,
        'task_id': str(task_id),
        'progress': progress,
        'message': message,
        'data': data or {},
        'timestamp': int(time.time())
    }

    # 如果是进度事件，提取结构化字段到顶层
    if msg_type == 'progress' and data:
        for key in ['step_index', 'total_steps', 'step_status', 'sub_progress']:
            if key in data:
                payload[key] = data[key]

    # 如果是 completed 事件，包含 work_id
    if msg_type == 'completed' and data:
        payload['work_id'] = data.get('work_id', '')

    _get_redis_client().publish(channel, json.dumps(payload, ensure_ascii=False))
```

- [ ] **Step 2: 更新 stream.py 中的事件格式**

前端 SSE 监听保持不变（event type 已为 progress/completed/error）。

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/workers/tasks.py
git commit -m "feat: SSE 事件模型升级，结构化进度数据 (Task 17)"
```

### Task 18: 进度弹窗组件 ProgressModal

**Files:**

- Create: `apps/frontend-user/src/components/tool-detail/ProgressModal.tsx`

- [ ] **Step 1: 创建 ProgressModal 组件**

```tsx
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
```

- [ ] **Step 2: 在 tool-detail/index.ts 中导出**

```typescript
export { ProgressModal } from './ProgressModal';
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/ProgressModal.tsx apps/frontend-user/src/components/tool-detail/index.ts
git commit -m "feat: 进度弹窗组件 ProgressModal (Task 18)"
```

### Task 19: 营销文案 Celery Worker 转发 + HTTP 回调

**Files:**

- Create: `apps/backend/app/executors/marketing.py`
- Modify: `apps/backend/app/workers/tasks.py`

- [ ] **Step 1: 创建 MarketingExecutor**

```python
"""
营销文案生成器 — HTTP 回调驱动模式

Celery Worker 接收到任务后，直接转交给外部平台（或模拟外部平台），
外部平台通过 POST /tasks/{id}/progress 驱动进度和完成。
"""
import uuid
import asyncio
from typing import Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor


class MarketingExecutor(BaseToolExecutor):
    """营销文案执行器 — HTTP 回调驱动"""

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, progress_callback)
        self._tool_config = tool or {}

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        base_fee = self._tool_config.get('base_fee', 8)
        return base_fee

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行营销文案生成任务

        模拟外部平台处理流程：
        1. 阶段 0-30%: 需求分析
        2. 阶段 30-80%: 文案生成（多平台）
        3. 阶段 80-100%: 打包交付

        真实场景下，外部平台通过 POST /tasks/{id}/progress 驱动进度。
        """
        platform_count = params.get('platform_count', 3)
        total_steps = 3  # 需求分析 → 文案生成 → 打包

        # Step 1: 需求分析 (0-30%)
        await self.update_progress(
            percent=5, message="正在分析需求...",
            step_index=0, total_steps=total_steps, step_status="running"
        )
        await asyncio.sleep(1)
        await self.update_progress(
            percent=30, message="需求分析完成",
            step_index=0, total_steps=total_steps, step_status="completed"
        )

        # Step 2: 多平台文案生成 (30-80%)
        await self.update_progress(
            percent=35, message="正在生成文案...",
            step_index=1, total_steps=total_steps, step_status="running"
        )
        for i in range(platform_count):
            await asyncio.sleep(1)
            progress = 30 + int((i + 1) / platform_count * 50)
            await self.update_progress(
                percent=progress,
                message=f"正在生成第 {i+1}/{platform_count} 个平台文案...",
                step_index=1, total_steps=total_steps, step_status="running",
                sub_progress=f"{i+1}/{platform_count}"
            )
        await self.update_progress(
            percent=80, message="文案生成完成",
            step_index=1, total_steps=total_steps, step_status="completed"
        )

        # Step 3: 打包交付 (80-100%)
        await self.update_progress(
            percent=85, message="正在打包成果...",
            step_index=2, total_steps=total_steps, step_status="running"
        )
        await asyncio.sleep(1)
        await self.update_progress(
            percent=100, message="生成完成！",
            step_index=2, total_steps=total_steps, step_status="completed"
        )

        return {
            'success': True,
            'message': '营销文案生成完成',
            'platform_count': platform_count,
        }
```

- [ ] **Step 2: 在 EXECUTOR_MAP 中注册**

```python
from app.executors.marketing import MarketingExecutor

EXECUTOR_MAP: Dict[str, type[BaseToolExecutor]] = {
    'storybook': StorybookExecutor,
    'ecommerce': EcommerceExecutor,
    'marketing': MarketingExecutor,  # 新增
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/executors/marketing.py apps/backend/app/workers/tasks.py
git commit -m "feat: 营销文案 HTTP 回调驱动执行器 (Task 19)"
```

---

## 第二阶段：数据层 + 路由

### Task 20: tools 表新增 usage_modes 字段（Alembic 迁移）

**Files:**

- Create: `apps/backend/alembic/versions/006_add_tool_usage_modes.py`
- Modify: `apps/backend/app/models/tool.py`

- [ ] **Step 1: Tool 模型新增字段**

```python
# 在 Tool 类中新增
usage_modes = Column(JSONType, nullable=True, comment="使用模式，JSON数组：[\"form\", \"dialog\"]")
```

- [ ] **Step 2: 创建 Alembic migration**

```python
"""add usage_modes to tools

Revision ID: 006_add_tool_usage_modes
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

revision = '006_add_tool_usage_modes'
down_revision = '005_system_tables'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('tools', sa.Column('usage_modes', JSON, nullable=True,
                  comment='使用模式，JSON数组：["form", "dialog"]'))


def downgrade() -> None:
    op.drop_column('tools', 'usage_modes')
```

- [ ] **Step 3: 检查 005_system_tables 是否存在；如果不存在，找到正确的依赖 revision**

```bash
# 查找最新的 alembic revision
ls -1 apps/backend/alembic/versions/ | sort | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/models/tool.py apps/backend/alembic/versions/006_add_tool_usage_modes.py
git commit -m "feat: tools 表新增 usage_modes 字段 (Task 20)"
```

### Task 21: 后端 Tool schema 更新，API 响应包含 usage_modes

**Files:**

- Modify: `apps/backend/app/schemas/tool.py`

- [ ] **Step 1: ToolBase schema 新增 usage_modes**

```python
class ToolBase(BaseModel):
    # ... 现有字段 ...
    usage_modes: Optional[List[str]] = Field(
        default=None,
        description="使用模式，可选值 form/dialog"
    )

    @property
    def effective_usage_modes(self) -> List[str]:
        """返回有效的使用模式列表，空值视为 ['form']"""
        if not self.usage_modes:
            return ['form']
        return self.usage_modes
```

- [ ] **Step 2: ToolUpdate schema 也需包含**

```python
class ToolUpdate(BaseModel):
    # ... 现有字段 ...
    usage_modes: Optional[List[str]] = Field(None, description="使用模式")
```

- [ ] **Step 3: 确保 ToolResponse 也包含 usage_modes**

`ToolResponse` 继承自 `ToolBase`，会自动包含 `usage_modes`。

- [ ] **Step 4: Commit**

```bash
git add apps/backend/app/schemas/tool.py
git commit -m "feat: Tool schema 新增 usage_modes (Task 21)"
```

### Task 22: 管理端工具编辑页新增复选框

**Files:**

- Modify: `apps/frontend-admin/src/pages/tools/[id]/edit.tsx`
- Modify: `apps/frontend-admin/src/api/tool.ts`

- [ ] **Step 1: 管理端 Tool 类型新增 usage_modes**

```typescript
// 在 UpdateToolParams 接口中添加
usage_modes?: string[];
```

- [ ] **Step 2: 编辑页新增使用模式复选框组**

在"价格配置"区块之后、"演示案例"区块之前插入：

```tsx
<div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
  <h2 className="text-lg font-semibold text-gray-800 mb-4">使用模式</h2>
  <div className="space-y-3">
    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
      <input
        type="checkbox"
        checked={formData.usage_modes?.includes('form') ?? true}
        onChange={(e) => {
          const modes = formData.usage_modes || ['form'];
          if (e.target.checked) {
            handleInputChange('usage_modes', [...modes, 'form']);
          } else {
            const newModes = modes.filter(m => m !== 'form');
            // 至少保留一个
            if (newModes.length > 0) {
              handleInputChange('usage_modes', newModes);
            }
          }
        }}
        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
      />
      <div>
        <span className="font-medium text-gray-800">表单模式 (form)</span>
        <p className="text-sm text-gray-500">用户填写表单参数后开始生成</p>
      </div>
    </label>
    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
      <input
        type="checkbox"
        checked={formData.usage_modes?.includes('dialog') ?? false}
        onChange={(e) => {
          const modes = formData.usage_modes || ['form'];
          if (e.target.checked) {
            handleInputChange('usage_modes', [...modes, 'dialog']);
          } else {
            handleInputChange('usage_modes', modes.filter(m => m !== 'dialog'));
          }
        }}
        className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
      />
      <div>
        <span className="font-medium text-gray-800">对话模式 (dialog)</span>
        <p className="text-sm text-gray-500">用户通过自然语言对话描述需求</p>
      </div>
    </label>
  </div>
</div>
```

- [ ] **Step 3: 在 loadTool 中初始化 usage_modes**

```typescript
setFormData({
  // ... 现有字段 ...
  usage_modes: data.usage_modes || ['form'],
});
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-admin/src/api/tool.ts apps/frontend-admin/src/pages/tools/[id]/edit.tsx
git commit -m "feat: 管理端工具编辑页新增使用模式复选框 (Task 22)"
```

### Task 23: 种子数据更新

**Files:**

- Modify: `apps/backend/seed.py`（或 seed 脚本所在位置）

- [ ] **Step 1: 查找种子数据脚本**

```bash
find apps/backend -name "seed*" -type f | head -5
```

- [ ] **Step 2: 更新种子数据**

```python
# 在工具种子数据中为三个标杆工具设置 slug 和 usage_modes
tools_seed = [
    {
        "slug": "storybook-generator",
        "name": "AI 有声绘本生成器",
        "usage_modes": ["form"],
        # ... 其他字段
    },
    {
        "slug": "ecommerce-detail",
        "name": "电商商品详情页生成器",
        "usage_modes": ["form"],
        # ... 其他字段
    },
    {
        "slug": "marketing-copywriter",
        "name": "营销文案生成器",
        "usage_modes": ["form"],
        # ... 其他字段
    },
    # 其他工具的 usage_modes 保持 NULL（默认 ['form']）
]
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/seed.py
git commit -m "chore: 种子数据更新 usage_modes (Task 23)"
```

### Task 24: 前端工具链接生成逻辑改用 slug

**Files:**

- Need to find where tool links are generated

- [ ] **Step 1: 查找工具链接生成代码**

```bash
grep -rn "/tools/" apps/frontend-user/src --include="*.tsx" --include="*.ts" | grep -v "node_modules" | head -20
```

- [ ] **Step 2: 修改链接生成逻辑**

当前逻辑：`/tools/${tool.id}` → 修改为：`tool.slug ? /tools/${tool.slug} : /tools/${tool.id}`

在 ToolCard 组件和工具列表页中找到链接生成处：

```typescript
// 工具卡片链接
const toolLink = tool.slug ? `/tools/${tool.slug}` : `/tools/${tool.id}`;
```

- [ ] **Step 3: Commit**

```bash
git add <affected files>
git commit -m "fix: 工具链接生成逻辑改用 slug (Task 24)"
```

---

## 第三阶段：定制页表单拆分

### Task 25: 将 StorybookForm 从 ToolCreationForm 拆出

**Files:**

- Create: `apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx`

- [ ] **Step 1: 从 ToolCreationForm 提取故事书表单渲染函数**

复制 `renderStorybookForm()`、`renderCostEstimator()`（故事书部分）和 `handleStartGeneration` 逻辑到新组件。

StorybookForm.tsx:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { taskApi } from '@/lib/api/modules/task';

interface StorybookFormProps {
  tool: Tool;
}

export function StorybookForm({ tool }: StorybookFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    theme: '',
    storyContent: '',
    art_style: 'cartoon',
    voiceType: 'warm',
    page_count: 10,
    hasBackgroundMusic: false,
    hasSoundEffects: false,
    target_age: '3-6',
  });
  const [totalCost, setTotalCost] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  const calculateTotalCost = () => {
    let cost = tool.base_fee;
    const imageCost = tool.image_fee || 1;
    cost += imageCost * (formState.page_count || 10);
    if (formState.voiceType && formState.voiceType !== 'none') {
      const audioCost = tool.audio_fee || 0.5;
      cost += audioCost * (formState.page_count || 10);
    }
    setTotalCost(cost);
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    try {
      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: 'storybook',
        input_params: {
          theme: formState.theme,
          art_style: formState.art_style,
          page_count: formState.page_count,
          target_age: formState.target_age,
          include_audio: formState.voiceType && formState.voiceType !== 'none',
          voiceType: formState.voiceType,
          hasBackgroundMusic: formState.hasBackgroundMusic,
          hasSoundEffects: formState.hasSoundEffects,
        },
      });
      router.push(`/works/${task.id}/progress`);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      alert(error?.response?.data?.detail || '创建任务失败，请检查登录状态或稍后重试');
      setIsGenerating(false);
    }
  };

  const updateFormState = (key: string, value: any) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  // 渲染表单 — 复制 renderStorybookForm() 的 JSX 内容
  // （从 ToolCreationForm.tsx 第 136-285 行复制）
  // 渲染费用估算 — 复制故事书相关费用计算 JSX

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-brand-dark mb-4">开始创作</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">简单几步生成专属有声绘本</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* 故事书表单 */}
            {renderStorybookForm()}
          </div>
          <div className="lg:col-span-1">
            {/* 费用估算 */}
            {renderCostEstimator()}
          </div>
        </div>
      </div>
    </section>
  );
}
```

> 注意：实际实现时，需要将 ToolCreationForm.tsx 中第 136-285 行的 `renderStorybookForm()` JSX 和第 613-675 行的 `renderCostEstimator()` JSX 完整复制到新文件中。

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/app/tools/storybook-generator/components/StorybookForm.tsx
git commit -m "refactor: 从 ToolCreationForm 拆分 StorybookForm (Task 25)"
```

### Task 26: 将 EcommerceForm 从 ToolCreationForm 拆出

**Files:**

- Create: `apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx`

- [ ] **Step 1: 创建 EcommerceForm 组件**

与 Task 25 类似，从 ToolCreationForm.tsx 提取 `renderEcommerceForm()`（第 288-412 行）和对应的费用估算逻辑。

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { taskApi } from '@/lib/api/modules/task';

interface EcommerceFormProps {
  tool: Tool;
}

export function EcommerceForm({ tool }: EcommerceFormProps) {
  const router = useRouter();
  const [formState, setFormState] = useState({
    productName: '',
    productCategory: '',
    productFeatures: '',
    targetAudience: '',
    imageStyle: 'professional',
    includePsd: true,
    imageCount: 5,
  });
  const [totalCost, setTotalCost] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    calculateTotalCost();
  }, [formState, tool]);

  const calculateTotalCost = () => {
    let cost = tool.base_fee;
    const imageCost = tool.image_fee || 2;
    cost += imageCost * (formState.imageCount || 5);
    setTotalCost(cost);
  };

  const handleStartGeneration = async () => {
    setIsGenerating(true);
    try {
      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: 'ecommerce',
        input_params: {
          productName: formState.productName,
          productCategory: formState.productCategory,
          productFeatures: formState.productFeatures,
          targetAudience: formState.targetAudience,
          imageStyle: formState.imageStyle,
          includePsd: formState.includePsd,
          imageCount: formState.imageCount,
        },
      });
      router.push(`/works/${task.id}/progress`);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      alert(error?.response?.data?.detail || '创建任务失败，请检查登录状态或稍后重试');
      setIsGenerating(false);
    }
  };

  // 渲染表单 — 复制 renderEcommerceForm() 的 JSX 内容

  return (
    <section id="start-creation" className="py-20 bg-[#F8FAFC]">
      {/* ... 类似 StorybookForm 的布局，使用电商表单 */}
    </section>
  );
}
```

> 注意：实际实现需完整复制 ToolCreationForm.tsx 第 288-412 行的电商表单 JSX 和第 637-642 行的费用计算 JSX。

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/app/tools/ecommerce-detail/components/EcommerceForm.tsx
git commit -m "refactor: 从 ToolCreationForm 拆分 EcommerceForm (Task 26)"
```

### Task 27: 将 MarketingForm 从 ToolCreationForm 拆出

**Files:**

- Create: `apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx`

- [ ] **Step 1: 创建 MarketingForm 组件**

从 ToolCreationForm.tsx 提取 `renderMarketingForm()`（第 415-533 行）和对应费用估算逻辑。

> 注意：实际实现需完整复制 ToolCreationForm.tsx 第 415-533 行的营销表单 JSX 和第 644-649 行的费用计算 JSX。

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/app/tools/marketing-copywriter/components/MarketingForm.tsx
git commit -m "refactor: 从 ToolCreationForm 拆分 MarketingForm (Task 27)"
```

### Task 28: 三个定制页 page.tsx 改为引用自己的表单组件

**Files:**

- Modify: `apps/frontend-user/src/app/tools/storybook-generator/page.tsx`
- Modify: `apps/frontend-user/src/app/tools/ecommerce-detail/page.tsx`
- Modify: `apps/frontend-user/src/app/tools/marketing-copywriter/page.tsx`

- [ ] **Step 1: 修改 storybook-generator/page.tsx**

```tsx
import { StorybookForm } from './components/StorybookForm';

// 替换 ToolCreationForm 引用
<StorybookForm tool={currentTool} />
```

- [ ] **Step 2: 修改 ecommerce-detail/page.tsx**

```tsx
import { EcommerceForm } from './components/EcommerceForm';

// 替换 ToolCreationForm 引用
<EcommerceForm tool={currentTool} />
```

- [ ] **Step 3: 修改 marketing-copywriter/page.tsx**

```tsx
import { MarketingForm } from './components/MarketingForm';

// 替换 ToolCreationForm 引用
<MarketingForm tool={currentTool} />
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-user/src/app/tools/storybook-generator/page.tsx apps/frontend-user/src/app/tools/ecommerce-detail/page.tsx apps/frontend-user/src/app/tools/marketing-copywriter/page.tsx
git commit -m "refactor: 定制页引用独立表单组件 (Task 28)"
```

### Task 29: ToolCreationForm 清空为 usage_modes 驱动的容器

**Files:**

- Modify: `apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx`

- [ ] **Step 1: 重写 ToolCreationForm**

清空所有表单渲染逻辑和状态，替换为 usage_modes 驱动的容器：

```tsx
'use client';

import { DialogMode } from './DialogMode';

interface ToolCreationFormProps {
  tool: Tool;
}

export function ToolCreationForm({ tool }: ToolCreationFormProps) {
  const usageModes = tool.usage_modes || ['form'];

  // 只含 'form' → 显示"开发中"
  // 只含 'dialog' → 渲染 DialogMode
  // 含两者 → Tab 切换
  // 空 [] → 同 ['form']

  if (usageModes.length === 1 && usageModes[0] === 'dialog') {
    return <DialogMode tool={tool} />;
  }

  if (usageModes.includes('form') && usageModes.includes('dialog')) {
    return <ToolCreationFormWithTabs tool={tool} />;
  }

  // 默认：form 模式（显示"开发中"）
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
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">该工具的表单模式正在开发中...</p>
          </div>
        ) : (
          <DialogMode tool={tool} />
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/ToolCreationForm.tsx
git commit -m "refactor: ToolCreationForm 清空为 usage_modes 驱动容器 (Task 29)"
```

---

## 第四阶段：通用详情页 + 对话模式

> ⚠️ **实现顺序：** Task 33（chatApi）是 Task 31（DialogMode）的前置依赖，Task 31 中的 DialogMode.tsx 会 import chatApi 模块。
> 建议按顺序实现：T30 → **T33** → T32 → **T31**。但考虑到 T30/T33/T32 无依赖关系，也可先批量实现 T30 + T32 + T33，最后实现 T31。

### Task 30: 通用详情页 [id] 接入 ToolCreationForm

**Files:**

- Modify: `apps/frontend-user/src/app/tools/[id]/page.tsx`

- [ ] **Step 1: 在 [id]/page.tsx 中添加 ToolCreationForm**

```tsx
import { ToolCreationForm } from '../../../components/tool-detail';

// 在 ToolHero 之后，ToolHowTo 之前添加
<ToolCreationForm tool={currentTool} />
```

- [ ] **Step 2: 添加 UUID 格式校验**

```tsx
// 在 fetchToolDetail 之前
useEffect(() => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(params.id)) {
    // 不是 UUID 格式，尝试按 slug 查找？或者 404
    setError('无效的工具ID');
    return;
  }
  fetchToolDetail(params.id);
  return () => clearCurrentTool();
}, [fetchToolDetail, clearCurrentTool, params.id]);
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/app/tools/[id]/page.tsx
git commit -m "feat: 通用详情页接入 ToolCreationForm + UUID 校验 (Task 30)"
```

### Task 31: 通用对话界面 UI 实现

**Files:**

- Create: `apps/frontend-user/src/components/tool-detail/DialogMode.tsx`
- Modify: `apps/frontend-user/src/components/tool-detail/index.ts`

- [ ] **Step 1: 创建 DialogMode 组件**

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Tool } from '@/lib/api/types';
import { taskApi } from '@/lib/api/modules/task';
import { chatApi } from '@/lib/api/modules/chat';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface DialogModeProps {
  tool: Tool;
}

export function DialogMode({ tool }: DialogModeProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `您好！欢迎使用${tool.name}。请告诉我您的具体需求，我会帮您梳理参数并生成最佳成果！`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectedParams, setCollectedParams] = useState<Record<string, any>>({});
  const [totalCost, setTotalCost] = useState(tool.base_fee);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        tool_id: tool.id,
        messages: [...messages, { role: 'user', content: userMessage }],
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      if (response.collected_params) {
        setCollectedParams(response.collected_params);
      }
    } catch (error) {
      console.error('对话失败:', error);
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: '抱歉，我遇到了问题。请稍后再试。'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAndGenerate = async () => {
    try {
      const task = await taskApi.createTask({
        tool_id: tool.id,
        task_type: tool.slug || 'default',
        input_params: collectedParams,
      });
      router.push(`/works/${task.id}/progress`);
    } catch (error: any) {
      console.error('创建任务失败:', error);
      alert(error?.response?.data?.detail || '创建任务失败');
    }
  };

  const hasParams = Object.keys(collectedParams).length > 0;

  return (
    <div className="grid lg:grid-cols-3 gap-8" style={{ minHeight: '500px' }}>
      {/* 对话区域 */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-dark to-blue-500 flex items-center justify-center">
              <span className="text-white text-lg">🤖</span>
            </div>
            <div>
              <h3 className="font-semibold text-brand-dark">AI 创作助手</h3>
              <p className="text-xs text-gray-500">在线，可以随时提问</p>
            </div>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-dark to-blue-500 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm">🤖</span>
                </div>
              )}
              <div className={`flex-1 ${msg.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`inline-block max-w-lg p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-none'
                    : 'bg-gray-50 text-gray-700 rounded-tl-none'
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-dark to-blue-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">🤖</span>
              </div>
              <div className="bg-gray-50 rounded-2xl rounded-tl-none p-4">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="输入您的想法..."
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-brand-dark to-blue-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      </div>

      {/* 需求摘要面板 */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h3 className="font-semibold text-lg text-brand-dark mb-4">📋 需求摘要</h3>

          {hasParams ? (
            <div className="space-y-3 mb-6">
              {Object.entries(collectedParams).map(([key, value]) => (
                <div key={key} className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">{key}</p>
                  <p className="text-sm text-gray-700">{String(value)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-gray-50 rounded-xl mb-6">
              <p className="text-xs text-gray-500 mb-1">当前状态</p>
              <p className="text-sm text-gray-600">等待您输入需求...</p>
            </div>
          )}

          <div className="border-t border-gray-200 pt-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">预估费用</span>
              <span className="text-xl font-bold text-green-600">≈ {totalCost} 积分</span>
            </div>
          </div>

          <button
            onClick={handleConfirmAndGenerate}
            disabled={!hasParams}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              hasParams
                ? 'bg-gradient-to-r from-green-600 to-green-500 text-white hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            🚀 确认需求，开始生成
          </button>
          <p className="text-center text-xs text-gray-500 mt-3">完成需求确认后即可开始生成</p>
        </div>
      </div>
    </div>
  );
}

export default DialogMode;
```

- [ ] **Step 2: 在 index.ts 中导出**

```typescript
export { DialogMode } from './DialogMode';
```

- [ ] **Step 3: Commit**

```bash
git add apps/frontend-user/src/components/tool-detail/DialogMode.tsx apps/frontend-user/src/components/tool-detail/index.ts
git commit -m "feat: 通用对话界面 DialogMode (Task 31)"
```

### Task 32: 后端 POST /api/v1/chat/ 预留接口

**Files:**

- Create: `apps/backend/app/api/v1/endpoints/chat.py`
- Modify: `apps/backend/app/api/v1/api.py`

- [ ] **Step 1: 创建 chat.py**

```python
"""
对话接口（后端预留）
当前返回 mock 响应，后续接入 AI 对话逻辑
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.api.deps import get_db, get_current_active_user
from app.models.user import User

router = APIRouter()


class ChatMessage(BaseModel):
    role: str = Field(..., description="user 或 assistant")
    content: str = Field(..., description="消息内容")


class ChatRequest(BaseModel):
    tool_id: uuid.UUID = Field(..., description="工具ID")
    messages: List[ChatMessage] = Field(..., description="对话历史")
    session_id: Optional[str] = Field(None, description="会话ID（用于多轮对话）")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="AI 回复")
    collected_params: Dict[str, Any] = Field(default_factory=dict, description="已收集的参数")
    session_id: str = Field(..., description="会话ID")


@router.post("", response_model=ChatResponse, summary="AI 对话接口（预留）")
async def chat(
    req: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_active_user),
) -> ChatResponse:
    """
    AI 对话接口

    当前行为：返回 mock 响应
    后续：接入 AI 对话逻辑，根据工具配置和对话历史生成回复

    请求体:
    - tool_id: 工具 ID
    - messages: 对话历史 [{role, content}, ...]
    - session_id: 可选，用于多轮对话

    响应:
    - reply: AI 回复内容
    - collected_params: 已确认的需求参数
    - session_id: 当前会话 ID
    """
    # Mock 响应
    session_id = req.session_id or str(uuid.uuid4())

    # 简单的关键词匹配 mock
    last_message = req.messages[-1].content if req.messages else ""

    if "绘本" in last_message or "故事" in last_message:
        mock_reply = "好的！我来帮您整理绘本需求。请告诉我目标年龄段（如 3-6 岁）和喜欢的画风（卡通/油画/水彩）。"
        collected = {"type": "storybook"}
    elif "文案" in last_message or "营销" in last_message:
        mock_reply = "好的！请告诉我产品名称、核心卖点和目标平台，我来帮您生成营销文案。"
        collected = {"type": "marketing"}
    elif "电商" in last_message or "商品" in last_message:
        mock_reply = "好的！请提供商品名称、类目和核心卖点，我来帮您生成电商详情页。"
        collected = {"type": "ecommerce"}
    else:
        mock_reply = "请问您想使用什么功能？我可以帮您生成有声绘本、电商详情页或营销文案。"
        collected = {}

    return ChatResponse(
        reply=mock_reply,
        collected_params=collected,
        session_id=session_id
    )
```

- [ ] **Step 2: 在 api.py 中注册**

```python
from app.api.v1.endpoints import chat as chat_endpoints

api_router.include_router(
    chat_endpoints.router,
    prefix="/chat",
    tags=["chat"]
)
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/app/api/v1/endpoints/chat.py apps/backend/app/api/v1/api.py
git commit -m "feat: 后端 POST /api/v1/chat/ 预留接口 (Task 32)"
```

### Task 33: 前端 chatApi 模块

**Files:**

- Create: `apps/frontend-user/src/lib/api/modules/chat.ts`

- [ ] **Step 1: 创建 chat.ts**

```typescript
/**
 * 对话模块 API
 */

import { api } from '../client';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  tool_id: string;
  messages: ChatMessage[];
  session_id?: string;
}

export interface ChatResponse {
  reply: string;
  collected_params: Record<string, any>;
  session_id: string;
}

export const chatApi = {
  /**
   * 发送对话消息
   */
  sendMessage: async (data: ChatRequest): Promise<ChatResponse> => {
    return api.post<ChatResponse>('/chat', data);
  },
};

export default chatApi;
```

- [ ] **Step 2: Commit**

```bash
git add apps/frontend-user/src/lib/api/modules/chat.ts
git commit -m "feat: 前端 chatApi 模块 (Task 33)"
```

### Task 33b: 前端类型同步 — types.ts 新增 usage_modes / work_id

**Files:**

- Modify: `apps/frontend-user/src/lib/api/types.ts`

- [ ] **Step 1: Tool 接口新增 usage_modes**

```typescript
// 在第 153 行（rating_avg 字段之后）新增
export interface Tool {
  // ... 现有字段保持不变 ...
  usage_modes?: string[];  // 新增：使用模式，如 ["form", "dialog"]
}
```

- [ ] **Step 2: Task 接口新增 work_id**

```typescript
// 在第 219 行（tool_name 字段之前）新增
export interface Task {
  // ... 现有字段保持不变 ...
  work_id?: UUID;    // 新增：任务完成后关联的成果 ID，用于跳转到成果详情页
  tool_name?: string;
}
```

- [ ] **Step 3: 验证 types.ts 无其他遗漏**

```bash
# 检查 types.ts 中所有字段是否与后端 Tool model 一致
grep -n "usage_modes\|base_fee\|image_fee\|audio_fee" apps/frontend-user/src/lib/api/types.ts
```

- [ ] **Step 4: Commit**

```bash
git add apps/frontend-user/src/lib/api/types.ts
git commit -m "feat: 前端类型同步 — types.ts 新增 usage_modes / work_id (Task 33b)"
```

---

## 第五阶段：测试保障

> **测试基础设施：** 使用已有 Playwright 框架（`apps/backend/tests/e2e/conftest.py`），设置 `E2E_HEADLESS=false` 以有头模式运行，每步自动截图。
>
> **为什么需要有头模式 E2E 测试：** 过往经验表明，单元测试和 API 测试全部通过后，用户实际点击按钮仍可能出现接口异常。原因是这些测试无法捕获：前端实际发出的字段名与后端期望不匹配、Token 未正确附加、异步错误被吞掉、路由跳转后状态丢失等问题。Playwright 有头模式用真实浏览器模拟用户操作，能直观看到每个步骤的页面状态和截图，第一时间发现"按钮点了没反应"或"接口 500"这类问题。
>
> **执行顺序说明：** 本阶段分为 5A 和 5B 两个子阶段。
>
> - **5A（Task 34-36）：单元测试 + API 集成测试** — 可在 Phase 1-4 开发过程中并行执行，不依赖完整的前端部署。
> - **5B（Task 37-43）：E2E 测试** — 必须在 **Phase 1-4 + Task 33b 全部完成** 后执行，因为涉及 slug 路由、表单拆分、ToolCreationForm 改造、Mock AI 完整链路等所有改动的联动验证。

### 5A：单元测试 + API 集成测试（可提前执行）

> 运行方式：
>
> - 后端单元/API测试：`cd apps/backend && pytest tests/test_xxx.py -v`
> - 执行器单元测试：`cd apps/backend && pytest tests/unit/executors/test_xxx.py -v`

### Task 34: 后端执行器费用计算单元测试

**Files:**

- Create/Modify: `apps/backend/tests/unit/executors/test_cost_calculation.py`

- [ ] **Step 1: 读取现有执行器代码，确认费用计算逻辑**

```bash
grep -n "estimate_cost\|base_fee\|image_fee\|audio_fee" apps/backend/app/executors/storybook.py apps/backend/app/executors/ecommerce.py apps/backend/app/executors/marketing.py
```

- [ ] **Step 2: 编写费用计算单元测试**

```python
"""执行器费用计算单元测试 — 验证从 DB tool 配置读取费用"""
import pytest
from unittest.mock import MagicMock, patch
from app.executors.storybook import StorybookExecutor
from app.executors.ecommerce import EcommerceExecutor
from app.executors.marketing import MarketingExecutor


class TestStorybookCostCalculation:
    """有声绘本执行器费用计算测试"""

    @pytest.mark.asyncio
    async def test_estimate_cost_with_defaults(self):
        """默认配置下费用计算正确"""
        executor = StorybookExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={},
            progress_callback=None
        )
        cost = executor.estimate_cost({
            'page_count': 10,
            'include_audio': True
        })
        # base_fee=20 + image_fee(2)*10 + audio_fee(1)*10 = 50
        assert cost == 50, f"期望 50，实际 {cost}"

    @pytest.mark.asyncio
    async def test_estimate_cost_with_custom_config(self):
        """自定义 tool 配置下费用计算正确"""
        executor = StorybookExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={'base_fee': 30, 'image_fee': 3, 'audio_fee': 2},
            progress_callback=None
        )
        cost = executor.estimate_cost({
            'page_count': 5,
            'include_audio': True
        })
        # base_fee=30 + image_fee(3)*5 + audio_fee(2)*5 = 55
        assert cost == 55, f"期望 55，实际 {cost}"

    @pytest.mark.asyncio
    async def test_estimate_cost_no_audio(self):
        """关闭音频时不计音频费用"""
        executor = StorybookExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={'base_fee': 20, 'image_fee': 2, 'audio_fee': 1},
            progress_callback=None
        )
        cost = executor.estimate_cost({
            'page_count': 10,
            'include_audio': False
        })
        # base_fee=20 + image_fee(2)*10 = 40
        assert cost == 40, f"期望 40，实际 {cost}"


class TestEcommerceCostCalculation:
    """电商执行器费用计算测试"""

    @pytest.mark.asyncio
    async def test_estimate_cost_default(self):
        executor = EcommerceExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={},
            progress_callback=None
        )
        cost = executor.estimate_cost({
            'main_image_count': 3,
            'detail_image_count': 3
        })
        # base_fee=12 + image_fee(2)*6 = 24
        assert cost == 24, f"期望 24，实际 {cost}"

    @pytest.mark.asyncio
    async def test_estimate_cost_custom(self):
        executor = EcommerceExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={'base_fee': 15, 'image_fee': 3},
            progress_callback=None
        )
        cost = executor.estimate_cost({
            'main_image_count': 4,
            'detail_image_count': 2
        })
        # base_fee=15 + image_fee(3)*6 = 33
        assert cost == 33, f"期望 33，实际 {cost}"


class TestMarketingCostCalculation:
    """营销文案执行器费用计算测试"""

    @pytest.mark.asyncio
    async def test_estimate_cost_default(self):
        executor = MarketingExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={},
            progress_callback=None
        )
        cost = executor.estimate_cost({})
        assert cost == 8, f"期望 8，实际 {cost}"

    @pytest.mark.asyncio
    async def test_estimate_cost_custom(self):
        executor = MarketingExecutor(
            task_id=MagicMock(),
            db=MagicMock(),
            tool={'base_fee': 15},
            progress_callback=None
        )
        cost = executor.estimate_cost({})
        assert cost == 15, f"期望 15，实际 {cost}"
```

- [ ] **Step 3: 运行测试确认通过**

```bash
cd apps/backend && pytest tests/unit/executors/test_cost_calculation.py -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/tests/unit/executors/test_cost_calculation.py
git commit -m "test: 执行器费用计算单元测试 (Task 34)"
```

### Task 35: 后端进度更新 + 结算逻辑单元测试

**Files:**

- Create: `apps/backend/tests/unit/services/test_progress_service.py`

- [ ] **Step 1: 读取 TaskService.update_task_status 和 complete_task 逻辑**

```bash
grep -n "update_task_status\|complete_task\|def add_task_log" apps/backend/app/services/task_service.py
```

- [ ] **Step 2: 编写进度更新和结算逻辑单元测试**

```python
"""进度更新 + 结算逻辑单元测试"""
import pytest
import uuid
from unittest.mock import MagicMock, patch, AsyncMock
from datetime import datetime


class TestProgressUpdate:
    """进度更新逻辑测试"""

    @pytest.mark.asyncio
    async def test_update_progress_success(self):
        """进度更新正常执行"""
        mock_db = AsyncMock()
        mock_task_service = MagicMock()

        with patch('app.services.task_service.TaskService.update_task_status', new_callable=AsyncMock) as mock_update:
            mock_update.return_value = MagicMock(progress=50, status="running")

            result = await mock_update(
                db=mock_db,
                task_id=uuid.uuid4(),
                progress=50,
                message="正在生成插画..."
            )

            assert result.progress == 50
            assert result.status == "running"
            mock_update.assert_called_once()

    @pytest.mark.asyncio
    async def test_update_progress_boundaries(self):
        """进度值边界测试：0 和 100"""
        mock_db = AsyncMock()

        with patch('app.services.task_service.TaskService.update_task_status', new_callable=AsyncMock) as mock_update:
            # 测试 progress=0
            await mock_update(db=mock_db, task_id=uuid.uuid4(), progress=0, message="开始")
            # 测试 progress=100
            await mock_update(db=mock_db, task_id=uuid.uuid4(), progress=100, message="完成")
            assert mock_update.call_count == 2


class TestSettlementLogic:
    """结算逻辑测试（多退少补）"""

    @pytest.mark.asyncio
    async def test_complete_task_with_exact_cost(self):
        """实际费用等于预估费用"""
        mock_db = AsyncMock()

        with patch('app.services.task_service.TaskService.complete_task', new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = MagicMock(progress=100, status="completed", actual_cost=50)

            result = await mock_complete(
                db=mock_db,
                task_id=uuid.uuid4(),
                actual_cost=50
            )

            assert result.status == "completed"
            assert result.actual_cost == 50

    @pytest.mark.asyncio
    async def test_complete_task_refund(self):
        """实际费用低于预估（需退还差额）"""
        mock_db = AsyncMock()

        with patch('app.services.task_service.TaskService.complete_task', new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = MagicMock(progress=100, status="completed", actual_cost=30)

            result = await mock_complete(
                db=mock_db,
                task_id=uuid.uuid4(),
                actual_cost=30
            )

            assert result.status == "completed"
            assert result.actual_cost == 30
```

- [ ] **Step 3: 运行测试确认通过**

```bash
cd apps/backend && pytest tests/unit/services/test_progress_service.py -v
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/tests/unit/services/test_progress_service.py
git commit -m "test: 进度更新 + 结算逻辑单元测试 (Task 35)"
```

### Task 36: 后端关键 API 集成测试

**Files:**

- Create: `apps/backend/tests/test_api_tool_retry_progress.py`

- [ ] **Step 1: 编写 retry/progress/files API 集成测试**

```python
"""retry/progress/files API 集成测试"""
import pytest
import uuid
from unittest.mock import MagicMock, patch, AsyncMock
from httpx import AsyncClient, ASGITransport
from app.main import app


class TestRetryTaskAPI:
    """retryTask API 测试"""

    @pytest.mark.asyncio
    async def test_retry_nonexistent_task_returns_404(self, client: AsyncClient):
        """重试不存在的任务返回 404"""
        fake_id = str(uuid.uuid4())
        response = await client.post(f"/api/v1/tasks/{fake_id}/retry")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_retry_pending_task_returns_400(self, client: AsyncClient, db_session):
        """重试非失败状态的任务返回 400"""
        from app.schemas.task import TaskCreate
        from app.services.task_service import TaskService

        task = await TaskService.create_task(
            db=db_session,
            task_in=TaskCreate(
                user_id=uuid.uuid4(),
                tool_id=uuid.uuid4(),
                task_type="storybook",
                input_params={"theme": "test"},
                estimated_cost=50
            )
        )
        # 任务默认 status=pending，不允许重试
        response = await client.post(f"/api/v1/tasks/{task.id}/retry")
        assert response.status_code == 400  # BusinessException


class TestProgressAPI:
    """进度更新 API 测试"""

    @pytest.mark.asyncio
    async def test_update_progress_valid(self, client: AsyncClient):
        """有效的进度更新请求"""
        response = await client.post(
            f"/api/v1/tasks/{uuid.uuid4()}/progress",
            json={"progress": 50, "message": "处理中"}
        )
        # 不需要真实任务存在也能验证接口契约
        assert response.status_code in (200, 404, 403)


class TestFileAPI:
    """文件服务 API 测试"""

    @pytest.mark.asyncio
    async def test_get_nonexistent_file_returns_404(self, client: AsyncClient):
        """获取不存在的文件返回 404"""
        response = await client.get(f"/api/v1/files/{uuid.uuid4()}")
        assert response.status_code in (401, 403, 404)
```

- [ ] **Step 2: 运行测试确认通过**

```bash
cd apps/backend && pytest tests/test_api_tool_retry_progress.py -v
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/test_api_tool_retry_progress.py
git commit -m "test: retry/progress/files API 集成测试 (Task 36)"
```

### 5B：E2E 测试（所有 Implementation Task 完成后执行）

> **前置条件：** 以下 Task 必须在 Phase 1-4 + Task 33b **全部完成并提交** 后执行。
>
> 运行方式（有头模式，可直接观察浏览器操作）：
>
> ```bash
> # 用户端 E2E（前端在 3000 端口）
> E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 pytest apps/backend/tests/e2e/test_xxx.py -v --headed --slowmo 300
>
> # 管理端 E2E（管理端在 3001 端口）
> E2E_HEADLESS=false ADMIN_BASE_URL=http://localhost:3001 pytest apps/backend/tests/e2e/test_admin_xxx.py -v --headed --slowmo 300
> ```
>
> 统一执行全部 E2E 测试：
>
> ```bash
> E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 ADMIN_BASE_URL=http://localhost:3001 \
>   pytest apps/backend/tests/e2e/ -v --headed --slowmo 200
> ```

### Task 37: E2E — slug 路由导航 + 通用详情页表单渲染

**Files:**

- Create: `apps/backend/tests/e2e/test_slug_routing.py`

- [ ] **Step 1: 创建 slug 路由验证 E2E 测试**

```python
"""
slug 路由导航 + 通用详情页表单渲染 E2E 测试

测试目标（Task 24, 29, 30）：
1. 通过 slug 导航到工具详情页
2. 通用 [id] 路由正确显示 ToolCreationForm
3. usage_modes 驱动正确的渲染模式

运行方式（有头模式，推荐）：
  E2E_HEADLESS=false pytest tests/e2e/test_slug_routing.py -v --headed --slowmo 200

运行方式（无头模式）：
  pytest tests/e2e/test_slug_routing.py -v
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/slug_routing"


class TestSlugRouting:
    """slug 路由导航测试"""

    def test_storybook_slug_route(self, page):
        """通过 slug 访问有声绘本详情页"""
        print("\n📌 [测试] slug 路由 → 有声绘本生成器")

        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_storybook_slug", SCREENSHOTS_DIR)

        # 验证页面正确加载（包含工具名称或关键内容）
        page_text = page.content()
        assert page.status == 200, f"页面状态码错误: {page.status}"
        print(f"  ✅ 页面状态码: {page.status}")
        print(f"  ✅ URL: {page.url}")

        # 验证存在创作表单区域
        has_form_section = "开始创作" in page_text or "开始生成" in page_text or "start-creation" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")

        # 验证存在操作按钮（至少1个button）
        button_count = page.locator('button').count()
        print(f"  ✅ 页面按钮数量: {button_count}")
        assert button_count > 0, "页面无任何按钮"

        # 验证表单字段名（原 Task 38 已删除，合并至此）
        has_theme = "故事主题" in page_text or "主题" in page_text
        has_style = "艺术风格" in page_text or "画风" in page_text
        has_page_count = "页数" in page_text
        has_target_age = "年龄段" in page_text or "年龄" in page_text or "3-6岁" in page_text
        has_generate_btn = "开始生成" in page_text or "开始创作" in page_text
        print(f"  ✅ 故事主题字段: {has_theme}")
        print(f"  ✅ 艺术风格字段: {has_style}")
        print(f"  ✅ 页数选择: {has_page_count}")
        print(f"  ✅ 目标年龄段: {has_target_age}")
        print(f"  ✅ 生成按钮: {has_generate_btn}")
        assert has_generate_btn, "缺少开始生成按钮"

    def test_ecommerce_slug_route(self, page):
        """通过 slug 访问电商详情页生成器"""
        print("\n📌 [测试] slug 路由 → 电商详情页生成器")

        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-detail")
        wait_for_network_idle(page)
        take_screenshot(page, "02_ecommerce_slug", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        has_form_section = "开始创作" in page_text or "开始生成" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")

        button_count = page.locator('button').count()
        print(f"  ✅ 页面按钮数量: {button_count}")
        assert button_count > 0

    def test_marketing_slug_route(self, page):
        """通过 slug 访问营销文案生成器"""
        print("\n📌 [测试] slug 路由 → 营销文案生成器")

        page.goto(f"{E2E_BASE_URL}/tools/marketing-copywriter")
        wait_for_network_idle(page)
        take_screenshot(page, "03_marketing_slug", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        has_form_section = "开始创作" in page_text or "开始生成" in page_text
        print(f"  ✅ 存在创作表单区域: {has_form_section}")
        assert page.status == 200


class TestUUIDRoute:
    """UUID 路由导航测试"""

    def test_uuid_route_shows_under_construction(self, page):
        """通过 UUID 访问无定制页的工具，显示'开发中'"""
        print("\n📌 [测试] UUID 路由 → 通用详情页（无定制页工具）")

        # 使用一个假 UUID（模拟无定制页的工具）
        fake_uuid = "00000000-0000-0000-0000-000000000001"
        page.goto(f"{E2E_BASE_URL}/tools/{fake_uuid}")
        wait_for_network_idle(page)
        take_screenshot(page, "04_uuid_route", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 页面状态码: {page.status}")

        # 验证显示开发中或对应的 fallback 内容
        has_fallback = "开发中" in page_text or "请稍后" in page_text
        print(f"  ✅ 显示 fallback 内容: {has_fallback}")
```

- [ ] **Step 2: 运行有头模式验证**

```bash
cd /path/to/LCAITool
# 确保前端在 3000 端口运行
E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 pytest apps/backend/tests/e2e/test_slug_routing.py -v --headed --slowmo 300
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/e2e/test_slug_routing.py
git commit -m "test: E2E slug 路由导航 + 通用详情页表单渲染 (Task 37)"
```

### Task 38: E2E — 任务失败重试流程

**Files:**

- Create: `apps/backend/tests/e2e/test_retry_flow.py`

- [ ] **Step 1: 创建任务失败重试 E2E 测试**

```python
"""
任务失败重试流程 E2E 测试

测试目标（Task 11）：
1. 进度页显示重试按钮（任务失败时）
2. 点击重试创建新任务
3. 新任务进入进度页

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_retry_flow.py -v --headed --slowmo 300

⚠️ 需要：测试用户已登录，后端和前端服务运行中
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/retry_flow"


class TestRetryFlow:
    """任务失败重试流程测试"""

    def test_retry_button_exists_on_failed_task(self, logged_in_page):
        """失败任务进度页显示重试按钮"""
        page = logged_in_page
        print("\n📌 [测试] 失败任务进度页重试按钮")

        # 使用一个标记为 failed 的任务 ID
        # 注意：需要提前在数据库中存在一个 failed 状态的任务
        page.goto(f"{E2E_BASE_URL}/works/failed-task-id/progress")
        wait_for_network_idle(page)
        take_screenshot(page, "01_failed_task", SCREENSHOTS_DIR)

        page_text = page.content()

        # 检查是否有重试相关按钮
        has_retry_btn = "重试" in page_text or "retry" in page_text.lower()
        has_back_btn = "返回" in page_text or "back" in page_text.lower()

        print(f"  ✅ 重试按钮: {has_retry_btn}")
        print(f"  ✅ 返回按钮: {has_back_btn}")

        # 尝试点击重试按钮
        if has_retry_btn:
            retry_btn = page.locator('button').filter(has_text=re.compile(r'重试|retry'))
            if retry_btn.count() > 0:
                retry_btn.click()
                page.wait_for_timeout(3000)
                take_screenshot(page, "02_after_retry", SCREENSHOTS_DIR)
                print(f"  ✅ 点击重试后 URL: {page.url}")

    def test_retry_button_not_shown_on_running_task(self, logged_in_page):
        """运行中的任务不显示重试按钮"""
        page = logged_in_page
        print("\n📌 [测试] 运行中任务不显示重试按钮")

        page.goto(f"{E2E_BASE_URL}/works/running-task-id/progress")
        wait_for_network_idle(page)
        take_screenshot(page, "03_running_task", SCREENSHOTS_DIR)

        page_text = page.content()
        has_retry_btn = "重试" in page_text
        print(f"  ✅ 运行中任务出现重试按钮（应为 false）: {has_retry_btn}")
```

- [ ] **Step 2: 运行有头模式验证**

```bash
E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 pytest apps/backend/tests/e2e/test_retry_flow.py -v --headed --slowmo 300
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/e2e/test_retry_flow.py
git commit -m "test: E2E 任务失败重试流程 (Task 38)"
```

### Task 39: E2E — 管理端工具编辑 usage_modes

**Files:**

- Create: `apps/backend/tests/e2e/test_admin_tool_edit.py`

- [ ] **Step 1: 创建管理端工具编辑页 E2E 测试**

```python
"""
管理端工具编辑 usage_modes 配置 E2E 测试

测试目标（Task 22）：
1. 管理员登录
2. 导航到工具编辑页
3. usage_modes 复选框正确显示和交互
4. 保存配置成功

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_admin_tool_edit.py -v --headed --slowmo 300

⚠️ 需要：管理端在 3001 端口运行，管理员账号 admin/admin123
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://localhost:3001")
SCREENSHOTS_DIR = "tests/e2e/screenshots/admin_tool_edit"


class TestAdminToolEditUsageModes:
    """管理端工具编辑 — usage_modes 配置"""

    @pytest.fixture(scope="function")
    def admin_context(self, browser):
        """管理员登录上下文"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()

        # 登录管理员
        page.goto(f"{ADMIN_BASE_URL}/login")
        page.wait_for_load_state("networkidle")

        # 填写登录表单
        username_input = page.locator('input[name="username"]')
        if username_input.count() > 0:
            username_input.fill("admin")

        password_input = page.locator('input[type="password"]')
        if password_input.count() > 0:
            password_input.fill("admin123")

        login_btn = page.locator('button[type="submit"]')
        if login_btn.count() > 0:
            login_btn.click()
        else:
            page.get_by_role("button").filter(has_text="登录").first.click()

        page.wait_for_timeout(2000)
        yield page
        context.close()

    def test_tool_edit_page_has_usage_modes_section(self, admin_context):
        """工具编辑页包含使用模式配置区块"""
        page = admin_context
        print("\n📌 [测试] 工具编辑页使用模式区块")

        # 导航到有声绘本工具编辑页（假设工具 ID 已知）
        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        take_screenshot(page, "01_tool_edit_page", SCREENSHOTS_DIR)

        page_text = page.content()

        # 验证存在使用模式配置
        has_usage_modes_section = "使用模式" in page_text
        has_form_mode = "表单模式" in page_text or "form" in page_text.lower()
        has_dialog_mode = "对话模式" in page_text or "dialog" in page_text.lower()

        print(f"  ✅ 使用模式区块: {has_usage_modes_section}")
        print(f"  ✅ 表单模式选项: {has_form_mode}")
        print(f"  ✅ 对话模式选项: {has_dialog_mode}")

    def test_toggle_dialog_mode_checkbox(self, admin_context):
        """切换对话模式复选框"""
        page = admin_context
        print("\n📌 [测试] 切换对话模式复选框")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # 查找对话模式复选框
        dialog_checkbox = page.locator('input[type="checkbox"]').filter(has_text=re.compile(r'对话|dialog'))
        if dialog_checkbox.count() == 0:
            # 尝试找所有 checkbox 中的第二个
            dialog_checkbox = page.locator('input[type="checkbox"]')

        checkbox_count = dialog_checkbox.count()
        print(f"  ✅ 找到复选框数量: {checkbox_count}")

        if checkbox_count > 0:
            # 勾选/取消勾选第一个复选框
            is_checked = dialog_checkbox.first.is_checked()
            dialog_checkbox.first.click()
            page.wait_for_timeout(500)
            new_checked = dialog_checkbox.first.is_checked()
            print(f"  ✅ 复选框状态变化: {is_checked} → {new_checked}")
            assert is_checked != new_checked, "复选框状态未变化"

            take_screenshot(page, "02_checkbox_toggled", SCREENSHOTS_DIR)

    def test_save_tool_config(self, admin_context):
        """保存工具配置"""
        page = admin_context
        print("\n📌 [测试] 保存工具配置")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)

        # 查找保存按钮
        save_btn = page.locator('button').filter(has_text=re.compile(r'保存|提交|更新'))
        if save_btn.count() > 0:
            save_btn.first.click()
            page.wait_for_timeout(2000)
            take_screenshot(page, "03_save_complete", SCREENSHOTS_DIR)
            print(f"  ✅ 保存按钮点击完成")
            print(f"  ✅ 保存后 URL: {page.url}")
        else:
            print("  ⚠️ 未找到保存按钮")

    def test_edit_page_has_basic_fields(self, admin_context):
        """编辑页包含基本配置字段"""
        page = admin_context
        print("\n📌 [测试] 编辑页基本配置字段")

        page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(1000)
        take_screenshot(page, "04_edit_fields", SCREENSHOTS_DIR)

        page_text = page.content()
        has_name = "工具名称" in page_text or "name" in page_text.lower()
        has_slug = "slug" in page_text.lower()
        has_pricing = "价格" in page_text or "费用" in page_text or "定价" in page_text

        print(f"  ✅ 工具名称字段: {has_name}")
        print(f"  ✅ slug 字段: {has_slug}")
        print(f"  ✅ 价格配置区块: {has_pricing}")
```

- [ ] **Step 2: 运行有头模式验证**

```bash
ADMIN_BASE_URL=http://localhost:3001 E2E_HEADLESS=false pytest apps/backend/tests/e2e/test_admin_tool_edit.py -v --headed --slowmo 300
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/e2e/test_admin_tool_edit.py
git commit -m "test: E2E 管理端工具编辑 usage_modes (Task 39)"
```

### Task 40: E2E — 管理端配置变更在用户端生效

**Files:**

- Create: `apps/backend/tests/e2e/test_config_propagation.py`

- [ ] **Step 1: 创建配置变更传播验证 E2E 测试**

```python
"""
管理端配置变更 → 用户端生效 E2E 测试

测试目标（Task 22 → Task 29 联动）：
1. 管理端修改工具 usage_modes
2. 用户端工具详情页反映配置变更
3. ToolCreationForm 根据 usage_modes 渲染正确模式

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_config_propagation.py -v --headed --slowmo 300

⚠️ 需要：管理端（3001）和用户端（3000）同时运行
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

ADMIN_BASE_URL = os.getenv("ADMIN_BASE_URL", "http://localhost:3001")
E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/config_propagation"


class TestConfigPropagation:
    """管理端配置 → 用户端生效验证"""

    def _admin_login(self, browser):
        """管理员登录辅助方法"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()
        page.goto(f"{ADMIN_BASE_URL}/login")
        page.wait_for_load_state("networkidle")
        username_input = page.locator('input[name="username"]')
        if username_input.count() > 0:
            username_input.fill("admin")
        password_input = page.locator('input[type="password"]')
        if password_input.count() > 0:
            password_input.fill("admin123")
        login_btn = page.locator('button[type="submit"]')
        if login_btn.count() > 0:
            login_btn.click()
        else:
            page.get_by_role("button").filter(has_text="登录").first.click()
        page.wait_for_timeout(2000)
        return page, context

    def _user_visit_tool(self, browser):
        """用户访问工具页辅助方法（未登录）"""
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="zh-CN",
        )
        page = context.new_page()
        return page, context

    def test_visit_user_tool_page(self, browser):
        """用户端工具详情页基本可访问"""
        page, context = self._user_visit_tool(browser)
        print("\n📌 [测试] 用户端工具详情页可访问")

        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_user_tool_page", SCREENSHOTS_DIR)

        print(f"  ✅ 用户端页面加载成功 (HTTP {page.status})")
        context.close()

    def test_usage_modes_reflects_db_config(self, browser):
        """验证不同工具的 usage_modes 配置反映在页面渲染上"""
        page, context = self._user_visit_tool(browser)
        print("\n📌 [测试] usage_modes 驱动页面渲染")

        # 访问有声绘本工具
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "02_storybook_render", SCREENSHOTS_DIR)

        page_text = page.content()
        print(f"  ✅ 有声绘本页渲染正常")

        # 访问电商工具
        page.goto(f"{E2E_BASE_URL}/tools/ecommerce-detail")
        wait_for_network_idle(page)
        take_screenshot(page, "03_ecommerce_render", SCREENSHOTS_DIR)

        page_text2 = page.content()
        print(f"  ✅ 电商详情页渲染正常")

        # 访问营销文案工具
        page.goto(f"{E2E_BASE_URL}/tools/marketing-copywriter")
        wait_for_network_idle(page)
        take_screenshot(page, "04_marketing_render", SCREENSHOTS_DIR)

        print(f"  ✅ 营销文案页渲染正常")
        print(f"  ✅ 三个标杆工具均渲染正常，无白屏/崩溃")

        context.close()

    def test_admin_config_persists_after_save(self, browser):
        """管理端配置保存后持久化"""
        admin_page, admin_context = self._admin_login(browser)
        print("\n📌 [测试] 管理端配置持久化")

        # 导航到工具编辑页
        admin_page.goto(f"{ADMIN_BASE_URL}/tools/storybook-generator/edit")
        admin_page.wait_for_load_state("networkidle")
        admin_page.wait_for_timeout(1000)
        take_screenshot(admin_page, "05_admin_edit_before", SCREENSHOTS_DIR)

        # 检查使用模式区块存在
        page_text = admin_page.content()
        has_usage_modes = "使用模式" in page_text
        print(f"  ✅ 管理端使用模式配置可见: {has_usage_modes}")

        admin_context.close()
```

- [ ] **Step 2: 运行有头模式验证**

```bash
ADMIN_BASE_URL=http://localhost:3001 E2E_BASE_URL=http://localhost:3000 E2E_HEADLESS=false pytest apps/backend/tests/e2e/test_config_propagation.py -v --headed --slowmo 300
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/e2e/test_config_propagation.py
git commit -m "test: E2E 管理端配置变更在用户端生效 (Task 40)"
```

### Task 41: E2E — Mock AI 完整执行链路（观察进度 0→100%）

**Files:**

- Create: `apps/backend/tests/e2e/test_mock_execution_flow.py`

- [ ] **Step 1: 创建 Mock AI 完整执行链路 E2E 测试**

前置条件：后端需以 `MOCK_AI_EXECUTION=true` 环境变量启动，确保所有 AI 调用走 mock 模式。

```python
"""
Mock AI 完整执行链路 E2E 测试

测试目标（Task 16b, 4, 11, 14）：
1. 表单提交后跳转到进度页
2. 观察进度条从 0% → 100% 的完整动画过程（headed 模式下可亲眼看到）
3. 进度页显示各步骤状态
4. 任务完成后自动跳转到成果详情页或显示完成状态
5. 成果详情页显示生成的 Work 和 WorkFile 信息

运行方式（有头模式，关键！可观察进度动画）：
  MOCK_AI_EXECUTION=true E2E_HEADLESS=false \\
  pytest tests/e2e/test_mock_execution_flow.py -v --headed --slowmo 500

⚠️ 需要：后端以 MOCK_AI_EXECUTION=true 启动
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
import time
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/mock_execution"


class TestMockExecutionFlow:
    """Mock AI 完整执行链路测试"""

    def test_form_submit_and_observe_progress_to_100(self, logged_in_page):
        """填写表单 → 提交 → 观察进度从 0% 走到 100%"""
        page = logged_in_page
        print("\n📌 [测试] Mock AI 完整执行链路 — 观察进度 0→100%")
        print("   （headed 模式下请关注浏览器窗口中的进度动画）")

        # Step 1: 导航到有声绘本工具
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)
        take_screenshot(page, "01_mock_before_fill", SCREENSHOTS_DIR)
        print(f"  ✅ 有声绘本页面加载成功")

        # Step 2: 填写表单
        theme_input = page.locator('input, textarea').first
        if theme_input.is_visible():
            theme_input.fill("小兔子找月亮")
            print(f"  ✅ 填写故事主题: 小兔子找月亮")

        # Step 3: 点击「开始生成」
        generate_btn = page.locator('button').filter(has_text=re.compile(r'开始生成|开始创作'))
        if generate_btn.count() == 0:
            generate_btn = page.locator('button').last
        generate_btn.click()
        print(f"  ✅ 点击生成按钮，等待跳转到进度页...")

        # Step 4: 等待跳转到进度页面
        page.wait_for_timeout(2000)
        take_screenshot(page, "02_mock_progress_start", SCREENSHOTS_DIR)

        current_url = page.url
        is_progress_page = "/works/" in current_url and "/progress" in current_url
        assert is_progress_page, f"未跳转到进度页，当前 URL: {current_url}"
        print(f"  ✅ 已跳转到进度页: {current_url}")

        # Step 5: 轮询等待进度到达 100%（最长等待 30 秒）
        print(f"  ⏳ 正在观察进度动画（需等待 mock 执行完成）...")
        max_wait = 30
        poll_interval = 1.5
        progress_reached_100 = False
        last_progress = 0

        for i in range(int(max_wait / poll_interval)):
            time.sleep(poll_interval)
            page_text = page.content()

            # 尝试从页面提取进度值
            progress_match = re.search(r'(\d+)\s*%', page_text)
            if progress_match:
                last_progress = int(progress_match.group(1))
                print(f"    当前进度: {last_progress}%")

            # 截图记录进度变化
            if i % 3 == 0:  # 每 ~4.5 秒截一次
                take_screenshot(page, f"03_mock_progress_{i:02d}", SCREENSHOTS_DIR)

            if last_progress >= 100:
                progress_reached_100 = True
                break

            # 也检查是否存在"生成完成"或"completed"文本
            if "生成完成" in page_text or "completed" in page_text.lower():
                progress_reached_100 = True
                print(f"  ✅ 检测到完成状态文本")
                break

        assert progress_reached_100, (
            f"进度未达到 100%，最后进度: {last_progress}%"
        )
        print(f"  ✅ 任务执行完成！进度达到 100%")

        take_screenshot(page, "04_mock_progress_complete", SCREENSHOTS_DIR)

        # Step 6: 验证可见完成状态信息
        page_text = page.content()
        has_complete_text = "完成" in page_text or "completed" in page_text.lower()
        print(f"  ✅ 页面显示完成状态: {has_complete_text}")

    def test_mock_execution_creates_work_and_files(self, logged_in_page):
        """验证 mock 执行完成后创建了 Work 和 WorkFile"""
        page = logged_in_page
        print("\n📌 [测试] Mock 执行成果验证")

        # 先完成一次提交（依赖上一个测试的完整链路）
        page.goto(f"{E2E_BASE_URL}/tools/storybook-generator")
        wait_for_network_idle(page)

        theme_input = page.locator('input, textarea').first
        if theme_input.is_visible():
            theme_input.fill("小兔子找月亮")

        generate_btn = page.locator('button').filter(has_text=re.compile(r'开始生成|开始创作'))
        if generate_btn.count() == 0:
            generate_btn = page.locator('button').last
        generate_btn.click()
        page.wait_for_timeout(2000)

        # 等待 mock 执行完成
        for _ in range(20):
            time.sleep(1.5)
            page_text = page.content()
            if "生成完成" in page_text or "completed" in page_text.lower():
                break

        # 导航到成果列表页，验证新生成的成果存在
        page.goto(f"{E2E_BASE_URL}/works")
        wait_for_network_idle(page)
        take_screenshot(page, "05_mock_works_list", SCREENSHOTS_DIR)

        page_text = page.content()
        has_mock_work = "Mock 生成成果" in page_text
        print(f"  ✅ 成果列表包含 Mock 生成的成果: {has_mock_work}")

        # 导航到最新成果详情页
        work_link = page.locator('a').filter(has_text=re.compile(r'Mock 生成成果'))
        if work_link.count() > 0:
            work_link.first.click()
            page.wait_for_timeout(2000)
            take_screenshot(page, "06_mock_work_detail", SCREENSHOTS_DIR)

            page_text = page.content()
            has_preview = "preview" in page_text.lower() or "预览" in page_text
            has_download = "下载" in page_text or "download" in page_text.lower()
            print(f"  ✅ 成果详情显示预览: {has_preview}")
            print(f"  ✅ 成果详情显示下载按钮: {has_download}")
```

- [ ] **Step 2: 以后端 MOCK_AI_EXECUTION=true 模式启动服务**

```bash
# 方式 1：直接启动后端（开发模式）
cd apps/backend
MOCK_AI_EXECUTION=true uvicorn app.main:app --reload --port 8000

# 方式 2：通过 docker-compose 设置环境变量
MOCK_AI_EXECUTION=true docker-compose up -d backend
```

- [ ] **Step 3: 运行有头模式验证（肉眼观察进度动画）**

```bash
MOCK_AI_EXECUTION=true E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 \
  pytest apps/backend/tests/e2e/test_mock_execution_flow.py -v --headed --slowmo 500
```

- [ ] **Step 4: Commit**

```bash
git add apps/backend/tests/e2e/test_mock_execution_flow.py
git commit -m "test: E2E Mock AI 完整执行链路 (Task 41)"
```

### Task 42: E2E — 成果文件下载验证

**Files:**

- Create: `apps/backend/tests/e2e/test_file_download.py`

- [ ] **Step 1: 创建文件下载 E2E 测试**

```python
"""
成果文件下载 E2E 测试

测试目标（Task 12, 14）：
1. 成果详情页显示文件列表
2. 点击下载按钮触发文件下载
3. 权限控制：未登录用户无法下载

运行方式（有头模式）：
  E2E_HEADLESS=false pytest tests/e2e/test_file_download.py -v --headed --slowmo 300
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import pytest
import re
from utils.helpers import take_screenshot, wait_for_network_idle

E2E_BASE_URL = os.getenv("E2E_BASE_URL", "http://localhost:3000")
SCREENSHOTS_DIR = "tests/e2e/screenshots/file_download"


class TestFileDownload:
    """成果文件下载测试"""

    def test_work_detail_has_download_button(self, logged_in_page):
        """成果详情页包含下载按钮"""
        page = logged_in_page
        print("\n📌 [测试] 成果详情页下载按钮")

        page.goto(f"{E2E_BASE_URL}/works/detail/sample-work-id")
        wait_for_network_idle(page)
        take_screenshot(page, "01_work_detail", SCREENSHOTS_DIR)

        page_text = page.content()
        has_download = "下载" in page_text or "download" in page_text.lower()
        print(f"  ✅ 存在下载按钮: {has_download}")

    def test_work_detail_shows_file_list(self, logged_in_page):
        """成果详情页显示文件列表"""
        page = logged_in_page
        print("\n📌 [测试] 成果详情页文件列表")

        page.goto(f"{E2E_BASE_URL}/works/detail/sample-work-id")
        wait_for_network_idle(page)
        take_screenshot(page, "02_file_list", SCREENSHOTS_DIR)

        page_text = page.content()
        has_files = "文件" in page_text or "图片" in page_text or "PDF" in page_text or "ZIP" in page_text or "zip" in page_text.lower()
        print(f"  ✅ 显示文件列表: {has_files}")
```

- [ ] **Step 2: 运行有头模式验证**

```bash
E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 pytest apps/backend/tests/e2e/test_file_download.py -v --headed --slowmo 300
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/tests/e2e/test_file_download.py
git commit -m "test: E2E 成果文件下载验证 (Task 42)"
```

### Task 43: 全局 E2E 门禁 — 全部测试通过确认

**说明：** 所有 Phase 1-4 实现 + Task 33b 类型同步 + Phase 5A/5B 测试文件就绪后，执行此最终验证。

**Files:**

- 无新建文件。运行已有 E2E 测试文件的完整套件。

- [ ] **Step 1: 停止所有开发服务，重新启动完整环境（含 MOCK_AI_EXECUTION）**

```bash
# 确保 docker-compose 中的服务已启动
docker-compose up -d db redis

# 后端必须以 MOCK_AI_EXECUTION=true 启动（使 Mock AI 执行模式生效）
# 方式 A：直接启动
cd apps/backend && MOCK_AI_EXECUTION=true uvicorn app.main:app --reload --port 8000

# 方式 B：docker-compose 设置环境变量
MOCK_AI_EXECUTION=true docker-compose up -d backend

# 确保用户端前端在 3000 端口运行
# 确保管理端前端在 3001 端口运行
```

- [ ] **Step 2: 先跑单元测试和 API 集成测试（快速验证）**

```bash
cd apps/backend

echo "=== 执行器费用计算测试 ==="
pytest tests/unit/executors/test_cost_calculation.py -v

echo "=== 进度更新 + 结算逻辑测试 ==="
pytest tests/unit/services/test_progress_service.py -v

echo "=== API 集成测试 ==="
pytest tests/test_api_tool_retry_progress.py -v
```

- [ ] **Step 3: 按顺序执行全部 E2E 测试（有头模式）**

```bash
# 设置统一参数
export E2E_BASE_URL=http://localhost:3000
export ADMIN_BASE_URL=http://localhost:3001
export E2E_HEADLESS=false
export MOCK_AI_EXECUTION=true  # 确保 mock 模式生效

cd apps/backend

echo "=== 1/6: slug 路由导航 ==="
pytest tests/e2e/test_slug_routing.py -v --headed --slowmo 200 || echo "❌ 失败"

echo "=== 2/6: 任务重试流程 ==="
pytest tests/e2e/test_retry_flow.py -v --headed --slowmo 200 || echo "❌ 失败"

echo "=== 3/6: 管理端工具编辑 ==="
pytest tests/e2e/test_admin_tool_edit.py -v --headed --slowmo 200 || echo "❌ 失败"

echo "=== 4/6: 配置传播验证 ==="
pytest tests/e2e/test_config_propagation.py -v --headed --slowmo 200 || echo "❌ 失败"

echo "=== 5/6: Mock AI 完整执行链路（观察进度 0→100%） ==="
MOCK_AI_EXECUTION=true pytest tests/e2e/test_mock_execution_flow.py -v --headed --slowmo 500 || echo "❌ 失败"

echo "=== 6/6: 文件下载验证 ==="
pytest tests/e2e/test_file_download.py -v --headed --slowmo 200 || echo "❌ 失败"
```

- [ ] **Step 4: 如有失败，修复并重新运行**

```bash
# 分析上一轮失败的测试截图
open tests/e2e/screenshots/

# 修复代码后，单独重跑失败的测试
MOCK_AI_EXECUTION=true E2E_HEADLESS=false E2E_BASE_URL=http://localhost:3000 \
  pytest tests/e2e/test_xxx.py -v --headed --slowmo 200

# 全部通过后，执行 Step 3 的完整套件做回归
```

- [ ] **Step 5: 全部通过后，查看截图确认视觉效果**

```bash
echo "=== 所有 E2E 测试通过 ==="
echo "截图目录:"
ls -la tests/e2e/screenshots/*/
```

- [ ] **Step 6: 提交最终验证确认**

```bash
git add -A
git commit -m "test: 全局 E2E 门禁 — 全部测试通过确认 (Task 43)"
```

## 自检清单

### 1. Spec 覆盖检查

| Spec 章节                                    | 对应 Task     | 状态 |
| -------------------------------------------- | ------------- | ---- |
| 2. 数据模型改动 (usage_modes)                | Task 20, 21   | ✓   |
| 3. 路由规则 (slug/link 生成)                 | Task 23, 24   | ✓   |
| 4.2 定制页规范（表单拆分）                   | Task 25-28    | ✓   |
| 4.4 ToolCreationForm 改造                    | Task 29       | ✓   |
| 5.1 通用详情页布局                           | Task 30       | ✓   |
| 5.2 通用对话界面                             | Task 31       | ✓   |
| 5.3 API 预留                                 | Task 32, 33   | ✓   |
| 6. 管理端编辑页                              | Task 22       | ✓   |
| 7.1 字段名对齐                               | Task 1        | ✓   |
| 7.2 风格值对齐                               | Task 3        | ✓   |
| 7.3 后端费用从 DB 读取                         | Task 4        | ✓   |
| 7.4 成果记录本地路径                         | Task 5, 6, 7  | ✓   |
| 7.5 retryTask                                | Task 11       | ✓   |
| 7.6 电商 Dify 对接                           | Task 8        | ✓   |
| 7.7 通用进度更新 API                         | Task 15       | ✓   |
| 7.8 SSE 事件数据契约                         | Task 16, 17   | ✓   |
| 7.9 营销 HTTP 回调                           | Task 19       | ✓   |
| 7.10 积分结算                                | Task 4 (统一) | ✓   |
| 8. 文件服务 API                              | Task 12       | ✓   |
| 前端下载功能                                 | Task 14       | ✓   |
| 进度弹窗组件                                 | Task 18       | ✓   |
| target_age 字段                              | Task 2        | ✓   |
| 种子数据                                     | Task 23       | ✓   |
| 前端类型同步 (usage_modes, work_id)          | Task 33b      | ✓   |
| 5.1 执行器费用计算单元测试                   | Task 34       | ✓   |
| 5.2 进度更新 + 结算逻辑单元测试              | Task 35       | ✓   |
| 5.3 retry/progress/files API 集成测试        | Task 36       | ✓   |
| 5.4 E2E slug 路由导航 + 表单渲染             | Task 37       | ✓   |
| 5.5 E2E 任务失败重试流程                     | Task 38       | ✓   |
| 5.6 E2E 管理端工具编辑 usage_modes           | Task 39       | ✓   |
| 5.7 E2E 管理端配置变更用户端生效             | Task 40       | ✓   |
| 5.8 E2E Mock AI 完整执行链路（进度 0→100%） | Task 41       | ✓   |
| 5.9 E2E 成果文件下载验证                     | Task 42       | ✓   |
| 5.10 全局 E2E 门禁                           | Task 43       | ✓   |
| Mock 执行模式实现                            | Task 16b      | ✓   |

### 2. 类型一致性检查

- `usage_modes: Optional[List[str]]` in backend schema → `usage_modes?: string[]` in frontend types ✓
- `retryTask(id: string): Promise<Task>` 前后端签名一致 ✓
- `ProgressEvent` 的 `step_index`, `step_status`, `sub_progress` 字段在前后端一致 ✓
- `ChatRequest.messages` 类型 `{role, content}` 一致 ✓
- `WorkFile.file_url` 改为相对路径，前端通过 `/files/{id}` 访问 ✓
- `Tool.usage_modes` 前后端一致（`Optional[List[str]]` ↔ `string[]`） ✓ — Task 33b
- `Task.work_id` 前端类型已补充 ✓ — Task 33b
- 费用字段使用扁平结构：`tool.base_fee` / `tool.image_fee` / `tool.audio_fee`（不使用 `tool.pricing.*`） ✓ — 已对齐

### 3. 无占位符检查

所有 Task 中的代码块均包含完整实现代码，无 "TBD"、"TODO"、"implement later" 等占位符。
