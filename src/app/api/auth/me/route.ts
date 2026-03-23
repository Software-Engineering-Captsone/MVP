import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import { findUserById } from '@/lib/auth/localUserRepository';

async function handler(request: NextRequest, user: { userId: string }) {
  const fullUser = await findUserById(user.userId);

  if (!fullUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: fullUser._id,
      email: fullUser.email,
      name: fullUser.name,
      role: fullUser.role,
      verified: fullUser.verified,
    },
  });
}

export const GET = withAuth(handler);
