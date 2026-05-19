import request from '@/utils/request';

export interface LoginParams {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface AuthUser {
  id: string;
  phone: string | null;
  email: string | null;
  nickname: string | null;
  avatar: string | null;
  id_card_verified: boolean;
  balance: number;
  status: number;
  created_at: number;
  updated_at: number;
}

export const authApi = {
  // 登录
  login: (data: LoginParams) => {
    const formData = new URLSearchParams();
    formData.append('username', data.username);
    formData.append('password', data.password);
    return request.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  },

  // 登出
  logout: () => {
    return request.post('/auth/logout');
  },

  // 获取当前用户信息
  getCurrentUser: () => {
    return request.get<AuthUser>('/users/me');
  },
};
