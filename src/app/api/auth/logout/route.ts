import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete({
    name: 'auth_token',
    path: '/',
  });
  return response;
}

export async function GET(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  const redirectUrl = host ? `${proto}://${host}/login` : '/login';

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.delete({
    name: 'auth_token',
    path: '/',
  });
  return response;
}
