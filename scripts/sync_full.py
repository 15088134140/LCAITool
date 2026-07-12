#!/usr/bin/env python3
"""
完整同步：Schema + 数据
从阿里云 RDS 直接读取表结构信息创建表，然后同步数据
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

# PostgreSQL 数据类型映射
TYPE_MAP = {
    'USER-DEFINED': 'VARCHAR',
    'character varying': 'VARCHAR',
    'timestamp without time zone': 'TIMESTAMP',
    'timestamp with time zone': 'TIMESTAMPTZ',
}

# 保留字
RESERVED_WORDS = {'user', 'group', 'order', 'default', 'values', 'type'}


def create_table_from_schema(source_conn, target_conn, table_name):
    """从 information_schema 读取表结构并创建表"""
    with source_conn.cursor() as cur:
        # 获取列信息
        cur.execute("""
            SELECT column_name, data_type, is_nullable, column_default,
                   character_maximum_length, udt_name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        columns = cur.fetchall()

        # 获取主键
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

    # 构建列定义
    col_defs = []
    for col_name, data_type, is_nullable, default, max_len, udt_name in columns:
        # 处理特殊类型
        if data_type == 'USER-DEFINED':
            if udt_name.endswith('_enum'):
                data_type = 'VARCHAR(50)'
            else:
                data_type = 'TEXT'
        elif data_type == 'character varying' and max_len:
            data_type = f'VARCHAR({max_len})'
        elif 'timestamp' in data_type:
            data_type = 'TIMESTAMP'
        elif data_type == 'integer':
            data_type = 'INTEGER'
        elif data_type == 'boolean':
            data_type = 'BOOLEAN'
        elif 'double precision' in data_type:
            data_type = 'DOUBLE PRECISION'
        elif 'uuid' in data_type:
            data_type = 'UUID'

        # 处理保留字列名
        quoted_name = f'"{col_name}"' if col_name.lower() in RESERVED_WORDS else col_name

        col_def = f"    {quoted_name} {data_type}"
        if is_nullable == 'NO':
            col_def += " NOT NULL"
        if default and 'nextval' not in default:
            col_def += f" DEFAULT {default}"
        col_defs.append(col_def)

    if pk_columns:
        quoted_pk = [f'"{col}"' if col.lower() in RESERVED_WORDS else col for col in pk_columns]
        col_defs.append(f"    PRIMARY KEY ({', '.join(quoted_pk)})")

    create_sql = f'CREATE TABLE "{table_name}" (\n' + ',\n'.join(col_defs) + '\n)'

    with target_conn.cursor() as target_cur:
        target_cur.execute(create_sql)


def sync_table_data(source_conn, target_conn, table_name):
    """同步单张表的数据"""
    with source_conn.cursor(name=f'cur_{table_name}') as source_cur:
        source_cur.itersize = 1000
        source_cur.execute(f'SELECT * FROM "{table_name}"')
        rows = source_cur.fetchall()

        if not rows:
            print(f"  {table_name}: 无数据")
            return 0

        col_names = [desc[0] for desc in source_cur.description]

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
    print("完整同步：阿里云 RDS -> 本地 Docker PostgreSQL")
    print("=" * 60)

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

        # 创建表
        for table_name in tables:
            try:
                create_table_from_schema(source_conn, target_conn, table_name)
                print(f"  创建表: {table_name} ✓")
            except Exception as e:
                print(f"  创建表: {table_name} ✗ - {str(e)[:80]}")
                target_conn.rollback()
                continue
            target_conn.commit()

        print(f"\n开始同步数据...\n")

        # 同步顺序
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

        remaining = set(tables) - set(sync_order)
        if remaining:
            sync_order.extend(remaining)

        # 同步数据
        total_rows = 0
        for table_name in sync_order:
            if table_name in tables:
                try:
                    count = sync_table_data(source_conn, target_conn, table_name)
                    total_rows += count
                    target_conn.commit()
                except Exception as e:
                    print(f"  {table_name}: ✗ - {str(e)[:80]}")
                    target_conn.rollback()

        print("\n" + "=" * 60)
        print(f"同步完成！共同步 {total_rows} 条记录")
        print("=" * 60)

    finally:
        source_conn.close()
        target_conn.close()


if __name__ == "__main__":
    main()
