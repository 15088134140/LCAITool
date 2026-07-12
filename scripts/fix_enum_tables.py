#!/usr/bin/env python3
"""
修复 ENUM 类型相关表的数据
"""

import asyncio
import asyncpg

async def main():
    source = await asyncpg.connect(
        host='pgm-7xv29038ivah5apreo.pg.cn-guangzhou.rds.aliyuncs.com',
        user='shuqitec',
        password='Shuqi$2026',
        database='lcaitool'
    )

    target = await asyncpg.connect(
        host='localhost',
        user='lcaitool',
        password='password',
        database='lcaitool'
    )

    # 重新同步使用 ENUM 的表
    tables_to_resync = ['point_transactions', 'orders']

    for table in tables_to_resync:
        await target.execute(f'TRUNCATE TABLE {table} CASCADE')
        rows = await source.fetch(f'SELECT * FROM {table}')

        if rows:
            cols = list(dict(rows[0]).keys())
            placeholders = ', '.join(f'${i+1}' for i in range(len(cols)))
            for row in rows:
                vals = [dict(row)[c] for c in cols]
                await target.execute(
                    f'INSERT INTO {table} ({", ".join(cols)}) VALUES ({placeholders})',
                    *vals
                )

        print(f'  {table}: {len(rows)} 条记录 ✓')

    # 重置序列
    for table in tables_to_resync:
        await target.execute(f"SELECT setval('{table}_id_seq', (SELECT MAX(id) FROM {table}))")

    await source.close()
    await target.close()
    print('\nENUM 相关表重新同步完成！')

asyncio.run(main())
