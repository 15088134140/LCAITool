import useAuthStore from '../store/useAuthStore';

const API_BASE_URL = process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:8000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getAuthHeader(): string | null {
  const tokens = useAuthStore.getState().tokens;
  if (tokens?.access_token) {
    return `Bearer ${tokens.access_token}`;
  }
  return null;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const authHeader = getAuthHeader();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  // Handle 401 Unauthorized - clear auth state
  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError("登录已过期，请重新登录", 401);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: "请求失败" };
    }
    throw new ApiError(errorData.message || errorData.detail || "请求失败", response.status, errorData);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestInit, "method">) =>
    request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : null,
      ...options,
    }),
  put: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : null,
      ...options,
    }),
  patch: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : null,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: Omit<RequestInit, "method">) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};

// Auth specific APIs
export const authApi = {
  login: async (username: string, password: string) => {
    const formData = new FormData();
    formData.append("username", username);
    formData.append("password", password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message || error.detail || "登录失败", response.status);
    }

    return response.json();
  },

  register: async (data: { username: string; password: string; email?: string }) => {
    return api.post("/auth/register", data);
  },

  sendSmsCode: async (phone: string) => {
    return api.post("/users/send-code", { phone });
  },

  getCurrentUser: async (accessToken?: string) => {
    // 如果提供了accessToken，直接使用；否则从store获取
    const authHeader = accessToken
      ? `Bearer ${accessToken}`
      : getAuthHeader();

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { "Authorization": authHeader } : {}),
      },
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.message || error.detail || "获取用户信息失败", response.status);
    }

    return response.json();
  },

  updateProfile: async (data: Partial<{ nickname: string; email: string; avatar: string }>) => {
    return api.put("/users/me", data);
  },

  changePassword: async (old_password: string, new_password: string) => {
    return api.post("/users/change-password", { old_password, new_password });
  },

  changePhone: async (phone: string, code: string) => {
    return api.post("/users/change-phone", { phone, code });
  },

  verifyIdentity: async (real_name: string, id_card_number: string) => {
    return api.post("/users/verify-id", { real_name, id_card_number });
  },

  getPointsBalance: async () => {
    return api.get("/users/balance");
  },

  getPointsHistory: async (params?: { page?: number; page_size?: number; type?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.page_size) queryParams.set("page_size", params.page_size.toString());
    if (params?.type) queryParams.set("type", params.type);

    const queryString = queryParams.toString();
    return api.get(`/users/transactions${queryString ? `?${queryString}` : ""}`);
  },

  logout: () => {
    return api.post("/auth/logout");
  },
};

// Tools specific APIs
export const toolsApi = {
  getCategories: async () => {
    return api.get("/tools/categories/list");
  },

  getTools: async (params?: {
    categoryId?: string;
    search?: string;
    isFeatured?: boolean;
    isNew?: boolean;
    isHot?: boolean;
    page?: number;
    pageSize?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.categoryId) queryParams.set("categoryId", params.categoryId);
    if (params?.search) queryParams.set("search", params.search);
    if (params?.isFeatured) queryParams.set("isFeatured", "true");
    if (params?.isNew) queryParams.set("isNew", "true");
    if (params?.isHot) queryParams.set("isHot", "true");
    if (params?.page) queryParams.set("page", params.page.toString());
    if (params?.pageSize) queryParams.set("pageSize", params.pageSize.toString());

    const queryString = queryParams.toString();
    return api.get(`/tools${queryString ? `?${queryString}` : ""}`);
  },

  getToolById: async (id: string) => {
    return api.get(`/tools/${id}`);
  },

  getToolReviews: async (toolId: string, page: number = 1, pageSize: number = 10) => {
    return api.get(`/tools/${toolId}/ratings?page=${page}&page_size=${pageSize}`);
  },
};
