import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";
import type { User } from "../types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshTokenValue: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { full_name: string; email: string; password: string; organization_name: string; organization_slug?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshTokenValue: null,
      login: async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        set({ user: data.user, accessToken: data.access_token, refreshTokenValue: data.refresh_token });
      },
      signup: async (payload) => {
        const { data } = await api.post("/auth/signup", payload);
        set({ user: data.user, accessToken: data.access_token, refreshTokenValue: data.refresh_token });
      },
      logout: async () => {
        const token = get().accessToken;
        if (token) await api.post("/auth/logout", { token }).catch(() => undefined);
        set({ user: null, accessToken: null, refreshTokenValue: null });
      },
      refreshToken: async () => {
        const refreshToken = get().refreshTokenValue;
        if (!refreshToken) return;
        const { data } = await api.post("/auth/refresh", { refresh_token: refreshToken });
        set({ accessToken: data.access_token });
      }
    }),
    { name: "cf-auth" }
  )
);
