import { createInternalNeonAuth } from "@neon/auth";

// createInternalNeonAuth exposes BOTH the Better Auth client (`adapter`) and
// the JWT access token getter (`getJWTToken`). The API verifies a JWT (not the
// raw session token), so we must use getJWTToken() — not `adapter.token()`.
const neonAuth = createInternalNeonAuth(import.meta.env.VITE_NEON_AUTH_URL);
export const authClient = neonAuth.adapter;

export type SessionUser = { id: string; email: string; name?: string };

export async function getSessionUser(): Promise<SessionUser | null> {
  const { data } = await authClient.getSession();
  const user = data?.user;
  if (!user) return null;
  return { id: String(user.id), email: String(user.email), name: typeof user.name === "string" ? user.name : undefined };
}

export async function getToken(): Promise<string | null> {
  return await neonAuth.getJWTToken();
}

export async function signOut(): Promise<void> {
  await authClient.signOut();
}
