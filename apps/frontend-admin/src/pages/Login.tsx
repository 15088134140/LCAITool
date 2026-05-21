import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react';
import { useUserStore } from '@/store';
import { authApi, LoginParams } from '@/api';
import { Button } from "@lcaitool/ui";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useUserStore();

  const [formData, setFormData] = useState<LoginParams>({
    username: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 从localStorage读取记住的账号
  useEffect(() => {
    const savedUsername = localStorage.getItem('savedUsername');
    const savedRemember = localStorage.getItem('savedRememberMe') === 'true';
    if (savedUsername && savedRemember) {
      setFormData((prev) => ({
        ...prev,
        username: savedUsername,
        rememberMe: true,
      }));
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.username.trim()) {
      setError('请输入用户名');
      return;
    }
    if (!formData.password.trim()) {
      setError('请输入密码');
      return;
    }

    setLoading(true);
    try {
      const result = await authApi.login(formData);

      // 先设置token到store（这样后续请求才能携带token）
      login({ id: '', username: formData.username, nickname: '', role: '', permissions: [] }, result.access_token);

      // 获取用户信息
      const user = await authApi.getCurrentUser();

      // 更新用户信息
      useUserStore.getState().updateUser(user);

      // 记住密码
      if (formData.rememberMe) {
        localStorage.setItem('savedUsername', formData.username);
        localStorage.setItem('savedRememberMe', 'true');
      } else {
        localStorage.removeItem('savedUsername');
        localStorage.removeItem('savedRememberMe');
      }

      // 跳转到之前的页面或首页
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err.message;
      setError(detail || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] p-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-[#1E3A5F]">AI</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">灵创AI工具箱</h1>
          <p className="text-white/80">管理后台登录</p>
        </div>

        {/* 登录表单卡片 */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* 用户名 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                用户名
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all outline-none"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                密码
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A5F] focus:border-transparent transition-all outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* 记住密码 */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                className="w-4 h-4 text-[#1E3A5F] border-gray-300 rounded focus:ring-[#1E3A5F]"
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 text-sm text-gray-600 cursor-pointer"
              >
                记住密码
              </label>
            </div>

            {/* 登录按钮 */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-[#059669] to-[#10B981] hover:from-[#047857] hover:to-[#059669] text-white font-medium rounded-lg transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </form>

          {/* 提示信息 */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>提示：输入任意用户名和密码即可体验</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
