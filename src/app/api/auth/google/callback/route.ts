import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error || !code) {
    return NextResponse.redirect(`${base}/auth?error=google_denied`);
  }

  // Exchange authorization code for tokens
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

  // Fetch Google profile
  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const profile = await profileRes.json();

  if (!profileRes.ok || !profile.email) {
    console.error('Google profile fetch failed:', profile);
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }

  try {
    await dbConnect();

    // 1. Try to find by Google ID
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // 2. Try to find by email and link the Google account
      user = await User.findOne({ email: profile.email });

      if (user) {
        user.googleId = profile.id;
        if (!user.verified) user.verified = true;
        await user.save();
      } else {
        // 3. Create a new user — default role is athlete, can be changed in settings
        user = await User.create({
          googleId: profile.id,
          email: profile.email,
          name: profile.name || profile.email.split('@')[0],
          role: 'athlete',
          verified: true,
        });
      }
    }

    // Issue JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Hand off token to the client via an intermediate page
    return NextResponse.redirect(`${base}/auth/google/success?token=${token}`);
  } catch (err) {
    console.error('Google OAuth DB error:', err);
    return NextResponse.redirect(`${base}/auth?error=google_failed`);
  }
}
