import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth_token');

  if (authToken?.value === 'authenticated') {
    return NextResponse.json({
      user: {
        email: 'user@erasor.local',
        name: 'User',
        picture: '/user-avatar.png',
        given_name: 'User',
        family_name: '',
      }
    });
  }

  return NextResponse.json({ user: null }, { status: 401 });
}
