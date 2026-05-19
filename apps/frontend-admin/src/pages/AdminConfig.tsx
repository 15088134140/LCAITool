import { useEffect, useState } from 'react';
import { Plus, Key, X, Check, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store';
import { adminApi, AdminUser } from '@/api';
import { formatDate, getRandomColor } from '@/utils';
import { Button } from "@lcaitool/ui";

const AdminConfig = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    username: '',
    nickname: '',
    password: '',
    role: '运营管理员',
  });
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setCurrentPageTitle('账号配置');
    setBreadcrumbs([{ label: '首页' }, { label: '账号配置' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // 加载管理员列表
  useEffect(() => {
    loadAdmins();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getList();
      setAdmins(data);
    } catch (err) {
      console.error('加载管理员列表失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 创建管理员
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.create(formData);
      setShowCreateModal(false);
      setFormData({ username: '', nickname: '', password: '', role: '运营管理员' });
      loadAdmins();
    } catch (err) {
      console.error('创建管理员失败:', err);
    }
  };

  // 重置密码
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    if (newPassword !== confirmPassword) {
      alert('两次输入的密码不一致');
      return;
    }
    try {
      await adminApi.resetPassword(selectedAdmin.id, newPassword);
      setShowResetPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedAdmin(null);
    } catch (err) {
      console.error('重置密码失败:', err);
    }
  };

  // 打开重置密码弹窗
  const openResetPasswordModal = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setNewPassword('');
    setConfirmPassword('');
    setShowResetPasswordModal(true);
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <p className="text-gray-600">管理系统后台账号和权限配置</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
          >
            <Plus size={18} />
            <span>新增管理员</span>
          </Button>
        </div>
      </div>

      {/* 管理员列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">管理员</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">角色</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">状态</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">最后登录</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">创建时间</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    暂无数据
                  </td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-medium"
                          style={{ backgroundColor: getRandomColor(admin.nickname) }}
                        >
                          {admin.nickname.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{admin.nickname}</p>
                          <p className="text-sm text-gray-500">@{admin.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {admin.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          正常
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          禁用
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : '未登录'}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-sm">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openResetPasswordModal(admin)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <Key size={14} />
                        <span>重置密码</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 安全提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-1.5 bg-amber-100 rounded-lg">
            <Check size={16} className="text-amber-600" />
          </div>
          <div>
            <h4 className="font-medium text-amber-800">安全提示</h4>
            <p className="text-sm text-amber-700 mt-1">
              1. 建议定期更换密码，密码长度不少于8位，包含大小写字母和数字<br />
              2. 管理员账号仅限内部使用，禁止外借<br />
              3. 如发现异常登录，请及时联系系统管理员
            </p>
          </div>
        </div>
      </div>

      {/* 新增管理员弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">新增管理员</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="请输入登录用户名"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">显示名称</label>
                <input
                  type="text"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="请输入显示名称"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                >
                  <option value="超级管理员">超级管理员</option>
                  <option value="运营管理员">运营管理员</option>
                  <option value="客服专员">客服专员</option>
                </select>
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
                  创建
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowResetPasswordModal(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-800">重置密码</h3>
              <button
                onClick={() => setShowResetPasswordModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-700">
                正在为管理员「<span className="font-medium">{selectedAdmin?.nickname}</span>」重置密码
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">确认新密码</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
                />
                <label htmlFor="showPassword" className="text-sm text-gray-600 cursor-pointer">
                  显示密码
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <Button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                >
                  <RefreshCw size={16} />
                  <span>确认重置</span>
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
