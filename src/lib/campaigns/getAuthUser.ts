import type { NextRequest } from 'next/server';
import { verifyToken, type AuthUser } from '@/lib/auth';

export function getAuthUserFromRequest(request: NextRequest): AuthUser | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}
