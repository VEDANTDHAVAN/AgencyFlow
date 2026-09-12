import { api } from "./client";

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "PROJECT_MANAGER" | "DEVELOPER";
}

export interface LoginResponse {
  data: {
    accessToken: string;
    user: User;
  };
}

export async function login(email: string, password: string) {
  const response = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  return response.data.data;
}

export async function getMe() {
  const response = await api.get<{ data: User }>("/auth/me");
  return response.data.data;
}

export async function refresh() {
  const response = await api.post<LoginResponse>("/auth/refresh");
  return response.data.data;
}

export async function logout() {
  await api.post("/auth/logout");
}