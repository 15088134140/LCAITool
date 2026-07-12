#!/usr/bin/env python3
"""
完全从阿里云 RDS 同步数据到本地 PostgreSQL
"""

import asyncio
import asyncpg

async def sync_table(source_conn, target_conn, table_name):
    """同步单张表"""
    try:
        # 获取源数据
        rows = await source_conn.fetch(f'SELECT * FROM {table_name}')
        if not rows:
            print(f'  {table_name}: 无数据')
            return 0

        # 获取列名
        cols = list(dict(rows[0]).keys())

        # 清空目标表
        await target_conn.execute(f'TRUNCATE TABLE {table_name} CASCADE')

        # 批量插入
        placeholders = ', '.join(f'${i+1}' for i in range(len(cols)))
        for row in rows:
            vals = [dict(row)[c] for c in cols]
            await target_conn.execute(
                f'INSERT INTO {table_name} ({", ".join(cols)}) VALUES ({placeholders})',
                *vals
            )

        print(f'  {table_name}: {len(rows)} 条记录 ✓')
        return len(rows)
    except Exception as e:
        print(f'  {table_name}: ✗ 失败 - {e}')
        return 0

async def main():
    print('=' * 60)
    print('完全同步：阿里云 RDS -> 本地 Docker PostgreSQL')
    print('=' * 60)

    # 连接阿里云
    source_conn = await asyncpg.connect(
        host='pgm-7xv29038ivah5apreo.pg.cn-guangzhou.rds.aliyuncs.com',
        user='shuqitec',
        password='Shuqi$2026',
        database='lcaitool'
    )

    # 连接本地
    target_conn = await asyncpg.connect(
        host='localhost',
        user='lcaitool',
        password='password',
        database='lcaitool'
    )

    # 获取所有表
    tables = await source_conn.fetch('''
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name
    ''')

    table_names = [t['table_name'] for t in tables]
    print(f'\n找到 {len(table_names)} 张表，开始同步...\n')

    # 同步顺序：先基础表，后关联表
    sync_order = [
        'alembic_version',
        'system_configs',
        'roles',
        'users',
        'recharge_packages',
        'tool_categories',
        'tools',
        'tool_demos',
        'user_roles',
        'admin_audit_logs',
        'api_keys',
        'real_name_verifications',
        'point_transactions',
        'external_files',
        'user_uploads',
        'works',
        'work_files',
        'work_shares',
        'orders',
        'feedbacks',
        'idea_submissions',
        'idea_votes',
        'task_logs',
        'tasks',
        'tool_favorites',
        'tool_ratings',
        'ai_providers',
    ]

    # 补充不在列表中的表
    for t in table_names:
        if t not in sync_order:
            sync_order.append(t)

    total_records = 0
    for table in sync_order:
        if table in table_names:
            cnt = await sync_table(source_conn, target_conn, table)
            total_records += cnt

    print(f'\n同步完成！共同步 {total_records} 条记录')

    await source_conn.close()
    await target_conn.close()

if __name__ == '__main__':
    asyncio.run(main())
