import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();

  const validUsername = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;

  if (!validUsername || !validPassword) {
    return NextResponse.json(
      { error: 'Auth not configured' },
      { status: 500 }
    );
  }

  if (username === validUsername && password === validPassword) {
    // Set auth cookie with no expiry (max age = 100 years)
    const cookieStore = await cookies();
    cookieStore.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 * 100, // 100 years
      path: '/',
    });

    return NextResponse.json({ success: true });
  }

  return NextResponse.json(
    { error: 'Invalid credentials' },
    { status: 401 }
  );
}
