import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/db';
import { validateNotionConnection } from '@/lib/notion';
import { verifyAuth, unauthorizedResponse } from '@/lib/auth';

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const config = getConfig();
    return NextResponse.json({
      configured: !!(config.notionApiKey && config.notionDatabaseId),
      notionDatabaseId: config.notionDatabaseId || '',
      discordWebhookUrl: config.discordWebhookUrl || '',
      slackWebhookUrl: config.slackWebhookUrl || '',
      lineChannelAccessToken: config.lineChannelAccessToken || '',
      lineUserId: config.lineUserId || '',
      notificationEnabled: config.notificationEnabled || false,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve configuration' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!verifyAuth(request)) {
    return unauthorizedResponse();
  }
  try {
    const {
      notionApiKey,
      notionDatabaseId,
      discordWebhookUrl,
      slackWebhookUrl,
      lineChannelAccessToken,
      lineUserId,
      notificationEnabled
    } = await request.json();

    let finalApiKey = notionApiKey;
    const existingConfig = getConfig();

    if (!finalApiKey && existingConfig.notionApiKey) {
      finalApiKey = existingConfig.notionApiKey;
    }

    if (!finalApiKey || !notionDatabaseId) {
      return NextResponse.json(
        { error: 'Both Notion Integration Token and Database ID are required.' },
        { status: 400 }
      );
    }

    // Validate credentials against Notion API
    const isValid = await validateNotionConnection(finalApiKey, notionDatabaseId);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Connection failed. Please check your Notion API Token, Database ID, and ensure the integration is shared with the database.' },
        { status: 400 }
      );
    }

    saveConfig({
      notionApiKey: finalApiKey,
      notionDatabaseId,
      discordWebhookUrl: discordWebhookUrl || '',
      slackWebhookUrl: slackWebhookUrl || '',
      lineChannelAccessToken: lineChannelAccessToken || '',
      lineUserId: lineUserId || '',
      notificationEnabled: !!notificationEnabled,
    });

    return NextResponse.json({ success: true, message: 'Configuration saved and verified successfully!' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
  }
}
