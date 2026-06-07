"""
有声绘本工具执行器
标杆工具1：AI有声绘本生成专家
多 Provider 架构：
- 火山方舟 DeepSeek -> 故事大纲 + 插画提示词
- 豆包 Seedream 4.5 -> 图片生成
- 智谱 GLM-TTS -> 语音合成

执行步骤：
1. 故事大纲 + 智能分页 (0-20%)
2. 插画提示词生成 (20-35%)
3. 批量图片生成 (35-60%)
4. 语音合成 (60-80%)
5. PDF排版 (80-95%)
6. 完成结算 (100%)
"""
import asyncio
import base64
import json
import math
import os
import re
import time
import struct
import uuid
import wave
import zlib
from typing import Dict, Any, List, Optional

import aiofiles
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor
from app.providers.ai import AIProviderFactory
from app.models.task import WorkFile
from app.services.task_service import TaskService
from app.services.work_service import WorkService
from app.schemas.task import WorkCreate, WorkFileCreate
from app.utils.pdf_generator import PDFGenerator


class StorybookExecutor(BaseToolExecutor):
    """有声绘本执行器 (多 Provider 架构)"""

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, tool=tool, progress_callback=progress_callback)
        self.doubao_provider = None  # lazy init
        self.zhipu_provider = None
        self.pdf_generator = PDFGenerator()

    async def _init_providers(self):
        """延迟初始化 AI Provider（从数据库获取配置）"""
        if self.doubao_provider is None:
            self.doubao_provider = await AIProviderFactory.get_provider_from_db(
                self.db, "volcano"
            )
            self.zhipu_provider = await AIProviderFactory.get_provider_from_db(
                self.db, "zhipu"
            )

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        """
        预估费用
        :param params: 工具参数
        :return: 预估费用（积分）
        """
        page_count = params.get('page_count', 5)
        voice_type = params.get('voiceType', 'none')
        include_audio = voice_type != 'none'

        base_fee = self._tool_config.get('base_fee', 20)
        image_fee = self._tool_config.get('image_fee', 2)
        audio_fee = self._tool_config.get('audio_fee', 1)

        total = base_fee
        total += image_fee * (page_count or 1)
        if include_audio:
            total += audio_fee * (page_count or 1)

        return total

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行有声绘本生成任务 (6 步)
        :param params: 工具参数
        :return: 执行结果
        """
        # 初始化 providers
        await self._init_providers()

        # 获取持久化工作目录
        works_dir = self.get_works_dir()

        # 检查是否有快照可以恢复
        snapshot = await self.get_snapshot()
        start_step = snapshot.get('step', 0) if snapshot else 0

        # 提取参数
        theme = params.get('theme', '勇敢的小兔子')
        story_content = params.get('storyContent', '')
        target_age = params.get('target_age', '3-6')
        page_count = params.get('page_count', 5)
        art_style = params.get('art_style', 'watercolor')
        # allowCustom 机制下 art_style 直接就是用户输入值，不再有 custom_style
        voice_type = params.get('voiceType', 'tongtong')
        # 根据 voiceType 判断是否包含音频（替代 include_audio）
        include_audio = voice_type != 'none'
        smart_page_count = params.get('smart_page_count', False)

        # smart_page_count 为 true 时 page_count 可能为 null，由执行器内部处理
        if smart_page_count and not page_count:
            page_count = None  # 让 AI 决定页数

        # 初始化结果数据
        result_data = snapshot.get('data', {}) if snapshot else {}

        try:
            total_steps = 6
            # Step 1: 故事大纲 + 智能分页 (0-20%)
            if start_step <= 1:
                await self.update_progress(
                    percent=5, message="正在生成故事大纲...",
                    step_index=0, total_steps=total_steps, step_status='running',
                )
                outline = await self._generate_story_outline(
                    theme, target_age, story_content=story_content, smart_page_count=smart_page_count
                )
                result_data['outline'] = outline
                # 如果 AI 建议了页数，覆盖用户设置的页数
                if smart_page_count and 'suggested_page_count' in outline:
                    page_count = outline['suggested_page_count']
                await self.save_snapshot({'step': 2, 'data': result_data})
                await self.add_log('info', '故事大纲生成完成', {
                    'title': outline.get('title'),
                    'page_count': page_count
                })

            # Step 2: 插画提示词生成 (20-35%)
            if start_step <= 2:
                await self.update_progress(
                    percent=20, message="正在生成插画提示词...",
                    step_index=1, total_steps=total_steps, step_status='running',
                )
                pages = await self._generate_illustration_prompts(
                    result_data['outline'], page_count, art_style
                )
                result_data['pages'] = pages
                await self.save_snapshot({'step': 3, 'data': result_data})
                await self.add_log('info', f'{len(pages)} 页插画提示词生成完成')

            # Step 3: 批量图片生成 - 豆包 Seedream 4.5 (35-60%)
            if start_step <= 3:
                await self.update_progress(
                    percent=35, message="正在生成插画...",
                    step_index=2, total_steps=total_steps, step_status='running',
                )
                pages_with_images = await self._generate_images_serial(
                    result_data['pages'], works_dir
                )
                result_data['pages'] = pages_with_images
                await self.save_snapshot({'step': 4, 'data': result_data})
                await self.add_log('info', f'{len(pages_with_images)} 页插画生成完成')

            # Step 4: 语音合成 - 智谱 GLM-TTS (60-80%)
            if include_audio and start_step <= 4:
                await self.update_progress(
                    percent=60, message="正在生成语音 narration...",
                    step_index=3, total_steps=total_steps, step_status='running',
                )
                pages_with_audio = await self._generate_audio_serial(
                    result_data['pages'], works_dir, voice_type
                )
                result_data['pages'] = pages_with_audio
                await self.save_snapshot({'step': 5, 'data': result_data})
                await self.add_log('info', '语音合成完成')

            # Step 5: PDF排版 (80-95%)
            if start_step <= 5:
                await self.update_progress(
                    percent=80, message="正在生成PDF...",
                    step_index=4, total_steps=total_steps, step_status='running',
                )
                files = await self._generate_pdf_and_zip(result_data, works_dir)
                result_data['files'] = files
                await self.save_snapshot({'step': 6, 'data': result_data})
                await self.add_log('info', 'PDF生成完成')

            # Step 6: 创建成果记录 (95-100%)
            await self.update_progress(
                percent=95, message="正在保存成果...",
                step_index=5, total_steps=total_steps, step_status='running',
            )
            work = await self._create_work_record(params, result_data)
            result_data['work_id'] = str(work.id)

            await self.update_progress(
                percent=100, message="生成完成！",
                step_index=5, total_steps=total_steps, step_status='completed',
            )
            await self.add_log('info', '有声绘本任务执行完成')

            return {
                'success': True,
                'work_id': str(work.id),
                'title': result_data['outline'].get('title', ''),
                'page_count': len(result_data['pages']),
                'files': result_data.get('files', {})
            }

        except Exception as e:
            await self.add_log('error', f'任务执行失败: {str(e)}', {'error_type': type(e).__name__})
            raise

    async def _generate_story_outline(
        self, theme: str, target_age: str, story_content: str = "", smart_page_count: bool = False
    ) -> Dict[str, Any]:
        """
        使用火山方舟 DeepSeek (thinking 模式) 生成故事梗概
        :param theme: 故事主题（当有 story_content 时作为标题参考）
        :param target_age: 目标年龄段
        :param story_content: 用户提供的故事文案（非空时优先使用，提炼为大纲）
        :param smart_page_count: 是否让 AI 建议页数
        :return: 包含 title/story/suggested_page_count 的字典
        """
        system_prompt = (
            "你是一位儿童绘本作家。要求：\n"
            "1. 用简体中文写作\n"
            "2. 不要使用特殊字符、星号或markdown格式\n"
            "3. 故事要有趣且富有想象力\n"
            "4. 保持在200-300字之间\n"
            "5. 分成3-4个自然段落\n"
            "6. 使用简单明了的语言\n"
            "7. 避免使用括号、方括号或任何可能影响文本转语音的符号"
        )

        if smart_page_count:
            system_prompt += (
                "\n根据故事内容，在5-30页范围内给出合适的页数。\n"
                '输出JSON格式：{"title": "...", "story": "...", "suggested_page_count": N}'
            )
        else:
            system_prompt += '\n输出JSON格式：{"title": "...", "story": "..."}'

        if story_content:
            user_prompt = (
                f"以下是一段故事文案，请为{target_age}岁的儿童将其提炼为绘本故事大纲，"
                f"保持核心情节完整，语言更适合儿童阅读：\n\n{story_content}"
            )
        else:
            user_prompt = f"请根据主题「{theme}」为{target_age}岁的儿童写一个短故事。"

        _t0 = time.time()
        response = await self.doubao_provider.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            thinking=True
        )
        _t1 = time.time()

        await self._record_llm_interaction(
            step_name="故事大纲生成",
            model="deepseek-v4-pro",
            prompt=user_prompt,
            system_prompt=system_prompt,
            response=response,
            response_type="text",
            duration=_t1 - _t0,
            usage={"input": response.usage.get("prompt_tokens", 0), "output": response.usage.get("completion_tokens", 0)}
                if response.usage else None,
        )

        if not response.success:
            raise RuntimeError(f"故事梗概生成失败: {response.error}")

        try:
            json_match = re.search(r'\{[\s\S]*\}', response.content)
            if json_match:
                return json.loads(json_match.group())
        except (json.JSONDecodeError, ValueError):
            pass

        # 回退：返回包含原始文本的默认结构
        return {'title': theme, 'story': response.content}

    async def _generate_illustration_prompts(
        self, outline: Dict[str, Any], page_count: int, art_style: str
    ) -> List[Dict[str, Any]]:
        """
        使用火山方舟 DeepSeek 为每一页生成插画提示词
        :param outline: 故事大纲 (含 story 字段)
        :param page_count: 页数
        :param art_style: 绘画风格
        :return: 包含 description/prompt/text_snippet/importance 的列表
        """
        story = outline.get('story', outline.get('synopsis', ''))

        system_prompt = (
            "你是一个专业的儿童绘本插画师和AI绘画提示词专家。\n"
            "请根据用户提供的绘本故事，为每一页生成一个中文绘图提示词。\n"
            "你必须严格输出 JSON 数组格式，不要添加任何其他文字说明。\n"
            "输出格式示例：\n"
            '[\n'
            '  {\n'
            '    "description": "场景描述文字",\n'
            f'    "prompt": "Character:\\n[角色具体特征描述]\\n\\nScene:\\n[场景描述]\\n\\nLighting:\\n[光影描述]\\n\\nComposition:\\n[构图描述]\\n\\nStyle:\\n{art_style}\\n\\nAdditional:\\n[补充细节]",\n'
            '    "text_snippet": "对应的故事文本",\n'
            '    "importance": 5\n'
            '  }\n'
            "]"
        )

        user_prompt = (
            f"绘本故事内容：\n{story}\n\n"
            f"请为这个故事生成 {page_count} 个不同场景的中文绘图提示词，"
            f"绘画风格：{art_style}"
        )

        _t0 = time.time()
        response = await self.doubao_provider.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            thinking=False
        )
        _t1 = time.time()

        await self._record_llm_interaction(
            step_name="插画提示词生成",
            model="deepseek-v4-flash",
            prompt=user_prompt,
            system_prompt=system_prompt,
            response=response,
            response_type="text",
            duration=_t1 - _t0,
            usage={"input": response.usage.get("prompt_tokens", 0), "output": response.usage.get("completion_tokens", 0)}
                if response.usage else None,
        )

        if not response.success:
            raise RuntimeError(f"插画提示词生成失败: {response.error}")

        try:
            content = response.content.strip()
            # 去掉可能的 markdown 代码块包裹
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
            json_match = re.search(r'\[[\s\S]*\]', content)
            if json_match:
                result = json.loads(json_match.group())
                if isinstance(result, list):
                    return result
        except (json.JSONDecodeError, ValueError):
            # 解析失败时记录响应内容，便于调试
            await self.add_log('error', f'插画提示词JSON解析失败, AI响应前200字符: {content[:200]}')

        raise RuntimeError("插画提示词JSON解析失败")

    async def _generate_images_serial(
        self, pages: List[Dict[str, Any]], works_dir: str
    ) -> List[Dict[str, Any]]:
        """
        串行生成图片（带限流），使用豆包 Seedream 4.5
        :param pages: 页面列表（需包含 prompt 字段）
        :param works_dir: 工作目录
        :return: 更新后的页面列表
        """
        semaphore = asyncio.Semaphore(2)
        total_pages = len(pages)

        async def generate_single(page: Dict[str, Any], index: int) -> Dict[str, Any]:
            async with semaphore:
                try:
                    prompt = page.get('prompt', page.get('image_prompt_en', ''))
                    if not prompt:
                        page['image_url'] = self._create_dummy_image(index + 1, works_dir)
                        page['image_generated'] = False
                        return page

                    _t0 = time.time()
                    response = await self.doubao_provider.generate_image(
                        prompt=prompt,
                        size="1920x1920"
                    )
                    _t1 = time.time()

                    await self._record_llm_interaction(
                        step_name="批量插画生成",
                        model="doubao-seedream-4.5",
                        prompt=prompt,
                        response=response,
                        response_type="image",
                        duration=_t1 - _t0,
                        extra_info=f"第 {index + 1}/{total_pages} 张",
                    )

                    if response.success and response.content:
                        # response.content 是 base64 编码的图片数据
                        image_dir = os.path.join(works_dir, 'images')
                        os.makedirs(image_dir, exist_ok=True)
                        image_path = os.path.join(image_dir, f'page_{index + 1:03d}.png')

                        img_bytes = base64.b64decode(response.content)
                        async with aiofiles.open(image_path, 'wb') as f:
                            await f.write(img_bytes)

                        page['image_url'] = image_path
                        page['image_generated'] = True
                    else:
                        page['image_url'] = self._create_dummy_image(index + 1, works_dir)
                        page['image_generated'] = False

                    # 更新进度: 35% -> 60%
                    pct = 35 + int((index + 1) / total_pages * 25)
                    await self.update_progress(
                        percent=pct, message=f"正在生成插画 ({index + 1}/{total_pages})...",
                        step_index=2, total_steps=6, step_status='running',
                        sub_progress=f"{index + 1}/{total_pages}",
                    )

                except Exception as e:
                    page['image_url'] = self._create_dummy_image(index + 1, works_dir)
                    page['image_generated'] = False
                    page['image_error'] = str(e)

                return page

        results = []
        for i, page in enumerate(pages):
            result = await generate_single(page, i)
            results.append(result)

        return results

    async def _generate_audio_serial(
        self, pages: List[Dict[str, Any]], works_dir: str, voice_type: str = 'tongtong'
    ) -> List[Dict[str, Any]]:
        """
        串行生成语音（带限流），使用智谱 GLM-TTS
        :param pages: 页面列表（需包含 text_snippet 字段）
        :param works_dir: 工作目录
        :param voice_type: 智谱音色名称
        :return: 更新后的页面列表
        """
        voice = voice_type or 'tongtong'

        semaphore = asyncio.Semaphore(3)
        total_pages = len(pages)

        async def generate_single(page: Dict[str, Any], index: int) -> Dict[str, Any]:
            async with semaphore:
                try:
                    text = page.get('text_snippet', page.get('text', ''))
                    if not text:
                        page['audio_url'] = None
                        page['audio_generated'] = False
                        return page

                    _t0 = time.time()
                    response = await self.zhipu_provider.generate_audio(
                        text=text,
                        voice=voice
                    )
                    _t1 = time.time()

                    await self._record_llm_interaction(
                        step_name="语音合成",
                        model="zhipu-glm-tts",
                        prompt=text,
                        response=response,
                        response_type="audio",
                        duration=_t1 - _t0,
                        extra_info=f"第 {index + 1}/{total_pages} 段",
                    )

                    if response.success and response.content:
                        # response.content 是 base64 编码的音频数据
                        audio_dir = os.path.join(works_dir, 'audio')
                        os.makedirs(audio_dir, exist_ok=True)
                        audio_path = os.path.join(audio_dir, f'page_{index + 1:03d}.mp3')

                        audio_bytes = base64.b64decode(response.content)
                        async with aiofiles.open(audio_path, 'wb') as f:
                            await f.write(audio_bytes)

                        page['audio_url'] = audio_path
                        page['audio_generated'] = True
                    else:
                        page['audio_url'] = None
                        page['audio_generated'] = False

                    # 更新进度: 60% -> 80%
                    pct = 60 + int((index + 1) / total_pages * 20)
                    await self.update_progress(
                        percent=pct, message=f"正在生成语音 ({index + 1}/{total_pages})...",
                        step_index=3, total_steps=6, step_status='running',
                        sub_progress=f"{index + 1}/{total_pages}",
                    )

                except Exception as e:
                    page['audio_url'] = None
                    page['audio_generated'] = False
                    page['audio_error'] = str(e)

                return page

        results = []
        for i, page in enumerate(pages):
            result = await generate_single(page, i)
            results.append(result)

        return results

    @staticmethod
    def _create_dummy_image(page_num: int, works_dir: str) -> str:
        """创建占位图片文件到持久化目录"""
        path = os.path.join(works_dir, 'images', f'page_{page_num}.png')
        os.makedirs(os.path.dirname(path), exist_ok=True)

        try:
            from PIL import Image, ImageDraw
            img = Image.new('RGB', (1024, 1024), color=(240, 248, 255))
            draw = ImageDraw.Draw(img)
            draw.text((400, 500), f'Page {page_num}', fill=(30, 58, 95))
            img.save(path, 'PNG')
        except ImportError:
            def _make_png(r, g, b):
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

    @staticmethod
    def _create_dummy_audio(page_num: int, works_dir: str) -> str:
        """创建占位音频文件（WAV格式）到持久化目录"""
        path = os.path.join(works_dir, 'audio', f'page_{page_num}.wav')
        os.makedirs(os.path.dirname(path), exist_ok=True)

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

    async def _generate_pdf_and_zip(self, result_data: Dict[str, Any], works_dir: str) -> Dict[str, str]:
        """生成PDF文件"""
        outline = result_data.get('outline', {})
        pages = result_data.get('pages', [])

        title = outline.get('title', '有声绘本')
        pdf_path = os.path.join(works_dir, 'storybook.pdf')
        self.pdf_generator.generate_storybook_pdf(
            title=title,
            pages=pages,
            output_path=pdf_path
        )

        return {
            'pdf_path': pdf_path,
            'pdf_size': os.path.getsize(pdf_path)
        }

    async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]) -> Any:
        """创建成果记录"""
        task = await TaskService.get_by_id(self.db, self.task_id)
        outline = result_data.get('outline', {})
        pages = result_data.get('pages', [])
        files = result_data.get('files', {})

        work_in = WorkCreate(
            user_id=task.user_id,
            task_id=self.task_id,
            tool_id=task.tool_id,
            title=outline.get('title', '有声绘本'),
            description=outline.get('story', outline.get('synopsis', '')),
            cover_image=None,  # 先置空，flush 获取文件 ID 后再填充
            status="published",
            is_public=False,
            version=1
        )
        work = await WorkService.create_work(self.db, work_in)

        # 收集所有新增的 WorkFile 对象，用于获取 ID 后更新 cover_image
        first_image_file = None  # 记录第一张图片作为封面

        pdf_path = files.get('pdf_path')
        if pdf_path:
            pdf_file = WorkFile(**WorkFileCreate(
                work_id=work.id,
                file_type="pdf",
                file_name=f"{work.title}.pdf",
                file_url="storybook.pdf",
                file_size=files.get('pdf_size', 0),
                mime_type="application/pdf"
            ).model_dump())
            self.db.add(pdf_file)

        for page in pages:
            page_num = page.get('page_number', 0) or (pages.index(page) + 1)

            image_url = page.get('image_url')
            if image_url:
                img_file = WorkFile(**WorkFileCreate(
                    work_id=work.id,
                    file_type="image",
                    file_name=f"page_{page_num:03d}.png",
                    file_url=f"images/page_{page_num:03d}.png",
                    page_number=page_num,
                    mime_type="image/png"
                ).model_dump())
                self.db.add(img_file)
                if first_image_file is None:
                    first_image_file = img_file

            audio_url = page.get('audio_url')
            if audio_url:
                # 根据扩展名判断 MIME 类型
                mime_type = "audio/mpeg" if audio_url.endswith('.mp3') else "audio/wav"
                ext = '.mp3' if audio_url.endswith('.mp3') else '.wav'
                self.db.add(WorkFile(**WorkFileCreate(
                    work_id=work.id,
                    file_type="audio",
                    file_name=f"page_{page_num:03d}{ext}",
                    file_url=f"audio/page_{page_num:03d}{ext}",
                    page_number=page_num,
                    mime_type=mime_type
                ).model_dump()))

        # flush 以获取自动生成的 ID，然后更新封面图
        await self.db.flush()

        if first_image_file:
            work.cover_image = f"/api/v1/files/works/{first_image_file.id}"

        # 注册 prompts.md 为 WorkFile（如果存在）
        await self._register_prompts_md_workfile(work.id)

        await self.db.commit()

        return work
