import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths
  if (pathname.startsWith('/login') || pathname.startsWith('/api/auth/login')) {
    return NextResponse.next();
  }

  // API or internal routes
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Set the user context in headers so API routes can access it
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.id.toString());
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-roles', payload.roles);

  // Role-based protection for /admin
  if (pathname.startsWith('/admin')) {
    if (!payload.roles.includes('Supervisor') && !payload.roles.includes('Co-Supervisor')) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|logo.png|styles.css).*)',
  ],
};
