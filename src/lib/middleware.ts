import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function withAuth(handler: (request: NextRequest, user: any) => Promise<NextResponse>) {
  return async (request: NextRequest) => {
    try {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'No token provided' }, { status: 401 });
      }

      const token = authHeader.substring(7);
      const user = await verifyToken(token);

      if (!user) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }

      return handler(request, user);
    } catch (error) {
      return NextResponse.json({ error: 'Authentication error' }, { status: 500 });
    }
  };
}