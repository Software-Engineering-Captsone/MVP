import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

export const DEAL_CONTRACTS_BUCKET = 'deal-contracts';

/** Legacy rows store a full https URL; storage-backed rows store `{dealId}/{objectKey}`. */
export function isStoredContractExternalUrl(stored: string | null | undefined): boolean {
  if (stored == null || stored === '') return false;
  return /^https?:\/\//i.test(stored.trim());
}

export function sanitizeContractFilename(raw: string): string {
  const base = raw.replace(/^.*[/\\]/, '').trim() || 'contract.pdf';
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  return cleaned || 'contract.pdf';
}

export function buildDealContractStoragePath(dealId: string, originalFilename: string): string {
  return `${dealId}/${randomUUID()}_${sanitizeContractFilename(originalFilename)}`;
}

/** Reject path traversal and wrong deal prefix (path is bucket-relative). */
export function assertStoragePathBelongsToDeal(dealId: string, storagePath: string): void {
  const normalized = storagePath.trim().replace(/^\/+/, '');
  if (!normalized || normalized.includes('..')) {
    throw new Error('Invalid storage path');
  }
  const prefix = `${dealId}/`;
  if (!normalized.startsWith(prefix) || normalized.length <= prefix.length) {
    throw new Error('Invalid storage path');
  }
}

export async function resolveContractFileUrlForDownload(
  supabase: SupabaseClient,
  stored: string | null,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (stored == null || stored === '') return null;
  const trimmed = stored.trim();
  if (isStoredContractExternalUrl(trimmed)) return trimmed;
  const { data, error } = await supabase.storage
    .from(DEAL_CONTRACTS_BUCKET)
    .createSignedUrl(trimmed, expiresInSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
