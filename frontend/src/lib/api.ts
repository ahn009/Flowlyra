import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL
});

api.interceptors.request.use((config) => {
  const token = readAuthState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config as RetryableRequest | undefined;
    const status = error.response?.status;
    const url = String(config?.url ?? "");
    if (status !== 401 || !config || config._retry || url.includes("/auth/login") || url.includes("/auth/refresh")) {
      return Promise.reject(error);
    }

    const refreshToken = readAuthState().refreshTokenValue;
    if (!refreshToken) {
      clearStaleAuth();
      return Promise.reject(error);
    }

    try {
      config._retry = true;
      const { data } = await axios.post<{ access_token: string }>(`${baseURL}/auth/refresh`, { refresh_token: refreshToken });
      writeAccessToken(data.access_token);
      config.headers.Authorization = `Bearer ${data.access_token}`;
      return api(config);
    } catch (refreshError) {
      clearStaleAuth();
      return Promise.reject(refreshError);
    }
  }
);

interface PersistedAuth {
  accessToken: string | null;
  refreshTokenValue: string | null;
}

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

function readAuthState(): PersistedAuth {
  try {
    const raw = localStorage.getItem("cf-auth");
    const parsed = raw ? (JSON.parse(raw) as { state?: Partial<PersistedAuth> }) : null;
    return {
      accessToken: parsed?.state?.accessToken ?? null,
      refreshTokenValue: parsed?.state?.refreshTokenValue ?? null
    };
  } catch {
    return { accessToken: null, refreshTokenValue: null };
  }
}

function writeAccessToken(accessToken: string): void {
  try {
    const raw = localStorage.getItem("cf-auth");
    const parsed = raw ? (JSON.parse(raw) as { state?: Record<string, unknown>; version?: number }) : { state: {} };
    parsed.state = { ...(parsed.state ?? {}), accessToken };
    localStorage.setItem("cf-auth", JSON.stringify(parsed));
  } catch {
    clearStaleAuth();
  }
}

function clearStaleAuth(): void {
  localStorage.removeItem("cf-auth");
  if (window.location.pathname !== "/login") window.location.assign("/login");
}
