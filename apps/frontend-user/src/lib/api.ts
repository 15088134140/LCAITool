const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

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

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: "请求失败" };
    }
    throw new ApiError(errorData.detail || "请求失败", response.status, errorData);
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestInit, "method">) =>
    request<T>(endpoint, { method: "GET", ...options }),
  post: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  put: <T>(endpoint: string, data?: any, options?: Omit<RequestInit, "method" | "body">) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    }),
  delete: <T>(endpoint: string, options?: Omit<RequestInit, "method">) =>
    request<T>(endpoint, { method: "DELETE", ...options }),
};
