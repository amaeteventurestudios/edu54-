/** Thin typed client for the Umanah API. Errors are the predictable typed shape from docs/20. */

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function cookie(name: string): string | undefined {
  return document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=")[1];
}

export async function api<T = unknown>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body = init.body;
  if (init.json !== undefined) {
    headers.set("Content-Type", "application/json");
    body = JSON.stringify(init.json);
  }
  if ((init.method ?? "GET") !== "GET") {
    const csrf = cookie("umanah_csrf");
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }
  const res = await fetch(path, { ...init, headers, body, credentials: "same-origin" });
  if (!res.ok) {
    let code = "error", message = "Something went wrong.";
    try {
      const j = await res.json();
      code = j.error?.code ?? code;
      message = j.error?.message ?? message;
    } catch { /* not JSON */ }
    throw new ApiError(res.status, code, message);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const get = <T,>(p: string) => api<T>(p);
export const post = <T,>(p: string, json?: unknown) => api<T>(p, { method: "POST", json: json ?? {} });
export const put = <T,>(p: string, json?: unknown) => api<T>(p, { method: "PUT", json: json ?? {} });
export const patch = <T,>(p: string, json?: unknown) => api<T>(p, { method: "PATCH", json: json ?? {} });

/* ------------------------------------------------------------------ shapes */
export type Role = "owner" | "school_admin" | "sub_admin" | "teacher" | "counselor" | "student";
export type Band = "discover" | "explore" | "build" | "launch";
export interface User { id: number; name: string; role: Role; role_label: string; permissions: string[]; must_change_password: boolean; pin_login: boolean; username: string; title: string | null; initials: string; is_safety_contact: boolean;
  grade?: number | null; grade_label?: string | null; band?: Band | null; band_name?: string | null; stage?: string | null; content_bands?: Band[] }
export interface Level { level: number; name: string; xp: number; next_level_xp: number | null; next_level_name: string | null; percent: number }
export interface LessonRef { id: string; title: string; number: number; module: string; available: boolean }
export interface Course { id: string; title: string; description: string; icon: string; accent: string; percent: number; lessons_done: number; lessons_total: number; next: LessonRef | null }
export interface AssignedItem { id: string; title: string; subject: string; due_at: string; state: string; score?: number | null; max_score?: number }
export interface Badge { id: string; name: string; description: string; earned: boolean; awarded_at?: string | null }
