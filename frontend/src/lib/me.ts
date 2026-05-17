import { useQuery } from "@tanstack/react-query";

import { api } from "./api";

export interface MeUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  status: string;
  is_online: boolean;
  two_factor_enabled: boolean;
  last_seen_at: string | null;
}

export interface MeOrganization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  trial_ends_at: string | null;
  locale_default: string;
  timezone: string;
  enforce_two_factor: boolean;
}

export interface MeResponse {
  user: MeUser;
  organization: MeOrganization;
  permissions: string[];
}

export function useMe() {
  return useQuery<MeResponse>({
    queryKey: ["me"],
    queryFn: async () => (await api.get<MeResponse>("/auth/me")).data,
    staleTime: 60_000
  });
}

export function hasPermission(permissions: string[] | undefined, required: string): boolean {
  return !!permissions && permissions.includes(required);
}
