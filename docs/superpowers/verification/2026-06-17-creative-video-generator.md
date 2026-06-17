# 创意视频生成器 P0 — Task 9 手工端到端验收清单

适用计划：[`docs/superpowers/plans/2026-06-17-creative-video-generator.md`](../plans/2026-06-17-creative-video-generator.md)

> 本验收清单由父代理在执行 Task 9 时记录使用，对应计划 §Task 9 “Manual end-to-end verification”。  
> Redis 由你手动启动。本会话默认 **不调用真实 Seedance API**（你已确认“我不验收实际生成”）。  
> 数据库走 `apps/backend/.env` 中的远程 RDS。

## 0. 前置检查

- [ ] `apps/backend/.env` 中 `DATABASE_URL` 与 `REDIS_URL` 与运行环境一致。
- [ ] 本地 `localhost:6379` Redis 可达（PowerShell：`Test-NetConnection localhost -Port 6379`）。
- [ ] 火山方舟相关 key 是否真的需要：本次仅做表单/上传/校验/页面验收，不实际触发视频生成；如需真实生成，再确认 key。

## 1. seed 数据同步

```bash
cd apps/backend
python -m app.seed_data
```

预期输出包含：

```
✓ 已同步 6 个工具
```

或 `已同步 N 个工具` 中至少包含 `creative-video-generator`。

- [ ] 数据库中存在 `tools.slug = 'creative-video-generator'` 行，`executor_key`、`param_schema`、`pricing_schema` 不为空。

## 2. 后端服务启动

终端 A（uvicorn）：

```bash
cd apps/backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

终端 B（celery worker）：

```bash
cd apps/backend
celery -A app.workers.celery_app worker --loglevel=info -Q medium,fast
```

- [ ] `http://localhost:8000/api/v1/health` 返回 200。
- [ ] celery 日志出现 `ready` / 队列订阅成功。

## 3. 前端服务启动

终端 C：

```bash
pnpm --filter @lcaitool/frontend-user dev
```

- [ ] `http://localhost:3000` 可访问，无 hydration 报错。

## 4. 表单页验收（不触发真实生成）

打开 `http://localhost:3000/tools/creative-video-generator`：

- [ ] 标题/简介/分类显示正确，分类为“视频创作”。
- [ ] 表单顺序符合 P0 schema：参考素材 → 创意描述 → 视频参数。
- [ ] 字段：
  - [ ] 首帧参考图（file，accept image/*）。
  - [ ] 尾帧参考图（file，accept image/*）。
  - [ ] 创意描述（textarea，placeholder 含“结合图片，输入创意描述（文生视频必填）”）。
  - [ ] 视频比例 radio，选项含 21:9 / 16:9 / 4:3 / 1:1 / 3:4 / 9:16 / 智能，默认“智能”。
  - [ ] 分辨率 radio，选项 480p / 720p / 1080p，默认 480p。
  - [ ] 视频时长 radio，选项 按秒数 / 智能时长，默认按秒数。
  - [ ] 秒数 range，min 4，max 12，默认 6。
  - [ ] 选择生成数量 range，min 1 max 1，helpText “多条生成即将上线”。
  - [ ] 输出声音 boolean，默认 true。
  - [ ] 样片速览 action 按钮。
- [ ] “预计消耗” 区域显示 `10 积分`（来自 base_fee）。

## 5. 校验拦截

### 只上传尾帧

- 操作：仅上传一张尾帧图片，不上传首帧，prompt 留空。
- 点击 “开始生成” 后：
  - [ ] toast 报错 “不能只上传尾帧，请先上传首帧参考图”。
  - [ ] 不创建任务（`/tasks` 无新增）。

### 文生视频缺 prompt

- 操作：不传任何图片，prompt 留空。
- 点击 “开始生成”：
  - [ ] toast 报错 “文生视频模式下请输入创意描述”。
  - [ ] 不创建任务。

### 时长越界

- 操作：选择按秒数，把秒数调到 3 或 13（如果 UI 限制不到，可用 DevTools 临时改值）。
- 点击 “开始生成”：
  - [ ] toast 报错 “视频时长必须在 4-12 秒之间”。

### 数量异常（理论上 UI 不会让数量 ≠ 1，跳过即可）

## 6. 上传链路（不触发生成）

- 操作：仅上传一张首帧 PNG/JPG。
- 期望：
  - [ ] 网络请求 `POST /api/v1/files/uploads` 返回 200，body 含 `id`、`file_name`、`mime_type`。
  - [ ] 上传完成后字段显示已上传状态，再次点击可重新选择。
  - [ ] 表单 state 中 `first_frame` 存的是 upload id（不是 dataURL，不是文件名）。

## 7. 成果详情页视频预览（mock 数据通过手工浏览验证）

> 因为 Task 9 不实际生成视频，成果详情页可挑选已有 video 类型的 work_id 验证；如没有，可先跳过此项，留待真实生成时再验。

- [ ] 路径 `/works/detail/<work_id>` 存在 video 文件时：
  - [ ] preview tab 显示 `<video controls>`，能播放。
  - [ ] 多视频时显示视频卡片列表（filename + size + 下载按钮）。
  - [ ] files tab 视频行有 “播放” 按钮，点击切回 preview tab。
- [ ] 同 work 中如有 image 类型，仍按图片预览展示，未被破坏。

## 8. 证据记录

- [ ] 截图：表单页、上传成功状态、各校验 toast、files tab 视频行（可选）。
- [ ] 任务 / Work / WorkFile id（实际生成时再补，本次跳过）。
- [ ] 后端日志中是否出现 `watermark=False` 字样（请勿打印任何 API key）。

## 9. 收尾

- [ ] 关闭后台 uvicorn / celery / pnpm dev 进程。
- [ ] 如需要回滚 seed 数据库变更，按团队 SOP 处理；本验收不主动删数据。

---

**说明**：Task 9 本次跳过真实 Seedance 调用。提交清单与执行流程见 `MEMORY.md` 与 plan 文件。
