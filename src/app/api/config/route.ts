import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';
import { validateNotionConnection } from '@/lib/notion';

export async function GET() {
  try {
    const config = getConfig();
    return NextResponse.json({
      configured: !!(config.notionApiKey && config.notionDatabaseId),
      notionDatabaseId: config.notionDatabaseId || '',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { notionApiKey, notionDatabaseId } = await request.json();

    if (!notionApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'Both Notion Integration Token and Database ID are required.' },
        { status: 400 }
      );
    }

    // Validate credentials against Notion API
    const isValid = await validateNotionConnection(notionApiKey, notionDatabaseId);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Connection failed. Please check your Notion API Token, Database ID, and ensure the integration is shared with the database.' },
        { status: 400 }
      );
    }

    saveConfig({ notionApiKey, notionDatabaseId });

    return NextResponse.json({ success: true, message: 'Notion configuration saved and verified successfully!' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
