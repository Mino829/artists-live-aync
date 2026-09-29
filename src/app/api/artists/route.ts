import { NextResponse } from 'next/server';
import { getArtists, saveArtist, deleteArtist } from '@/lib/db';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { runSync } from '@/lib/sync';
import { discoverArtistSource } from '@/lib/discovery';

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const artists = getArtists();
    return NextResponse.json(artists);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve artists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const body = await request.json();
    const { id, name, liveUrl, selectorItem, selectorTitle, selectorDate, selectorVenue, selectorLink } = body;
    const parserType = ['html', 'jsonld-event', 'legacy-json'].includes(body.parserType)
      ? body.parserType
      : undefined;

    if (!name || !liveUrl) {
      return NextResponse.json(
        { error: 'Name and Live URL are required.' },
        { status: 400 }
      );
    }

    let resolvedParserType = parserType;
    let resolvedSelectors = {
      selectorItem: (selectorItem || '').trim(),
      selectorTitle: (selectorTitle || '').trim(),
      selectorDate: (selectorDate || '').trim(),
      selectorVenue: (selectorVenue || '').trim(),
      selectorLink: (selectorLink || '').trim(),
    };

    // The selector is an internal HTML parsing detail. If the UI did not provide
    // one, discover a source config from the URL before saving the artist.
    if (!resolvedSelectors.selectorItem && resolvedParserType !== 'jsonld-event') {
      try {
        const discovery = await discoverArtistSource(liveUrl.trim());
        resolvedParserType = discovery.parserType;
        resolvedSelectors = discovery.selectors;
      } catch (discoveryError) {
        const message = discoveryError instanceof Error
          ? discoveryError.message
          : 'URLから取得方法を判定できませんでした。';
        return NextResponse.json({ error: message }, { status: 422 });
      }
    }

    if (!resolvedSelectors.selectorItem && resolvedParserType !== 'jsonld-event') {
      return NextResponse.json(
        { error: '取得方法を自動判定できませんでした。詳細設定でContainer Selectorを指定してください。' },
        { status: 422 }
      );
    }

    // Generate id if not editing an existing artist
    let artistId = id;
    let isNew = false;
    if (!artistId) {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/gi, '-')
        .replace(/(^-|-$)/g, '');
      artistId = slug || Math.random().toString(36).substring(2, 9);
      isNew = true;
    } else {
      const exists = getArtists().some((a) => a.id === artistId);
      isNew = !exists;
    }

    const newArtist = {
      id: artistId,
      name: name.trim(),
      liveUrl: liveUrl.trim(),
      ...resolvedSelectors,
      parserType: resolvedParserType,
      lastSyncedAt: body.lastSyncedAt || null,
      status: body.status || 'idle',
      errorMessage: body.errorMessage || null,
    };

    saveArtist(newArtist);

    if (isNew) {
      console.log(`Newly registered artist: ${newArtist.name}. Triggering initial sync...`);
      await runSync(artistId, 'manual');
    }

    return NextResponse.json({ success: true, artist: newArtist });
  } catch (error) {
    console.error('Failed to save artist:', error);
    return NextResponse.json({ error: 'Failed to save artist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Artist ID is required' }, { status: 400 });
    }

    deleteArtist(id);
    return NextResponse.json({ success: true, message: 'Artist deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete artist' }, { status: 500 });
  }
}
