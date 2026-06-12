import { NextResponse } from 'next/server';
import { runSync } from '@/lib/sync';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';


export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    let artistId: string | undefined = undefined;
    try {
      const body = await request.json().catch(() => ({}));
      artistId = body.artistId;
    } catch (e) {
      // Ignore
    }

    if (!artistId) {
      try {
        const { searchParams } = new URL(request.url);
        artistId = searchParams.get('artistId') || undefined;
      } catch (e) {
        // Ignore
      }
    }

    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger') === 'cron' ? 'cron' : 'manual';

    const syncResponse = await runSync(artistId, trigger);
    if ('error' in syncResponse) {
      return NextResponse.json({ error: syncResponse.error }, { status: syncResponse.status });
    }
    return NextResponse.json(syncResponse);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to complete scrape and sync operation.' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const { searchParams } = new URL(request.url);
    const artistId = searchParams.get('artistId') || undefined;
    const trigger = searchParams.get('trigger') === 'cron' ? 'cron' : 'manual';

    const syncResponse = await runSync(artistId, trigger);
    if ('error' in syncResponse) {
      return NextResponse.json({ error: syncResponse.error }, { status: syncResponse.status });
    }
    return NextResponse.json(syncResponse);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to complete scrape and sync operation.' }, { status: 500 });
  }
}
