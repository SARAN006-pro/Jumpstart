/**
 * Centralized API client for the Jumpstart backend.
 *
 * Handles:
 *  - Bearer token attachment
 *  - Automatic token refresh on 401 (with single-flight lock)
 *  - Uniform error parsing into ApiError
 *  - Typed auth endpoint helpers
 */

const rawBase = (
  import.meta.env.VITE_API_URL || "https://jumpstart-production.up.railway.app"
)
  .split(",")[0]
  .trim();
const normalized = rawBase.replace(/\/+$/, "");
const BASE_URL = normalized.endsWith("/api") ? normalized : normalized + "/api";
const BACKEND_BASE = normalized.endsWith("/api") ? normalized.slice(0, -4) : normalized;

const ACCESS_TOKEN_KEY = "jumpstart_access_token";
const REFRESH_TOKEN_KEY = "jumpstart_refresh_token";

/* ------------------------------------------------------------------ */
/*  Token storage helpers                                             */
/* ------------------------------------------------------------------ */

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

/* ------------------------------------------------------------------ */
/*  Error type                                                        */
/* ------------------------------------------------------------------ */

export interface FieldErrors {
  [field: string]: string;
}

export class ApiError extends Error {
  status: number;
  code: string;
  fieldErrors?: FieldErrors;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/* ------------------------------------------------------------------ */
/*  Session-expired callback (registered by the auth store)           */
/* ------------------------------------------------------------------ */

let sessionExpiredHandler: (() => void) | null = null;

export function onSessionExpired(handler: () => void): void {
  sessionExpiredHandler = handler;
}

/* ------------------------------------------------------------------ */
/*  Token refresh (single-flight)                                     */
/* ------------------------------------------------------------------ */

let refreshPromise: Promise<string> | null = null;

async function doRefresh(): Promise<string> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new ApiError(401, "NO_REFRESH_TOKEN", "No refresh token available");
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new ApiError(401, "REFRESH_FAILED", "Session expired");
  }

  const data: AuthResponse = await res.json();
  setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

function refreshToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = doRefresh().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/* ------------------------------------------------------------------ */
/*  Core request function                                             */
/* ------------------------------------------------------------------ */

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAccessToken();

  const makeHeaders = (tok: string | null): HeadersInit => ({
    "Content-Type": "application/json",
    ...(tok ? { Authorization: `Bearer ${tok}` } : {}),
    ...options.headers,
  });

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: makeHeaders(token),
  });

  // On 401, attempt a single token refresh then retry (skip for auth
  // endpoints to avoid infinite loops).
  if (
    res.status === 401 &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh")
  ) {
    try {
      const newToken = await refreshToken();
      const retryRes = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: makeHeaders(newToken),
      });
      return parseResponse<T>(retryRes);
    } catch {
      clearTokens();
      if (sessionExpiredHandler) sessionExpiredHandler();
      throw new ApiError(
        401,
        "SESSION_EXPIRED",
        "Your session has expired. Please log in again.",
      );
    }
  }

  return parseResponse<T>(res);
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({
      message: res.statusText,
      code: "ERROR",
    }));
    throw new ApiError(
      res.status,
      body.code ?? "ERROR",
      body.message ?? "Request failed",
      body.fieldErrors,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Generic HTTP helpers                                              */
/* ------------------------------------------------------------------ */

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ------------------------------------------------------------------ */
/*  Response types (mirror backend DTOs)                              */
/* ------------------------------------------------------------------ */

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresInMs: number;
  user: UserResponse;
}

/* ------------------------------------------------------------------ */
/*  Auth endpoint helpers                                             */
/* ------------------------------------------------------------------ */

export async function authLogin(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

export async function authRegister(
  name: string,
  email: string,
  password: string,
  role: string = "STUDENT",
): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>("/auth/register", {
    name,
    email,
    password,
    role,
  });
  setTokens(res.accessToken, res.refreshToken);
  return res;
}

export async function authMe(): Promise<UserResponse> {
  return api.get<UserResponse>("/auth/me");
}

export async function authUpdateProfile(name: string): Promise<UserResponse> {
  return api.patch<UserResponse>("/auth/me", { name });
}

export async function authLogout(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // Best-effort — clear local state regardless.
    }
  }
  clearTokens();
}

export function getGoogleOAuthUrl(): string {
  return `${BACKEND_BASE}/oauth2/authorization/google`;
}

export function getApiBaseUrl(): string {
  return BASE_URL;
}

/* ------------------------------------------------------------------ */
/*  Notes Storage endpoint helpers                                    */
/* ------------------------------------------------------------------ */

export async function getNotesStorage(): Promise<{ notesStoragePath: string | null }> {
  return api.get("/settings/notes");
}

export async function saveNotesStorage(path: string): Promise<{ notesStoragePath: string | null }> {
  return api.put("/settings/notes", { path });
}

export async function verifyNotesStorage(): Promise<{ success: boolean; message: string }> {
  return api.post("/settings/notes/verify");
}

export async function resetNotesStorage(): Promise<{ notesStoragePath: string | null }> {
  return api.del("/settings/notes");
}
