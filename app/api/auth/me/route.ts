import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authToken = request.cookies.get('auth_token');

  if (authToken?.value === 'authenticated') {
    const response = NextResponse.json({
      user: {
        email: 'user@erasor.local',
        name: 'User',
        picture: '/user-avatar.png',
        given_name: 'User',
        family_name: '',
      }
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  const response = NextResponse.json({ user: null }, { status: 401 });
  response.headers.set('Cache-Control', 'no-store, max-age=0');
  return response;
}
