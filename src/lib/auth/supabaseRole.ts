export type UserRole = "athlete" | "brand" | "admin" | "unknown";

export async function getUserRole(): Promise<UserRole> {
  return "unknown";
}

export async function requireRole(_role: UserRole): Promise<void> {}

export function resolveSupabaseRole(_input?: unknown): "athlete" | "brand" {
  return "athlete";
}

export function isRole(value: unknown): value is UserRole {
  return value === "athlete" || value === "brand" || value === "admin" || value === "unknown";
}
