import { NextResponse } from 'next/server';

/**
 * Standard API error envelope: `{ error: string, details?: unknown }`.
 * Omits `details` when absent or empty for a stable wire shape.
 */
export function jsonError(status: number, error: string, details?: unknown): NextResponse {
  const trimmed = typeof error === 'string' && error.trim() ? error.trim() : 'Request failed';
  const hasDetails =
    details != null &&
    typeof details === 'object' &&
    (Array.isArray(details) ? details.length > 0 : Object.keys(details as object).length > 0);
  if (hasDetails) {
    return NextResponse.json({ error: trimmed, details }, { status });
  }
  return NextResponse.json({ error: trimmed }, { status });
}
