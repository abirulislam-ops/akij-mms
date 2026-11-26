import { getToken } from "./auth";

async function headers(): Promise<Record<string, string>> {
  const token = await getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

export async function apiFetch<T = unknown>(path: string): Promise<T> {
  const res = await fetch(path, { headers: await headers() });
  return parse<T>(res);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, { method: "POST", headers: await headers(), body: body != null ? JSON.stringify(body) : undefined });
  return parse<T>(res);
}

async function parse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new Error(body.error ?? body.message ?? `API ${res.status}`);
  }
  return (await res.json()) as T;
}
