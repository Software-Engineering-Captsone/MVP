import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware';
import dbConnect from '@/lib/db';
import User from '@/models/User';

async function handler(request: NextRequest, user: any) {
  await dbConnect();
  const fullUser = await User.findById(user.userId).select('-password');

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