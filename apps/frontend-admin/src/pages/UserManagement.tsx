import { useEffect, useState } from 'react';
import { Search, Plus, Edit, Eye, Coins, UserX, UserCheck, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { userApi, User, UserListParams } from '@/api';
import { formatDate, formatPhone, getRandomColor } from '@/utils';
import { Button } from "@lcaitool/ui";

const UserManagement = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // 搜索和筛选 - status: undefined=全部, 'active'=正常, 'disabled'=禁用
  const [params, setParams] = useState<UserListParams>({
    page: 1,
    pageSize: 10,
    keyword: '',
    status: undefined,
    idCardVerified: undefined,
  });

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    password: '',
  });
  const [pointsData, setPointsData] = useState({
    points: 0,
    reason: '',
  });

  useEffect(() => {
    setCurrentPageTitle('用户管理');
    setBreadcrumbs([{ label: '首页' }, { label: '用户管理' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // 加载用户列表
  useEffect(() => {
    loadUsers();
  }, [params]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await userApi.getList(params);
      setUsers(result.list);
      setTotal(result.total);
    } catch (err) {
      console.error('加载用户列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 搜索
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      keyword: e.target.value,
    }));
  };

  // 筛选
  const handleFilterChange = (key: keyof UserListParams, value: any) => {
    setParams((prev) => ({
      ...prev,
      page: 1,
      [key]: value,
    }));
  };

  // 分页
  const totalPages = Math.ceil(total / params.pageSize);
  const handlePageChange = (page: number) => {
    setParams((prev) => ({ ...prev, page }));
  };

  // 创建用户
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await userApi.create(formData);
      setShowCreateModal(false);
      setFormData({ nickname: '', phone: '', password: '' });
      loadUsers();
    } catch (err) {
      console.error('创建用户失败:', err);
    }
  };

  // 编辑用户
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await userApi.update({
        id: selectedUser.id,
        nickname: formData.nickname,
        phone: formData.phone,
      });
      setShowEditModal(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error('更新用户失败:', err);
    }
  };

  // 调整积分
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await userApi.adjustPoints({
        userId: selectedUser.id,
        points: pointsData.points,
        reason: pointsData.reason,
      });
      setShowPointsModal(false);
      setPointsData({ points: 0, reason: '' });
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      console.error('调整积分失败:', err);
    }
  };

  // 切换用户状态
  const handleToggleStatus = async (user: User) => {
    try {
      // 前端: 1=正常, 0=禁用 -> 后端: active/disabled
      const newStatus = user.status === 1 ? 'disabled' : 'active';
      await userApi.toggleStatus(user.id, newStatus);
      loadUsers();
    } catch (err) {
      console.error('切换用户状态失败:', err);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({
      nickname: user.nickname,
      phone: user.phone,
      password: '',
    });
    setShowEditModal(true);
  };

  // 打开积分调整弹窗
  const openPointsModal = (user: User) => {
    setSelectedUser(user);
    setPointsData({ points: 0, reason: '' });
    setShowPointsModal(true);
  };

  // 打开详情抽屉
  const openDetailDrawer = async (user: User) => {
    try {
      const detail = await userApi.getDetail(user.id);
      setSelectedUser(detail);
      setShowDetailDrawer(true);
    } catch (err) {
      console.error('获取用户详情失败:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 搜索框 */}
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索昵称/手机号..."
                value={params.keyword}
                onChange={handleSearch}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none w-64"
              />
            </div>

            {/* 状态筛选 */}
            <select
              value={params.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部状态</option>
              <option value="active">正常</option>
              <option value="disabled">禁用</option>
            </select>

            {/* 实名认证筛选 */}
            <select
              value={params.idCardVerified === undefined ? '' : String(params.idCardVerified)}
              onChange={(e) =>
                handleFilterChange(
                  'idCardVerified',
                  e.target.value === '' ? undefined : e.target.value === 'true'
                )
              }
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
            >
              <option value="">全部认证状态</option>
              <option value="true">已认证</option>
              <option value="false">未认证</option>
            </select>
          </div>

          {/* 新增用户按钮 */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
          >
            <Plus size={18} />
            <span>新增用户</span>
          </Button>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">用户</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">手机号</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">实名认证</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">积分余额</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">注册时间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: getRandomColor(user.nickname) }}
                        >
                          {user.nickname.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-800">{user.nickname}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatPhone(user.phone)}</td>
                    <td className="px-6 py-4">
                      {user.id_card_verified ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          已认证
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          未认证
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-[#1E3A5F]">{user.balance}</span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 1 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openDetailDrawer(user)}
                          className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          title="查看详情"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                          title="编辑"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => openPointsModal(user)}
                          className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                          title="调整积分"
                        >
                          <Coins size={16} />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.status === 1
                              ? 'text-red-500 hover:bg-red-50'
                              : 'text-green-500 hover:bg-green-50'
                          }`}
                          title={user.status === 1 ? '禁用' : '启用'}
                        >
                          {user.status === 1 ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            共 {total} 条记录，第 {params.page} / {totalPages || 1} 页
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(params.page - 1)}
              disabled={params.page <= 1}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (params.page > 3) {
                  pageNum = params.page - 2 + i;
                }
                if (params.page > totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                }
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-9 h-9 rounded-lg font-medium transition-colors ${
                    params.page === pageNum
                      ? 'bg-[#1E3A5F] text-white'
                      : 'border border-gray-300 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => handlePageChange(params.page + 1)}
              disabled={params.page >= totalPages}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 新增用户弹窗 */}
      {showCreateModal && (
        <Modal title="新增用户" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="请输入昵称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">初始密码</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="请输入初始密码"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
              >
                确定
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 编辑用户弹窗 */}
      {showEditModal && (
        <Modal title="编辑用户" onClose={() => setShowEditModal(false)}>
          <form onSubmit={handleEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
              <input
                type="text"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                placeholder="请输入昵称"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
              >
                保存
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 调整积分弹窗 */}
      {showPointsModal && (
        <Modal title="调整积分" onClose={() => setShowPointsModal(false)}>
          <form onSubmit={handleAdjustPoints} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                当前用户：<span className="font-medium text-gray-800">{selectedUser?.nickname}</span>
              </p>
              <p className="text-sm text-gray-600 mt-1">
                当前积分：<span className="font-semibold text-[#1E3A5F]">{selectedUser?.balance}</span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整积分</label>
              <p className="text-xs text-gray-500 mb-2">正数增加，负数扣除</p>
              <input
                type="number"
                value={pointsData.points}
                onChange={(e) => setPointsData({ ...pointsData, points: Number(e.target.value) })}
                placeholder="请输入积分数值"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">调整原因</label>
              <textarea
                value={pointsData.reason}
                onChange={(e) => setPointsData({ ...pointsData, reason: e.target.value })}
                placeholder="请输入调整原因"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowPointsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <Button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
              >
                确认调整
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* 用户详情抽屉 */}
      {showDetailDrawer && selectedUser && (
        <Drawer title="用户详情" onClose={() => setShowDetailDrawer(false)}>
          <div className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">基本信息</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-medium"
                    style={{ backgroundColor: getRandomColor(selectedUser.nickname) }}
                  >
                    {selectedUser.nickname.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{selectedUser.nickname}</p>
                    <p className="text-sm text-gray-500">{formatPhone(selectedUser.phone)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">用户ID</span>
                    <p className="text-gray-800 mt-0.5">{selectedUser.id}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">积分余额</span>
                    <p className="text-gray-800 mt-0.5 font-semibold text-[#1E3A5F]">{selectedUser.balance}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">实名认证</span>
                    <p className="mt-0.5">
                      {selectedUser.id_card_verified ? (
                        <span className="text-green-600">已认证</span>
                      ) : (
                        <span className="text-gray-500">未认证</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">账号状态</span>
                    <p className="mt-0.5">
                      {selectedUser.status === 1 ? (
                        <span className="text-green-600">正常</span>
                      ) : (
                        <span className="text-red-600">禁用</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">注册时间</span>
                    <p className="text-gray-800 mt-0.5">{formatDate(selectedUser.created_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  openEditModal(selectedUser);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                编辑信息
              </button>
              <button
                onClick={() => {
                  setShowDetailDrawer(false);
                  openPointsModal(selectedUser);
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg hover:from-[#047857] hover:to-[#059669] transition-all"
              >
                调整积分
              </button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
};

// Modal组件
const Modal = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

// Drawer组件
const Drawer = ({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) => (
  <div className="fixed inset-0 z-50">
    <div className="absolute inset-0 bg-black/50" onClick={onClose} />
    <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <X size={18} className="text-gray-500" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default UserManagement;
