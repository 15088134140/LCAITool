#!/usr/bin/env python3
"""
只同步数据：从阿里云 RDS 到本地 Docker PostgreSQL
Schema 已通过 Alembic 创建
"""

import psycopg2

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

# 保留字需要加引号
RESERVED_WORDS = {'user', 'group', 'order', 'default', 'values', 'type'}


def sync_table_data(source_conn, target_conn, table_name):
    """同步单张表的数据"""
    # 先清空目标表
    with target_conn.cursor() as target_cur:
        target_cur.execute(f'TRUNCATE TABLE "{table_name}" CASCADE')

    # 读取源数据
    with source_conn.cursor(name=f'cur_{table_name}') as source_cur:
        source_cur.itersize = 1000
        source_cur.execute(f'SELECT * FROM "{table_name}"')
        rows = source_cur.fetchall()

        if not rows:
            print(f"  {table_name}: 无数据")
            return 0

        # 获取列名
        col_names = [desc[0] for desc in source_cur.description]

    # 插入数据
    quoted_cols = [
        f'"{col}"' if col.lower() in RESERVED_WORDS else col
        for col in col_names
    ]

    with target_conn.cursor() as target_cur:
        placeholders = ', '.join(['%s'] * len(col_names))
        args = [tuple(row) for row in rows]

        target_cur.executemany(
            f'INSERT INTO "{table_name}" ({", ".join(quoted_cols)}) VALUES ({placeholders})',
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

        print(f"\n找到 {len(tables)} 张表，开始同步数据...\n")

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
                                COALESCE((SELECT MAX(id) FROM "{table_name}"), 1),
                                (SELECT MAX(id) FROM "{table_name}") IS NOT NULL)
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
