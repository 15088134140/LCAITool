import { api } from "./api";

const TOKEN_KEY = "lcaitool_token";
const REFRESH_TOKEN_KEY = "lcaitool_refresh_token";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  username: string;
  email: string | null;
  nickname: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_admin: boolean;
}

export function getTokens(): AuthTokens | null {
  if (typeof window === "undefined") return null;
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (accessToken && refreshToken) {
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: "bearer",
    };
  }
  return null;
}

export function setTokens(tokens: AuthTokens): void {
  localStorage.setItem(TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isAuthenticated(): boolean {
  return !!getTokens();
}

export async function login(username: string, password: string): Promise<AuthTokens> {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);

  const response = await fetch("http://localhost:8000/api/v1/auth/login", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "登录失败");
  }

  const tokens = await response.json();
  setTokens(tokens);
  return tokens;
}

export async function register(username: string, password: string, email?: string): Promise<User> {
  return api.post<User>("/auth/register", { username, password, email });
}

export async function getCurrentUser(): Promise<User> {
  const tokens = getTokens();
  if (!tokens) throw new Error("未登录");

  return api.get<User>("/users/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
}

export function logout(): void {
  clearTokens();
}
