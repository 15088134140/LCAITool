"""
初始化E2E测试用户
确保前端E2E测试所需的测试用户存在于阿里云PostgreSQL数据库中

使用方式:
    cd apps/backend
    python scripts/init_e2e_users.py

注意: 本脚本直接连接阿里云PostgreSQL数据库，请确保网络可访问
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select, text
from app.core.security import get_password_hash
from app.models.user import User, Role
from app.core.config import settings
from app.core.database import AsyncSessionLocal as async_session


E2E_TEST_USERS = [
    {
        "nickname": "e2e_test_user",
        "email": "e2e_test@example.com",
        "phone": "13800138000",
        "password": "Test123456!",
        "balance": 10000
    },
    {
        "nickname": "e2e_no_points",
        "email": "e2e_no_points@example.com",
        "phone": "13800138001",
        "password": "Test123456!",
        "balance": 0
    },
    {
        "nickname": "testuser",
        "email": "test@lcaitool.com",
        "phone": "13800138002",
        "password": "test123",
        "balance": 100
    },
    {
        "nickname": "admin",
        "email": "admin@lcaitool.com",
        "phone": "13800138999",
        "password": "admin123",
        "balance": 1000,
        "is_admin": True
    }
]


async def init_e2e_users():
    """初始化E2E测试用户"""
    print("=" * 70)
    print("E2E测试用户初始化脚本 - 阿里云PostgreSQL")
    print("=" * 70)
    print(f"\n数据库地址: {settings.DATABASE_URL.replace(':%', ':***%').split('@')[0].split('//')[1]}@****")
    print()

    try:
        async with async_session() as db:
            # 测试数据库连接
            result = await db.execute(text("SELECT 1"))
            print("[OK]  数据库连接成功")

            # 获取admin角色
            result = await db.execute(select(Role).where(Role.name == "admin"))
            admin_role = result.scalar_one_or_none()

            if not admin_role:
                print("\n[Warn]  admin角色不存在，正在创建...")
                admin_role = Role(
                    name="admin",
                    description="系统管理员",
                    permissions="all"
                )
                db.add(admin_role)
                await db.flush()
                await db.refresh(admin_role)
                print(f"[OK]  admin角色已创建 (ID: {admin_role.id})")
            else:
                print(f"[OK]  admin角色已存在 (ID: {admin_role.id})")

            created_count = 0
            updated_count = 0
            for user_data in E2E_TEST_USERS:
                nickname = user_data["nickname"]
                email = user_data["email"]
                phone = user_data["phone"]
                password = user_data["password"]
                balance = user_data["balance"]
                is_admin = user_data.get("is_admin", False)

                # 检查用户是否已存在（通过nickname, email, phone）
                result = await db.execute(
                    select(User).where(
                        (User.nickname == nickname) |
                        (User.email == email) |
                        (User.phone == phone)
                    )
                )
                existing_user = result.scalar_one_or_none()

                if existing_user:
                    # 更新密码和余额，确保测试可用
                    existing_user.password_hash = get_password_hash(password)
                    existing_user.balance = balance
                    existing_user.status = 1

                    # 确保管理员有角色
                    if is_admin and admin_role and admin_role not in existing_user.roles:
                        existing_user.roles.append(admin_role)
                        print(f"[Info]  授予管理员权限: {nickname}")

                    await db.flush()
                    updated_count += 1
                    print(f"[OK]  用户已更新: {nickname} / 密码: {password} (余额: {balance}积分)")
                    continue

                # 创建新用户
                new_user = User(
                    nickname=nickname,
                    email=email,
                    phone=phone,
                    password_hash=get_password_hash(password),
                    balance=balance,
                    status=1
                )

                if is_admin and admin_role:
                    new_user.roles.append(admin_role)
                    print(f"[Info]  授予管理员权限: {nickname}")

                db.add(new_user)
                await db.flush()
                await db.refresh(new_user)
                created_count += 1
                print(f"[OK]  用户已创建: {nickname} / 密码: {password} (余额: {balance}积分, ID: {new_user.id})")

            await db.commit()

            print("\n" + "=" * 70)
            print(f"初始化完成: 创建 {created_count} 个新用户, 更新 {updated_count} 个已有用户")
            print("=" * 70)
            print("\n可用测试用户:")
            for user_data in E2E_TEST_USERS:
                role = " (管理员)" if user_data.get("is_admin") else ""
                print(f"  - {user_data['nickname']} / {user_data['password']}{role}")
            print("\n✅ 现在可以使用上述账号登录系统进行E2E测试了！")

    except Exception as e:
        print(f"\n[Error] 初始化失败: {str(e)}")
        print("\n请检查:")
        print("  1. 网络是否可以连接到阿里云PostgreSQL")
        print("  2. 数据库用户名密码是否正确")
        print("  3. 数据库是否已创建并执行了Alembic迁移")
        print(f"\n数据库地址: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else settings.DATABASE_URL}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(init_e2e_users())
