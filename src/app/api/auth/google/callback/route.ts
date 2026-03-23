import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import {
  createLocalUser,
  findUserByEmail,
  findUserByGoogleId,
  updateLocalUser,
} from '@/lib/auth/localUserRepository';

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const state = searchParams.get('state');
  const role = state === 'brand' ? 'brand' : 'athlete';

  if (error || !code) {
    return NextResponse.redirect(`${base}/auth?error=google_denied`);
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${base}/api/auth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok || !tokens.access_token) {
    console.error('Google token exchange failed:', tokens);
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const profile = await profileRes.json();

  if (!profileRes.ok || !profile.email) {
    console.error('Google profile fetch failed:', profile);
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not set');
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }

  try {
    let user = await findUserByGoogleId(profile.id);

    if (!user) {
      const byEmail = await findUserByEmail(profile.email);
      if (byEmail) {
        await updateLocalUser(byEmail._id, {
          googleId: profile.id,
          verified: true,
        });
        user = (await findUserByGoogleId(profile.id)) ?? (await findUserByEmail(profile.email))!;
      } else {
        user = await createLocalUser({
          email: profile.email,
          passwordHash: null,
          name: profile.name || profile.email.split('@')[0],
          role,
          googleId: profile.id,
          verified: true,
        });
      }
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    return NextResponse.redirect(`${base}/auth/google/success?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('Google OAuth local user error:', err);
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }
}
