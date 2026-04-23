/**
 * Header `x-mvp-deals-system-key` must match `process.env.MVP_DEALS_SYSTEM_KEY`.
 * In development, `mvp-dev-deals-system` is accepted when no env var is set.
 */
export function isAuthorizedDealsSystemCaller(headerValue: string | null | undefined): boolean {
  const key = typeof headerValue === 'string' ? headerValue.trim() : '';
  if (!key) return false;
  const env = process.env.MVP_DEALS_SYSTEM_KEY;
  if (typeof env === 'string' && env.length > 0) {
    return key === env;
  }
  return process.env.NODE_ENV !== 'production' && key === 'mvp-dev-deals-system';
}
