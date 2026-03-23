import { NextResponse } from 'next/server';
import { mockBrands } from '@/lib/mockData';

/**
 * Production: replace with a database query (or upstream NIL marketplace API).
 * The response shape must match `Brand` in `src/lib/mockData.ts`.
 */
export async function GET() {
  return NextResponse.json(mockBrands);
}
