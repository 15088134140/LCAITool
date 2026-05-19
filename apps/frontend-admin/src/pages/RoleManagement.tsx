import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Shield, ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { roleApi, Role, Permission } from '@/api';
import { formatDate } from '@/utils';
import { Button } from "@lcaitool/ui";

const RoleManagement = () => {
  const { setCurrentPageTitle, setBreadcrumbs } = useAppStore();

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  // 展开的权限分组
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  useEffect(() => {
    setCurrentPageTitle('角色权限');
    setBreadcrumbs([{ label: '首页' }, { label: '角色权限' }]);
  }, [setCurrentPageTitle, setBreadcrumbs]);

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesData, permissionsData] = await Promise.all([
        roleApi.getList(),
        roleApi.getPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permissionsData);
      // 默认展开所有分组
      setExpandedGroups(permissionsData.map((p) => p.id));
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 切换展开状态
  const toggleExpand = (id: string) => {
    setExpandedGroups((prev) =>
      prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]
    );
  };

  // 切换权限选择
  const togglePermission = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(code)
        ? prev.permissions.filter((p) => p !== code)
        : [...prev.permissions, code],
    }));
  };

  // 全选/取消全选分组
  const toggleGroupPermission = (group: Permission) => {
    const allChildCodes = group.children?.map((c) => c.code) || [];
    const allSelected = allChildCodes.every((code) => formData.permissions.includes(code));

    if (allSelected) {
      // 取消全选
      setFormData((prev) => ({
        ...prev,
        permissions: prev.permissions.filter((p) => !allChildCodes.includes(p)),
      }));
    } else {
      // 全选
      setFormData((prev) => ({
        ...prev,
        permissions: [...new Set([...prev.permissions, ...allChildCodes])],
      }));
    }
  };

  // 创建角色
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await roleApi.create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', description: '', permissions: [] });
      loadData();
    } catch (err) {
      console.error('创建角色失败:', err);
    }
  };

  // 编辑角色
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    try {
      await roleApi.update({
        id: selectedRole.id,
        name: formData.name,
        description: formData.description,
        permissions: formData.permissions,
      });
      setShowEditModal(false);
      setSelectedRole(null);
      loadData();
    } catch (err) {
      console.error('更新角色失败:', err);
    }
  };

  // 删除角色
  const handleDelete = async () => {
    if (!selectedRole) return;
    try {
      await roleApi.delete(selectedRole.id);
      setShowDeleteConfirm(false);
      setSelectedRole(null);
      loadData();
    } catch (err) {
      console.error('删除角色失败:', err);
    }
  };

  // 打开编辑弹窗
  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setFormData({
      name: role.name,
      description: role.description,
      permissions: [...role.permissions],
    });
    setShowEditModal(true);
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (role: Role) => {
    setSelectedRole(role);
    setShowDeleteConfirm(true);
  };

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">管理系统角色和权限配置</p>
        <Button
          onClick={() => {
            setFormData({ name: '', description: '', permissions: [] });
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white"
        >
          <Plus size={18} />
          <span>新增角色</span>
        </Button>
      </div>

      {/* 角色列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500">加载中...</div>
        ) : (
          roles.map((role) => (
            <div
              key={role.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 card-hover transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] rounded-xl flex items-center justify-center">
                    <Shield size={22} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{role.name}</h3>
                    <p className="text-sm text-gray-500">{role.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(role)}
                    className="p-2 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                    title="编辑"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(role)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm text-gray-500 mb-2">权限列表</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.permissions.slice(0, 5).map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-md"
                    >
                      {perm}
                    </span>
                  ))}
                  {role.permissions.length > 5 && (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-md">
                      +{role.permissions.length - 5}
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                  创建时间：{formatDate(role.createdAt)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新增/编辑角色弹窗 */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => {
              setShowCreateModal(false);
              setShowEditModal(false);
            }}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">
                {showCreateModal ? '新增角色' : '编辑角色'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <form
              onSubmit={showCreateModal ? handleCreate : handleEdit}
              className="p-6 overflow-auto flex-1"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色名称
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="请输入角色名称"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    角色描述
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="请输入角色描述"
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent outline-none resize-none"
                    required
                  />
                </div>

                {/* 权限树 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  权限配置
                </label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {permissions.map((group) => {
                      const allChildCodes = group.children?.map((c) => c.code) || [];
                      const allSelected = allChildCodes.every((code) => formData.permissions.includes(code));
                      const someSelected = allChildCodes.some((code) => formData.permissions.includes(code));
                      const isExpanded = expandedGroups.includes(group.id);

                      return (
                        <div key={group.id} className="border-b border-gray-100 last:border-0">
                          <div
                            className="flex items-center justify-between px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleExpand(group.id)}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleGroupPermission(group);
                                }}
                                className={`w-5 h-5 border-2 rounded flex items-center justify-center cursor-pointer transition-colors ${
                                  allSelected
                                    ? 'bg-[#059669] border-[#059669]'
                                    : someSelected
                                    ? 'bg-[#059669] border-[#059669]'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                              >
                                {allSelected && <Check size={12} className="text-white" />}
                                {!allSelected && someSelected && (
                                  <div className="w-2.5 h-0.5 bg-white rounded" />
                                )}
                              </div>
                              <span className="font-medium text-gray-700">{group.name}</span>
                            </div>
                            {isExpanded ? (
                              <ChevronDown size={16} className="text-gray-400" />
                            ) : (
                              <ChevronRight size={16} className="text-gray-400" />
                            )}
                          </div>

                          {isExpanded && group.children && (
                            <div className="py-2">
                              {group.children.map((child) => (
                                <div
                                  key={child.id}
                                  className="flex items-center gap-3 px-12 py-2 hover:bg-gray-50 cursor-pointer"
                                  onClick={() => togglePermission(child.code)}
                                >
                                  <div
                                    className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${
                                      formData.permissions.includes(child.code)
                                        ? 'bg-[#059669] border-[#059669]'
                                        : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                  >
                                    {formData.permissions.includes(child.code) && (
                                      <Check size={12} className="text-white" />
                                    )}
                                  </div>
                                  <span className="text-gray-600">{child.name}</span>
                                  <span className="text-xs text-gray-400 font-mono">
                                    ({child.code})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-[#059669] to-[#10B981] text-white rounded-lg"
                >
                  {showCreateModal ? '创建' : '保存'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">确认删除</h3>
            <p className="text-gray-600 mb-6">
              确定要删除角色「{selectedRole?.name}」吗？此操作不可撤销。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;
