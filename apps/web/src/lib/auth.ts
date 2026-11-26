import { createAuthClient } from "@neon/auth";

export const authClient = createAuthClient(import.meta.env.VITE_NEON_AUTH_URL);

export type SessionUser = { id: string; email: string; name?: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const { data } = await authClient.getSession();
  const user = data?.user;
  if (!user) return null;
  return { id: String(user.id), email: String(user.email), name: typeof user.name === "string" ? user.name : undefined };
}

export async function getToken(): Promise<string | null> {
  const { data } = await authClient.token();
  return data?.token ?? null;
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}
