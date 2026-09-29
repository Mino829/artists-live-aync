import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Public liveness endpoint for external uptime monitors such as Uptime Kuma.
 * Keep the response free of configuration, database contents, and secrets.
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', service: 'artists-live-aync' },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
