import { NextRequest, NextResponse } from 'next/server';

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

  // Trim whitespace and compare
  if (username?.trim() === validUsername?.trim() && password?.trim() === validPassword?.trim()) {
    const response = NextResponse.json({ success: true });

    // Set auth cookie with no expiry (max age = 100 years)
    response.cookies.set('auth_token', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 * 100, // 100 years
      path: '/',
    });

    return response;
  }

  return NextResponse.json(
    { error: 'Invalid credentials' },
    { status: 401 }
  );
}
