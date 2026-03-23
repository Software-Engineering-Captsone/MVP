import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);

  // Carry the selected role through the OAuth flow via the state param
  const role = searchParams.get('role') === 'brand' ? 'brand' : 'athlete';

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${base}/api/auth/google/callback`,
    scope: 'email profile',
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    state: role,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
