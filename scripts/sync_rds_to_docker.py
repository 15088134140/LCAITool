#!/usr/bin/env python3
"""
从阿里云 RDS 同步数据到本地 Docker PostgreSQL

使用方式:
    source apps/backend/.venv/bin/activate
    python scripts/sync_rds_to_docker.py
"""

import asyncio
import sys
from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.pool import NullPool

# 源数据库（阿里云 RDS）
SOURCE_DATABASE_URL = "postgresql://shuqitec:Shuqi$2026@pgm-7xv29038ivah5apreo.pg.cn-guangzhou.rds.aliyuncs.com:5432/lcaitool"
# 目标数据库（本地 Docker）
TARGET_DATABASE_URL = "postgresql://lcaitool:password@localhost:5432/lcaitool"


def sync_table(source_conn, target_conn, table_name, metadata):
    """同步单张表的数据"""
    try:
        # 读取源表数据
        source_table = Table(table_name, metadata, autoload_with=source_conn)
        result = source_conn.execute(source_table.select())
        rows = result.fetchall()

        if not rows:
            print(f"  {table_name}: 无数据")
            return

        # 清空目标表
        target_table = Table(table_name, MetaData(), autoload_with=target_conn)
        target_conn.execute(target_table.delete())

        # 插入数据
        if rows:
            # 转换为字典列表
            dict_rows = [dict(row._mapping) for row in rows]
            target_conn.execute(target_table.insert(), dict_rows)

        # 重置序列
        pk_columns = [c.name for c in target_table.primary_key.columns]
        for pk in pk_columns:
            seq_name = f"{table_name}_{pk}_seq"
            try:
                target_conn.execute(text(f"SELECT setval('{seq_name}', (SELECT MAX({pk}) FROM {table_name}))"))
            except Exception:
                pass  # 序列可能不存在

        print(f"  {table_name}: {len(rows)} 条记录 ✓")
        return len(rows)
    except Exception as e:
        print(f"  {table_name}: ✗ 错误 - {e}")
        return 0


def main():
    print("=" * 60)
    print("数据同步：阿里云 RDS -> 本地 Docker PostgreSQL")
    print("=" * 60)

    # 创建引擎
    source_engine = create_engine(SOURCE_DATABASE_URL, poolclass=NullPool)
    target_engine = create_engine(TARGET_DATABASE_URL, poolclass=NullPool)

    metadata = MetaData()

    total_rows = 0
    with source_engine.connect() as source_conn, target_engine.connect() as target_conn:
        # 获取所有表名
        result = source_conn.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' ORDER BY table_name
        """))
        tables = [row[0] for row in result]

        print(f"\n找到 {len(tables)} 张表，开始同步...\n")

        # 同步顺序：先基础表，后关联表
        # 1. 字典表/配置表
        # 2. 用户表
        # 3. 业务表
        # 4. 关联表

        sync_order = [
            # 配置和字典表
            'alembic_version', 'system_configs', 'roles',
            # 基础数据
            'users', 'recharge_packages', 'tool_categories',
            # 工具相关
            'tools', 'tool_demos',
            # 用户相关
            'user_roles', 'admin_audit_logs', 'api_keys',
            'real_name_verifications', 'point_transactions',
            # 文件相关
            'external_files', 'user_uploads',
            # 作品相关
            'works', 'work_files', 'work_shares',
            # 订单相关
            'orders',
            # 交互相关
            'feedbacks', 'idea_submissions', 'idea_votes',
            'task_logs', 'tasks',
            # 工具评价相关
            'tool_favorites', 'tool_ratings',
            # AI 提供商
            'ai_providers',
        ]

        # 确保所有表都被处理
        remaining = set(tables) - set(sync_order)
        if remaining:
            print(f"警告：以下表未在同步顺序中定义：{remaining}")
            sync_order.extend(remaining)

        # 执行同步
        for table_name in sync_order:
            if table_name in tables:
                count = sync_table(source_conn, target_conn, table_name, metadata)
                total_rows += count

        # 提交事务
        target_conn.commit()

    print("\n" + "=" * 60)
    print(f"同步完成！共同步 {total_rows} 条记录")
    print("=" * 60)


if __name__ == "__main__":
    main()
