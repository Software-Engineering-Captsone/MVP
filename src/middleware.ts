import { NextResponse, type NextRequest } from 'next/server';

function hasSupabaseAuthCookie(request: NextRequest) {
  const authCookiePattern = /^sb-.*-auth-token(?:\.\d+)?$/;
  return request.cookies
    .getAll()
    .some((cookie) => authCookiePattern.test(cookie.name));
}

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const forceAuthView = searchParams.get('force') === '1';
  const isSignedIn = hasSupabaseAuthCookie(request);

  const isProtected =
    pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding');
  if (!isSignedIn && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    url.search = '?mode=signin';
    return NextResponse.redirect(url);
  }

  if (isSignedIn && pathname === '/auth' && !forceAuthView) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};