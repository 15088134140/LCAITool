"""
有声绘本工具执行器
标杆工具1：AI有声绘本生成专家

执行步骤：
1. 故事大纲生成 (0-15%)
2. 分页故事文本生成 (15-25%)
3. 插画提示词生成 (25-35%)
4. 批量图片生成 (35-60%)
5. 语音合成 (60-80%)
6. PDF排版与打包 (80-95%)
7. 完成结算 (100%)
"""
import asyncio
import json
import math
import os
import struct
import uuid
import zipfile
import wave
import zlib
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .base import BaseToolExecutor
from app.providers.ai import AIProviderFactory
from app.models.task import WorkFile
from app.services.task_service import TaskService
from app.schemas.task import WorkCreate, WorkFileCreate
from app.utils.pdf_generator import PDFGenerator


class StorybookExecutor(BaseToolExecutor):
    """有声绘本执行器"""

    MAX_PARALLEL_IMAGES = 3  # 最大并行图片生成数
    MAX_PARALLEL_AUDIOS = 5  # 最大并行音频生成数

    def __init__(
        self,
        task_id: uuid.UUID,
        db: AsyncSession,
        tool: Optional[Dict[str, Any]] = None,
        progress_callback=None
    ):
        super().__init__(task_id, db, progress_callback)
        self.ai_provider = AIProviderFactory.get_provider("doubao")
        self.pdf_generator = PDFGenerator()
        self._tool_config = tool or {}

    def estimate_cost(self, params: Dict[str, Any]) -> int:
        """
        预估费用
        :param params: 工具参数
        :return: 预估费用（积分）
        """
        page_count = params.get('page_count', 5)
        include_audio = params.get('include_audio', True)

        base_fee = self._tool_config.get('base_fee', 20)
        image_fee = self._tool_config.get('image_fee', 2)
        audio_fee = self._tool_config.get('audio_fee', 1)

        total = base_fee
        total += image_fee * page_count
        if include_audio:
            total += audio_fee * page_count

        return total

    async def execute(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """
        执行有声绘本生成任务
        :param params: 工具参数
        :return: 执行结果
        """
        # 获取持久化工作目录
        works_dir = self.get_works_dir()

        # 检查是否有快照可以恢复
        snapshot = await self.get_snapshot()
        start_step = snapshot.get('step', 0) if snapshot else 0

        # 提取参数
        theme = params.get('theme', '勇敢的小兔子')
        target_age = params.get('target_age', '3-6')
        page_count = params.get('page_count', 5)
        art_style = params.get('art_style', 'watercolor')
        include_audio = params.get('include_audio', True)
        language = params.get('language', 'zh')

        # 初始化结果数据
        result_data = snapshot.get('data', {}) if snapshot else {}

        try:
            # Step 1: 生成故事大纲 (0-15%)
            if start_step <= 1:
                await self.update_progress(5, "正在生成故事大纲...")
                outline = await self._generate_story_outline(theme, target_age, page_count)
                result_data['outline'] = outline
                await self.save_snapshot({'step': 2, 'data': result_data})
                await self.add_log('info', '故事大纲生成完成', {'title': outline.get('title')})

            # Step 2: 生成分页故事文本 (15-25%)
            if start_step <= 2:
                await self.update_progress(15, "正在生成分页故事...")
                pages = await self._generate_story_pages(result_data['outline'], page_count)
                result_data['pages'] = pages
                await self.save_snapshot({'step': 3, 'data': result_data})
                await self.add_log('info', f'{len(pages)} 页故事文本生成完成')

            # Step 3: 生成插画提示词 (25-35%)
            if start_step <= 3:
                await self.update_progress(25, "正在生成插画提示词...")
                pages_with_prompts = await self._generate_illustration_prompts(
                    result_data['pages'], art_style
                )
                result_data['pages'] = pages_with_prompts
                await self.save_snapshot({'step': 4, 'data': result_data})
                await self.add_log('info', '插画提示词生成完成')

            # Step 4: 批量生成图片 (35-60%)
            if start_step <= 4:
                await self.update_progress(35, "正在生成插画...")
                pages_with_images = await self._generate_images_parallel(
                    result_data['pages'], art_style, works_dir
                )
                result_data['pages'] = pages_with_images
                await self.save_snapshot({'step': 5, 'data': result_data})
                await self.add_log('info', f'{len(pages_with_images)} 页插画生成完成')

            # Step 5: 语音合成 (60-80%)
            if include_audio and start_step <= 5:
                await self.update_progress(60, "正在生成语音 narration...")
                pages_with_audio = await self._generate_audio_parallel(result_data['pages'], works_dir)
                result_data['pages'] = pages_with_audio
                await self.save_snapshot({'step': 6, 'data': result_data})
                await self.add_log('info', '语音合成完成')

            # Step 6: PDF排版与打包 (80-95%)
            if start_step <= 6:
                await self.update_progress(80, "正在生成PDF并打包...")
                files = await self._generate_pdf_and_zip(result_data, works_dir)
                result_data['files'] = files
                await self.save_snapshot({'step': 7, 'data': result_data})
                await self.add_log('info', 'PDF生成与打包完成')

            # Step 7: 创建成果记录 (95-100%)
            await self.update_progress(95, "正在保存成果...")
            work = await self._create_work_record(params, result_data)
            result_data['work_id'] = str(work.id)

            await self.update_progress(100, "生成完成！")
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

    async def _generate_story_outline(self, theme: str, target_age: str, page_count: int) -> Dict[str, Any]:
        """生成故事大纲"""
        system_prompt = """你是一位专业的儿童绘本编剧，擅长创作适合不同年龄段儿童的故事。
请根据主题创作一个完整的故事大纲，包含：
1. 故事标题
2. 核心角色介绍
3. 故事梗概
4. 教育意义
5. 情节转折点列表

输出为JSON格式。"""

        user_prompt = f"""请创作一个适合 {target_age} 岁儿童的有声绘本故事，主题是：{theme}。
故事需要分成 {page_count} 页，每页有独立的情节但整体连贯。
请以JSON格式输出，包含以下字段：title, characters(数组), synopsis, moral, plot_points(数组)。"""

        response = await self.ai_provider.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.8
        )

        if not response.success:
            raise RuntimeError(f"故事大纲生成失败: {response.error}")

        try:
            return json.loads(response.content)
        except json.JSONDecodeError:
            # 如果不是纯JSON，尝试提取
            import re
            json_match = re.search(r'\{[\s\S]*\}', response.content)
            if json_match:
                return json.loads(json_match.group())
            else:
                # 返回默认结构
                return {
                    'title': theme,
                    'characters': ['主角'],
                    'synopsis': response.content,
                    'moral': '勇敢、善良',
                    'plot_points': ['开始', '发展', '高潮', '结局']
                }

    async def _generate_story_pages(self, outline: Dict[str, Any], page_count: int) -> List[Dict[str, Any]]:
        """生成分页故事文本"""
        title = outline.get('title', '')
        characters = outline.get('characters', [])
        synopsis = outline.get('synopsis', '')

        system_prompt = """你是一位专业的儿童绘本作家，擅长创作富有想象力和教育意义的儿童故事。
请根据故事大纲创作每一页的故事文本，要求：
1. 语言简单易懂，适合儿童阅读
2. 每页内容相对独立但整体连贯
3. 包含对话和场景描写
4. 每页约100-200字

输出为JSON格式的数组。"""

        user_prompt = f"""请为以下故事创作 {page_count} 页的分页文本：

标题：{title}
角色：{', '.join(characters) if isinstance(characters, list) else characters}
梗概：{synopsis}

请输出JSON数组，每一项包含：page_number, title, text。"""

        response = await self.ai_provider.generate_text(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.7
        )

        if not response.success:
            raise RuntimeError(f"故事文本生成失败: {response.error}")

        try:
            pages = json.loads(response.content)
            # 确保是列表
            if not isinstance(pages, list):
                pages = list(pages.values()) if isinstance(pages, dict) else [pages]
            return pages
        except json.JSONDecodeError:
            # 如果解析失败，生成简单的分页内容
            import re
            pages = []
            for i in range(page_count):
                pages.append({
                    'page_number': i + 1,
                    'title': f'第 {i + 1} 页',
                    'text': f'这是故事的第 {i + 1} 页内容...'
                })
            return pages

    async def _generate_illustration_prompts(
        self,
        pages: List[Dict[str, Any]],
        art_style: str
    ) -> List[Dict[str, Any]]:
        """为每一页生成插画提示词"""
        style_descriptions = {
            'watercolor': '水彩画风格，柔和的色彩，梦幻的氛围',
            'cartoon': '卡通风格，明亮的色彩，可爱的角色',
            'oil': '油画风格，丰富的质感，古典的氛围',
            'sketch': '素描风格，简洁的线条，艺术感',
            '3d': '3D卡通风格，立体效果，现代感'
        }
        style_desc = style_descriptions.get(art_style, style_descriptions['watercolor'])

        system_prompt = """你是一位专业的插画师和AI绘画提示词专家。
请为每一页故事创作详细的绘画提示词，要求：
1. 描述场景、角色、动作、表情
2. 包含色彩和光线要求
3. 适合儿童绘本风格
4. 提示词用英文输出（适合Midjourney/DALL-E等工具）

输出为JSON格式。"""

        results = []
        for page in pages:
            page_text = page.get('text', '')
            page_title = page.get('title', '')

            user_prompt = f"""请为以下故事页面创作插画提示词：

页面标题：{page_title}
页面内容：{page_text}
风格要求：{style_desc}

请输出JSON格式，包含字段：image_prompt_en, image_prompt_zh, style_keywords。"""

            response = await self.ai_provider.generate_text(
                prompt=user_prompt,
                system_prompt=system_prompt,
                temperature=0.6
            )

            if response.success:
                try:
                    prompt_data = json.loads(response.content)
                    page.update(prompt_data)
                except json.JSONDecodeError:
                    page['image_prompt_en'] = f"children's book illustration, {style_desc}, {page_title}"
                    page['image_prompt_zh'] = f"儿童绘本插画，{page_title}"
            else:
                page['image_prompt_en'] = f"children's book illustration, {style_desc}, {page_title}"
                page['image_prompt_zh'] = f"儿童绘本插画，{page_title}"

            results.append(page)

        return results

    async def _generate_images_parallel(
        self,
        pages: List[Dict[str, Any]],
        art_style: str,
        works_dir: str
    ) -> List[Dict[str, Any]]:
        """并行生成图片（带限流）"""
        semaphore = asyncio.Semaphore(self.MAX_PARALLEL_IMAGES)
        total_pages = len(pages)

        async def generate_single_image(page: Dict[str, Any], index: int) -> Dict[str, Any]:
            async with semaphore:
                try:
                    prompt = page.get('image_prompt_en', '') or f"children's book illustration, {page.get('title', '')}"
                    response = await self.ai_provider.generate_image(
                        prompt=prompt,
                        size="1024x1024"
                    )

                    if response.success:
                        # 如果AI返回了实际内容，保存为文件；否则创建占位图片
                        if response.content and not response.content.startswith("mock_"):
                            image_url = response.content
                        else:
                            image_url = self._create_dummy_image(index + 1, works_dir)
                        page['image_url'] = image_url
                        page['image_generated'] = True
                    else:
                        page['image_url'] = self._create_dummy_image(index + 1, works_dir)
                        page['image_generated'] = False

                    # 更新进度
                    progress = 35 + int((index + 1) / total_pages * 25)
                    await self.update_progress(progress, f"正在生成插画... ({index + 1}/{total_pages})")

                except Exception as e:
                    page['image_url'] = self._create_dummy_image(index + 1, works_dir)
                    page['image_generated'] = False
                    page['image_error'] = str(e)

                return page

        tasks = [generate_single_image(page, i) for i, page in enumerate(pages)]
        results = await asyncio.gather(*tasks)

        return list(results)

    async def _generate_audio_parallel(self, pages: List[Dict[str, Any]], works_dir: str) -> List[Dict[str, Any]]:
        """并行生成语音 narration"""
        semaphore = asyncio.Semaphore(self.MAX_PARALLEL_AUDIOS)
        total_pages = len(pages)

        async def generate_single_audio(page: Dict[str, Any], index: int) -> Dict[str, Any]:
            async with semaphore:
                try:
                    text = page.get('text', '')
                    if not text:
                        page['audio_url'] = None
                        page['audio_generated'] = False
                        return page

                    response = await self.ai_provider.generate_audio(
                        text=text,
                        voice="friendly"
                    )

                    if response.success:
                        # 如果AI返回了实际内容，保存为文件；否则创建占位音频
                        if response.content and not response.content.startswith("mock_"):
                            audio_url = response.content
                        else:
                            audio_url = self._create_dummy_audio(index + 1, works_dir)
                        page['audio_url'] = audio_url
                        page['audio_generated'] = True
                    else:
                        page['audio_url'] = None
                        page['audio_generated'] = False

                    # 更新进度
                    progress = 60 + int((index + 1) / total_pages * 20)
                    await self.update_progress(progress, f"正在生成语音... ({index + 1}/{total_pages})")

                except Exception as e:
                    page['audio_url'] = None
                    page['audio_generated'] = False
                    page['audio_error'] = str(e)

                return page

        tasks = [generate_single_audio(page, i) for i, page in enumerate(pages)]
        results = await asyncio.gather(*tasks)

        return list(results)

    @staticmethod
    def _create_dummy_image(page_num: int, works_dir: str) -> str:
        """创建占位图片文件到持久化目录"""
        path = os.path.join(works_dir, 'images', f'page_{page_num}.png')
        os.makedirs(os.path.dirname(path), exist_ok=True)

        try:
            # 尝试用 Pillow 创建彩色占位图
            from PIL import Image, ImageDraw
            img = Image.new('RGB', (1024, 1024), color=(240, 248, 255))
            draw = ImageDraw.Draw(img)
            draw.text((400, 500), f'Page {page_num}', fill=(30, 58, 95))
            img.save(path, 'PNG')
        except ImportError:
            # 回退：创建最小有效PNG（1x1像素）
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
        duration = 1  # 1 second placeholder
        frequency = 440  # A4 note

        with wave.open(path, 'w') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            for i in range(sample_rate * duration):
                value = int(32767 * 0.3 * math.sin(2 * math.pi * frequency * i / sample_rate))
                wf.writeframes(struct.pack('<h', value))

        return path

    async def _generate_pdf_and_zip(self, result_data: Dict[str, Any], works_dir: str) -> Dict[str, str]:
        """生成PDF并打包所有文件"""
        outline = result_data.get('outline', {})
        pages = result_data.get('pages', [])

        # 生成PDF
        title = outline.get('title', '有声绘本')
        pdf_path = os.path.join(works_dir, 'storybook.pdf')
        self.pdf_generator.generate_storybook_pdf(
            title=title,
            pages=pages,
            output_path=pdf_path
        )

        # 创建ZIP包
        zip_path = os.path.join(works_dir, 'package.zip')

        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            # 添加PDF
            zf.write(pdf_path, 'storybook.pdf')

            # 添加图片和音频
            for page in pages:
                page_num = page.get('page_number', 0)

                # 添加图片
                image_url = page.get('image_url')
                if image_url and os.path.exists(image_url):
                    zf.write(image_url, f'images/page_{page_num}.png')

                # 添加音频
                audio_url = page.get('audio_url')
                if audio_url and os.path.exists(audio_url):
                    zf.write(audio_url, f'audio/page_{page_num}.wav')

            # 添加元数据
            metadata = {
                'title': title,
                'page_count': len(pages),
                'created_at': uuid.uuid1().time  # 模拟时间戳
            }
            zf.writestr('metadata.json', json.dumps(metadata, ensure_ascii=False, indent=2))

        return {
            'pdf_path': pdf_path,
            'zip_path': zip_path,
            'pdf_size': os.path.getsize(pdf_path),
            'zip_size': os.path.getsize(zip_path)
        }

    async def _create_work_record(self, params: Dict[str, Any], result_data: Dict[str, Any]) -> Any:
        """创建成果记录"""
        task = await TaskService.get_by_id(self.db, self.task_id)
        outline = result_data.get('outline', {})
        pages = result_data.get('pages', [])
        files = result_data.get('files', {})

        # 创建Work
        work_in = WorkCreate(
            user_id=task.user_id,
            task_id=self.task_id,
            tool_id=task.tool_id,
            title=outline.get('title', '有声绘本'),
            description=outline.get('synopsis', ''),
            cover_image=f"images/page_1.png" if pages else None,
            status="published",
            is_public=False,
            version=1
        )
        work = await TaskService.create_work(self.db, work_in)

        # 创建WorkFile记录（使用相对路径）
        # PDF文件
        pdf_path = files.get('pdf_path')
        if pdf_path:
            pdf_file_in = WorkFileCreate(
                work_id=work.id,
                file_type="pdf",
                file_name=f"{work.title}.pdf",
                file_url="storybook.pdf",
                file_size=files.get('pdf_size', 0),
                mime_type="application/pdf"
            )
            self.db.add(WorkFile(**pdf_file_in.model_dump()))

        # ZIP包
        zip_path = files.get('zip_path')
        if zip_path:
            zip_file_in = WorkFileCreate(
                work_id=work.id,
                file_type="other",
                file_name=f"{work.title}_package.zip",
                file_url="package.zip",
                file_size=files.get('zip_size', 0),
                mime_type="application/zip"
            )
            self.db.add(WorkFile(**zip_file_in.model_dump()))

        # 每页的图片和音频
        for page in pages:
            page_num = page.get('page_number', 0)

            # 图片
            image_url = page.get('image_url')
            if image_url:
                img_file_in = WorkFileCreate(
                    work_id=work.id,
                    file_type="image",
                    file_name=f"page_{page_num}.png",
                    file_url=f"images/page_{page_num}.png",
                    page_number=page_num,
                    mime_type="image/png"
                )
                self.db.add(WorkFile(**img_file_in.model_dump()))

            # 音频
            audio_url = page.get('audio_url')
            if audio_url:
                audio_file_in = WorkFileCreate(
                    work_id=work.id,
                    file_type="audio",
                    file_name=f"page_{page_num}.wav",
                    file_url=f"audio/page_{page_num}.wav",
                    page_number=page_num,
                    mime_type="audio/wav"
                )
                self.db.add(WorkFile(**audio_file_in.model_dump()))

        await self.db.commit()

        return work
