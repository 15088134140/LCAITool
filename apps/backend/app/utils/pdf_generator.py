"""
PDF 生成工具
用于生成有声绘本的PDF文件
"""
import os
import tempfile
from typing import List, Dict, Any, Optional
from io import BytesIO

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Image,
        PageBreak, Table, TableStyle
    )
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False


class PDFGenerator:
    """PDF 生成器"""

    def __init__(self):
        self.styles = getSampleStyleSheet() if REPORTLAB_AVAILABLE else None
        self._register_fonts()

    def _register_fonts(self) -> None:
        """注册中文字体"""
        if not REPORTLAB_AVAILABLE:
            return

        # 尝试注册常见的中文字体
        font_paths = [
            "/System/Library/Fonts/PingFang.ttc",  # macOS
            "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc",  # Linux
            "C:/Windows/Fonts/msyh.ttc",  # Windows
        ]

        for font_path in font_paths:
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont('ChineseFont', font_path))
                    break
                except Exception:
                    continue

    def generate_storybook_pdf(
        self,
        title: str,
        pages: List[Dict[str, Any]],
        author: Optional[str] = None,
        output_path: Optional[str] = None
    ) -> str:
        """
        生成有声绘本PDF

        :param title: 绘本标题
        :param pages: 页面列表，每页包含 text 和 image_url
        :param author: 作者
        :param output_path: 输出路径，如果为None则生成临时文件
        :return: PDF文件路径
        """
        if not REPORTLAB_AVAILABLE:
            raise RuntimeError("reportlab is not installed. Please install it with: pip install reportlab")

        # 创建输出文件
        if output_path is None:
            fd, output_path = tempfile.mkstemp(suffix='.pdf', prefix='storybook_')
            os.close(fd)

        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )

        story = []

        # 添加封面
        self._add_cover(story, title, author)
        story.append(PageBreak())

        # 添加目录
        self._add_toc(story, pages)
        story.append(PageBreak())

        # 添加内容页
        for idx, page in enumerate(pages, 1):
            self._add_content_page(story, idx, page)
            if idx < len(pages):
                story.append(PageBreak())

        # 生成PDF
        doc.build(story)

        return output_path

    def _add_cover(self, story: List, title: str, author: Optional[str] = None) -> None:
        """添加封面"""
        # 标题样式
        title_style = ParagraphStyle(
            'CoverTitle',
            parent=self.styles['Title'],
            fontSize=28,
            textColor=colors.darkblue,
            spaceAfter=30,
            alignment=1,  # 居中
        )

        # 作者样式
        author_style = ParagraphStyle(
            'CoverAuthor',
            parent=self.styles['Normal'],
            fontSize=14,
            textColor=colors.grey,
            spaceAfter=20,
            alignment=1,
        )

        story.append(Spacer(1, 2 * inch))
        story.append(Paragraph(title, title_style))
        story.append(Spacer(1, 0.5 * inch))

        if author:
            story.append(Paragraph(f"作者：{author}", author_style))

        story.append(Spacer(1, 2 * inch))

        # 封面装饰
        decoration_style = ParagraphStyle(
            'Decoration',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=colors.lightgrey,
            alignment=1,
        )
        story.append(Paragraph("✨ 有声绘本 ✨", decoration_style))

    def _add_toc(self, story: List, pages: List[Dict[str, Any]]) -> None:
        """添加目录"""
        toc_title_style = ParagraphStyle(
            'TOCTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            spaceAfter=20,
            alignment=1,
        )

        story.append(Paragraph("目录", toc_title_style))
        story.append(Spacer(1, 0.3 * inch))

        toc_style = ParagraphStyle(
            'TOCItem',
            parent=self.styles['Normal'],
            fontSize=12,
            spaceAfter=8,
            leftIndent=20,
        )

        for idx, page in enumerate(pages, 1):
            page_title = page.get('title', f'第 {idx} 页')
            story.append(Paragraph(f"{idx}. {page_title}", toc_style))

    def _add_content_page(self, story: List, page_num: int, page: Dict[str, Any]) -> None:
        """添加内容页"""
        # 页码标题
        page_title_style = ParagraphStyle(
            'PageTitle',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=15,
            textColor=colors.darkblue,
        )

        page_title = page.get('title', f'第 {page_num} 页')
        story.append(Paragraph(page_title, page_title_style))

        # 图片
        image_url = page.get('image_url')
        if image_url and os.path.exists(image_url):
            try:
                img = Image(image_url, width=5 * inch, height=3.5 * inch)
                story.append(img)
                story.append(Spacer(1, 0.3 * inch))
            except Exception:
                # 如果图片加载失败，跳过
                pass

        # 故事文本
        text_style = ParagraphStyle(
            'StoryText',
            parent=self.styles['Normal'],
            fontSize=14,
            leading=20,
            spaceAfter=10,
            firstLineIndent=28,  # 首行缩进
        )

        text = page.get('text', '')
        if text:
            story.append(Paragraph(text, text_style))

    @staticmethod
    def get_pdf_size(pdf_path: str) -> int:
        """获取PDF文件大小"""
        if os.path.exists(pdf_path):
            return os.path.getsize(pdf_path)
        return 0
