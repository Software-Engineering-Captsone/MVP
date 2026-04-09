import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase auth session on every request so the token
 * stays fresh, and redirects unauthenticated users away from /dashboard.
 */
export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase is not configured, do not block public navigation.
  // Keep /dashboard protected by routing unauthenticated users to /auth.
  if (!supabaseUrl || !supabaseAnonKey) {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    }
  });

  let user: { id: string } | null = null;
  try {
    // IMPORTANT: Do NOT call supabase.auth.getSession() here.
    // getUser() hits Supabase Auth to revalidate. Bound the wait time
    // so navigation cannot hang when auth service is unavailable.
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500)),
    ]);

    if (result && typeof result === 'object' && 'data' in result) {
      user = result.data.user ?? null;
    }
  } catch {
    user = null;
  }

  // Protect /dashboard routes — redirect to /auth if not signed in
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth';
    return NextResponse.redirect(url);
  }

  // If user is signed in and tries to visit /auth, redirect to dashboard,
  // unless the request explicitly asks to stay on auth (e.g. switching account).
  const allowAuthView = request.nextUrl.searchParams.get('force') === '1';
  if (user && request.nextUrl.pathname === '/auth' && !allowAuthView) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
