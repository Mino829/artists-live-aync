import { NextResponse } from 'next/server';
import { getEvents } from '@/lib/db';

export async function GET() {
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
