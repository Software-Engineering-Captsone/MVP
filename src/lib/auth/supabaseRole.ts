export type UserRole = "athlete" | "brand" | "admin" | "unknown";

export async function getUserRole(): Promise<UserRole> {
  return "unknown";
}

export async function requireRole(_role: UserRole): Promise<void> {}

type RoleInput = {
  userMetadata?: Record<string, unknown> | null;
  appMetadata?: Record<string, unknown> | null;
};

/**
 * Fast client-side role read. Source of truth is `profiles.role` in the DB
 * (mirrored into `user_metadata.role` by the signup trigger). `app_metadata.role`
 * wins when both are present — it's server-controlled and cannot be forged by the client.
 */
export function resolveSupabaseRole(input?: RoleInput): "athlete" | "brand" {
  const app = input?.appMetadata?.role;
  if (app === "brand" || app === "athlete") return app;
  const user = input?.userMetadata?.role;
  if (user === "brand" || user === "athlete") return user;
  return "athlete";
}

export function isRole(value: unknown): value is UserRole {
  return value === "athlete" || value === "brand" || value === "admin" || value === "unknown";
}
