import { NextResponse } from 'next/server';
import { getSyncLogs } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const logs = getSyncLogs();
    return NextResponse.json(logs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve sync logs' }, { status: 500 });
  }
}
