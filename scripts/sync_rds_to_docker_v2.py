#!/usr/bin/env python3
"""
从阿里云 RDS 同步数据到本地 Docker PostgreSQL

先同步 Schema，再同步数据
"""

import psycopg2
from psycopg2 import sql
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# 源数据库（阿里云 RDS）
SOURCE_CONFIG = {
    'host': 'pgm-7xv29038ivah5apreo.pg.cn-guangzhou.rds.aliyuncs.com',
    'port': 5432,
    'user': 'shuqitec',
    'password': 'Shuqi$2026',
    'dbname': 'lcaitool'
}

# 目标数据库（本地 Docker）
TARGET_CONFIG = {
    'host': 'localhost',
    'port': 5432,
    'user': 'lcaitool',
    'password': 'password',
    'dbname': 'lcaitool'
}


def get_table_schema(conn, table_name):
    """获取表的 CREATE TABLE 语句"""
    with conn.cursor() as cur:
        # 获取列信息
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns = cur.fetchall()

        # 获取主键信息
        cur.execute("""
            SELECT kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                 ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_schema = 'public' AND tc.table_name = %s
                  AND tc.constraint_type = 'PRIMARY KEY'
            ORDER BY kcu.ordinal_position
        """, (table_name,))
        pk_columns = [row[0] for row in cur.fetchall()]

        # 构建 CREATE TABLE 语句
        col_defs = []
        for col_name, data_type, is_nullable, default, max_len in columns:
            col_def = f"    {col_name} {data_type}"
            if max_len:
                col_def += f"({max_len})"
            if is_nullable == 'NO':
                col_def += " NOT NULL"
            if default:
                col_def += f" DEFAULT {default}"
            col_defs.append(col_def)

        if pk_columns:
            col_defs.append(f"    PRIMARY KEY ({', '.join(pk_columns)})")

        return f"CREATE TABLE {table_name} (\n{', '.join(col_defs)})"


def sync_table_data(source_conn, target_conn, table_name):
    """同步单张表的数据"""
    with source_conn.cursor(name=f'cur_{table_name}') as source_cur:
        source_cur.itersize = 1000

        # 读取数据
        source_cur.execute(f"SELECT * FROM {table_name}")
        rows = source_cur.fetchall()

        if not rows:
            print(f"  {table_name}: 无数据")
            return 0

        # 获取列名
        col_names = [desc[0] for desc in source_cur.description]

    # 插入数据
    with target_conn.cursor() as target_cur:
        # 批量插入
        placeholders = ', '.join(['%s'] * len(col_names))
        args = []
        for row in rows:
            args.append(tuple(row))

        target_cur.executemany(
            f"INSERT INTO {table_name} ({', '.join(col_names)}) VALUES ({placeholders})",
            args
        )

    print(f"  {table_name}: {len(rows)} 条记录 ✓")
    return len(rows)


def main():
    print("=" * 60)
    print("数据同步：阿里云 RDS -> 本地 Docker PostgreSQL")
    print("=" * 60)

    # 连接源数据库
    source_conn = psycopg2.connect(**SOURCE_CONFIG)
    target_conn = psycopg2.connect(**TARGET_CONFIG)

    try:
        # 获取所有表名
        with source_conn.cursor() as cur:
            cur.execute("""
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public' ORDER BY table_name
            """)
            tables = [row[0] for row in cur.fetchall()]

        print(f"\n找到 {len(tables)} 张表，开始创建 Schema...\n")

        # 创建 Schema
        with target_conn.cursor() as target_cur:
            for table_name in tables:
                try:
                    create_sql = get_table_schema(source_conn, table_name)
                    target_cur.execute(create_sql)
                    print(f"  创建表: {table_name} ✓")
                except Exception as e:
                    print(f"  创建表: {table_name} ✗ - {e}")

        target_conn.commit()

        print(f"\n开始同步数据...\n")

        # 同步顺序：先基础表，后关联表
        sync_order = [
            'alembic_version', 'system_configs', 'roles',
            'users', 'recharge_packages', 'tool_categories',
            'tools', 'tool_demos',
            'user_roles', 'admin_audit_logs', 'api_keys',
            'real_name_verifications', 'point_transactions',
            'external_files', 'user_uploads',
            'works', 'work_files', 'work_shares',
            'orders',
            'feedbacks', 'idea_submissions', 'idea_votes',
            'task_logs', 'tasks',
            'tool_favorites', 'tool_ratings',
            'ai_providers',
        ]

        # 确保所有表都被处理
        remaining = set(tables) - set(sync_order)
        if remaining:
            print(f"  追加未定义顺序的表: {remaining}")
            sync_order.extend(remaining)

        # 执行数据同步
        total_rows = 0
        for table_name in sync_order:
            if table_name in tables:
                count = sync_table_data(source_conn, target_conn, table_name)
                total_rows += count

        target_conn.commit()

        # 重置序列
        print("\n重置序列...")
        with target_conn.cursor() as target_cur:
            for table_name in sync_order:
                if table_name in tables:
                    try:
                        target_cur.execute(f"""
                            SELECT setval('{table_name}_id_seq',
                                (SELECT MAX(id) FROM {table_name}))
                        """)
                    except Exception:
                        pass  # 序列可能不存在

        target_conn.commit()

        print("\n" + "=" * 60)
        print(f"同步完成！共同步 {total_rows} 条记录")
        print("=" * 60)

    finally:
        source_conn.close()
        target_conn.close()


if __name__ == "__main__":
    main()
