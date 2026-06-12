import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const events = getEvents();
    
    // Sort events: newest scraped events first
    const sortedEvents = [...events].sort((a, b) => {
      return new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime();
    });
    
    return NextResponse.json(sortedEvents);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve events history' }, { status: 500 });
  }
}
