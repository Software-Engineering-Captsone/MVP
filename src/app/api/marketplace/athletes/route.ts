import { NextResponse } from 'next/server';
import { mockAthletes } from '@/lib/mockData';

/**
 * Production: replace with a database query.
 * The response shape must match `Athlete` in `src/lib/mockData.ts`.
 */
export async function GET() {
  return NextResponse.json(mockAthletes);
}
