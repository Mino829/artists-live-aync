import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  return NextResponse.json({ authenticated: true });
}

export async function POST(request: Request) {
  try {
    const { password } = await request.json().catch(() => ({}));
    const securePassword = process.env.ACCESS_PASSWORD;
    
    if (!securePassword || password === securePassword) {
      return NextResponse.json({ authenticated: true });
    }
  } catch (e) {
    // Fallback
  }

  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  return NextResponse.json({ authenticated: true });
}
