import { NextResponse } from 'next/server';
import { scrapeLiveInfo } from '@/lib/scraper';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { liveUrl, selectorItem, selectorTitle, selectorDate, selectorVenue, selectorLink } = body;

    if (!liveUrl || !selectorItem) {
      return NextResponse.json(
        { error: 'Live URL and Item Selector are required to test scraping.' },
        { status: 400 }
      );
    }

    try {
      const results = await scrapeLiveInfo({
        liveUrl: liveUrl.trim(),
        selectorItem: selectorItem.trim(),
        selectorTitle: (selectorTitle || '').trim(),
        selectorDate: (selectorDate || '').trim(),
        selectorVenue: (selectorVenue || '').trim(),
        selectorLink: (selectorLink || '').trim(),
      });

      return NextResponse.json({
        success: true,
        count: results.length,
        items: results.slice(0, 10), // Limit preview to top 10 items
      });
    } catch (scrapingError: any) {
      return NextResponse.json(
        { error: scrapingError.message || 'An error occurred while scraping the page.' },
        { status: 422 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process test request' }, { status: 500 });
  }
}
