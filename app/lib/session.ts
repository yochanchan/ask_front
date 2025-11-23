"use client";

import { apiFetch } from "./api-client";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./auth-client";

type RefreshResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};

export type MeUser = {
  id: number;
  full_name: string;
  full_name_kana: string | null;
  email: string;
  role: "student" | "teacher" | "admin";
  school_person_id: string | null;
  grade: number | null;
  class_name: string | null;
  gender: string;
  date_of_birth: string | null;
};

export async function ensureAccessToken(): Promise<string | null> {
  let token = getAccessToken();
  if (token) {
    return token;
  }
  try {
    const refreshed = await apiFetch<RefreshResponse>(
      "/auth/refresh",
      { method: "POST" },
      null
    );
    setAccessToken(refreshed.access_token);
    return refreshed.access_token;
  } catch (err) {
    console.error(err);
    clearAccessToken();
    return null;
  }
}

export async function fetchMe(): Promise<MeUser> {
  const token = await ensureAccessToken();
  if (!token) {
    throw new Error("no token");
  }
  return apiFetch<MeUser>("/users/me", {}, token);
}
