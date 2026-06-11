import { NextResponse } from 'next/server';
import { getArtists, saveArtist, deleteArtist } from '@/lib/db';

export async function GET() {
  try {
    const artists = getArtists();
    return NextResponse.json(artists);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve artists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, name, liveUrl, selectorItem, selectorTitle, selectorDate, selectorVenue, selectorLink } = body;

    if (!name || !liveUrl || !selectorItem) {
      return NextResponse.json(
        { error: 'Name, Live URL, and Item Selector are required.' },
        { status: 400 }
      );
    }

    // Generate id if not editing an existing artist
    let artistId = id;
    if (!artistId) {
      const slug = name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+/gi, '-')
        .replace(/(^-|-$)/g, '');
      artistId = slug || Math.random().toString(36).substring(2, 9);
    }

    const newArtist = {
      id: artistId,
      name: name.trim(),
      liveUrl: liveUrl.trim(),
      selectorItem: selectorItem.trim(),
      selectorTitle: (selectorTitle || '').trim(),
      selectorDate: (selectorDate || '').trim(),
      selectorVenue: (selectorVenue || '').trim(),
      selectorLink: (selectorLink || '').trim(),
      lastSyncedAt: body.lastSyncedAt || null,
      status: body.status || 'idle',
      errorMessage: body.errorMessage || null,
    };

    saveArtist(newArtist);

    return NextResponse.json({ success: true, artist: newArtist });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save artist' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
