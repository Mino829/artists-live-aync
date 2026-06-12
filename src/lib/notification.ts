export interface NotificationEvent {
  artistName: string;
  title: string;
  date: string;
  venue: string;
  link: string;
}

export async function sendNotifications(config: any, events: NotificationEvent[]) {
  if (!config.notificationEnabled || events.length === 0) return;

  for (const event of events) {
    // 1. Discord Webhook
    if (config.discordWebhookUrl) {
      try {
        await fetch(config.discordWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'Live Sync Bot',
            embeds: [
              {
                title: `🎵 新着ライブ情報: ${event.artistName}`,
                description: `**${event.title}**`,
                color: 9646970, // Purple (0x9333ea in decimal: 9646970)
                fields: [
                  { name: '開催日', value: event.date || 'TBA', inline: true },
                  { name: '会場', value: event.venue || 'TBA', inline: true },
                ],
                url: event.link,
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      } catch (err) {
        console.error('Failed to send Discord notification:', err);
      }
    }

    // 2. Slack Webhook
    if (config.slackWebhookUrl) {
      try {
        await fetch(config.slackWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `🎵 *新着ライブ情報: ${event.artistName}*\n*<${event.link}|${event.title}>*`,
                },
              },
              {
                type: 'section',
                fields: [
                  { type: 'mrkdwn', text: `*開催日:*\n${event.date || 'TBA'}` },
                  { type: 'mrkdwn', text: `*会場:*\n${event.venue || 'TBA'}` },
                ],
              },
            ],
          }),
        });
      } catch (err) {
        console.error('Failed to send Slack notification:', err);
      }
    }

    // 3. LINE Messaging API
    if (config.lineChannelAccessToken && config.lineUserId) {
      try {
        await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.lineChannelAccessToken}`,
          },
          body: JSON.stringify({
            to: config.lineUserId,
            messages: [
              {
                type: 'text',
                text: `🎵 新着ライブ情報: ${event.artistName}\n\n【公演名】\n${event.title}\n\n【開催日】\n${event.date || 'TBA'}\n\n【会場】\n${event.venue || 'TBA'}\n\n詳細リンク:\n${event.link}`,
              },
            ],
          }),
        });
      } catch (err) {
        console.error('Failed to send LINE notification:', err);
      }
    }
  }
}

export async function sendTestNotification(config: any) {
  const testEvent: NotificationEvent = {
    artistName: 'テストアーティスト',
    title: 'テストライブ公演 2026',
    date: '2026年12月31日',
    venue: '東京ドーム',
    link: 'https://example.com',
  };
  
  // Create a copy of config with notificationEnabled true so the test works even if currently disabled
  const testConfig = { ...config, notificationEnabled: true };
  await sendNotifications(testConfig, [testEvent]);
}
