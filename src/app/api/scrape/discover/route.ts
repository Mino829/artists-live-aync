import { NextResponse } from 'next/server';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';
import { discoverArtistSource } from '@/lib/discovery';

export async function POST(request: Request) {
  if (!verifyAuth(request)) return unauthorizedResponse();

  try {
    const body = await request.json();
    if (typeof body.liveUrl !== 'string' || !body.liveUrl.trim()) {
      return NextResponse.json({ error: '解析するURLを入力してください。' }, { status: 400 });
    }

    const result = await discoverArtistSource(body.liveUrl, body.selectors);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'URLを解析できませんでした。';
    return NextResponse.json({ error: message }, { status: 422 });
  }
}
