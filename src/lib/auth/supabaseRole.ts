type MaybeRecord = Record<string, unknown> | null | undefined;

function normalizeRoleValue(value: unknown): 'brand' | 'athlete' | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  if (v === 'brand' || v === 'business') return 'brand';
  if (v === 'athlete') return 'athlete';
  return null;
}

/**
 * Resolve app role from Supabase metadata with sensible fallbacks.
 * Accepts both `brand` and legacy `business`.
 */
export function resolveSupabaseRole(args: {
  userMetadata?: MaybeRecord;
  appMetadata?: MaybeRecord;
}): 'brand' | 'athlete' {
  const userRole = normalizeRoleValue(args.userMetadata?.role);
  if (userRole) return userRole;
  const appRole = normalizeRoleValue(args.appMetadata?.role);
  if (appRole) return appRole;
  return 'athlete';
}
