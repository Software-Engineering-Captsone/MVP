import { NextRequest, NextResponse } from 'next/server';
import { findUserByVerificationToken, updateLocalUser } from '@/lib/auth/localUserRepository';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Invalid verification link' }, { status: 400 });
    }

    const user = await findUserByVerificationToken(token);

    if (!user) {
      return NextResponse.json({ error: 'Invalid or expired verification token' }, { status: 400 });
    }

    await updateLocalUser(user._id, {
      verified: true,
      verificationToken: null,
    });

    return NextResponse.redirect(new URL('/auth?verified=true', request.url));
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
