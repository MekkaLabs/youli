import { NextResponse } from 'next/server';
import { getCurrentUserFromCookie } from '../../../../src/services/auth';

export async function GET() {
  const user = await getCurrentUserFromCookie();
  if (!user) return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user });
}
