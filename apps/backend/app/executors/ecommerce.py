"""
电商详情页生成工具执行器 — Dify 集成版本
通过 Dify Workflow Run API (streaming mode) 驱动进度
"""
import json
import os
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from .base import BaseToolExecutor, RecordedResponse
from app.services.task_service import TaskService
from app.services.work_service import WorkService
from app.schemas.task import WorkCreate, WorkFileCreate
from app.models.task import WorkFile

logger = logging.getLogger(__name__)

# Dify 节点 → 本地步骤映射
DIFY_STEP_MAP = {
    "generate_description":  {"step": 0, "name": "商品文案", "weight": 20},
    "generate_main_image":   {"step": 1, "name": "商品主图", "weight": 25},
    "generate_detail_image": {"step": 2, "name": "详情分段图", "weight": 25},
    "generate_psd":          {"step": 3, "name": "PSD 源文件", "weight": 20},
    "package":               {"step": 4, "name": "保存交付", "weight": 10},
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
        result = base_fee + total_images * image_fee
        logger.info(
            f"[EcommerceExecutor.estimate_cost] "
            f"main_image_count={main_image_count}, detail_image_count={detail_image_count}, "
            f"base_fee={base_fee}, image_fee={image_fee}, result={result}"
        )
        return result

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        works_dir = self.get_works_dir()
        _t0 = time.time()
        dify_inputs = {
            "product_name": params.get("product_name", ""),
            "product_description": params.get("product_description", ""),
            "main_image_count": params.get("main_image_count", 3),
            "detail_image_count": params.get("detail_image_count", 3),
        }

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
                        _t1 = time.time()
                        copywriting = outputs.get("copywriting", {})
                        text_output = json.dumps(copywriting, ensure_ascii=False, indent=2) if copywriting else "（无文本输出）"

                        await self._record_llm_interaction(
                            step_name="Dify 工作流",
                            model="dify-workflow",
                            prompt=json.dumps(dify_inputs, ensure_ascii=False, indent=2),
                            response_type="text",
                            response=RecordedResponse(content=text_output),
                            duration=_t1 - _t0,
                        )
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
            self.db.add(WorkFile(**img_file_in.model_dump()))

        # 注册 prompts.md 为 WorkFile（如果存在）
        await self._register_prompts_md_workfile(work.id)

        await self.db.commit()
        return work
