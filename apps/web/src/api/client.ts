import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? "http://localhost:4000" : undefined);

if (!apiBaseUrl) {
  throw new Error(
    "Missing VITE_API_URL. Set the Railway API HTTPS URL in the Vercel production environment.",
  );
}

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

export function setAccessToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}