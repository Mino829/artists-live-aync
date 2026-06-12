import { NextResponse } from 'next/server';
import { sendTestNotification } from '@/lib/notification';

export async function POST(request: Request) {
  try {
    const config = await request.json();
    
    // Validate we have at least one notification method configured
    if (!config.discordWebhookUrl && !config.slackWebhookUrl && !(config.lineChannelAccessToken && config.lineUserId)) {
      return NextResponse.json(
        { error: 'At least one notification method (Discord, Slack, or LINE) must be configured to send a test.' },
        { status: 400 }
      );
    }

    await sendTestNotification(config);

    return NextResponse.json({ success: true, message: 'Test notification sent successfully!' });
  } catch (error: any) {
    console.error('Failed to send test notification:', error);
    return NextResponse.json(
      { error: `Failed to send test notification: ${error.message || error}` },
      { status: 500 }
    );
  }
}
