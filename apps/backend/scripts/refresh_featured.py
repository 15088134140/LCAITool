"""
将种子工具标记为推荐，用于刷新 is_featured 数据。

运行方式: cd apps/backend && python scripts/refresh_featured.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.tool import Tool


FEATURED_SLUGS = [
    'ai-storybook',
    'ecommerce-detail',
    'product-description',
]


async def main():
    async with AsyncSessionLocal() as db:
        for slug in FEATURED_SLUGS:
            r = await db.execute(select(Tool).where(Tool.slug == slug))
            tool = r.scalar_one_or_none()
            if tool:
                tool.is_featured = True
                print(f'  ✓ is_featured=True: {tool.name}')
            else:
                print(f'  ✗ 未找到工具: {slug}')

        # 取消其他工具的推荐标记
        rs = await db.execute(select(Tool).where(Tool.is_featured == True))
        for tool in rs.scalars().all():
            if tool.slug not in FEATURED_SLUGS:
                tool.is_featured = False
                print(f'  ○ is_featured=False（取消推荐）: {tool.name}')

        await db.commit()
        print(f'\n✅ 推荐工具更新完成。在管理后台可以勾选/取消"推荐展示"来调整。')


if __name__ == '__main__':
    asyncio.run(main())
