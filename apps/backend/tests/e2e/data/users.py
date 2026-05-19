# apps/backend/tests/e2e/data/users.py
"""
测试用户数据
"""

# 默认测试用户
DEFAULT_TEST_USER = {
    "username": "e2e_test_user",
    "email": "e2e_test@example.com",
    "password": "Test123456!",
    "phone": "13800138000",
    "points": 10000
}

# 无积分测试用户
NO_POINTS_USER = {
    "username": "e2e_no_points",
    "email": "e2e_no_points@example.com",
    "password": "Test123456!",
    "phone": "13800138001",
    "points": 0
}
