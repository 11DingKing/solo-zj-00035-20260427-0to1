import axios, {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

// 从 localStorage 获取 token（兼容 Zustand persist 存储格式）
const getToken = (): string | null => {
  if (typeof window === "undefined") return null;

  // 优先尝试直接的 token key（login 时设置的）
  let token = localStorage.getItem("token");
  if (token) return token;

  // 尝试从 Zustand persist 存储中解析
  const persisted = localStorage.getItem("auth-storage");
  if (persisted) {
    try {
      const parsed = JSON.parse(persisted);
      token = parsed.state?.token || null;
      if (token) {
        // 同步到 token key，方便下次快速访问
        localStorage.setItem("token", token);
        return token;
      }
    } catch (e) {
      console.error("Failed to parse auth-storage:", e);
    }
  }

  return null;
};

// 清除认证信息
const clearAuth = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("auth-storage");
};

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 清除认证状态
      clearAuth();

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
