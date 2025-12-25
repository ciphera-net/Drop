import { createAdminClient } from '@/utils/supabase/admin';

type SlackColor = '#36a64f' | '#ff0000' | '#ffcc00'; // Green, Red, Yellow

interface SlackField {
  title: string;
  value: string;
  short?: boolean;
}

export async function sendSlackAlert(
  title: string,
  message: string,
  color: SlackColor = '#36a64f',
  fields?: SlackField[]
) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('SLACK_WEBHOOK_URL is not defined. Skipping Slack notification.');
    return;
  }

  const payload = {
    username: 'Drop Monitor',
    icon_emoji: ':shield:',
    attachments: [
      {
        color: color,
        title: title,
        text: message,
        fields: fields || [],
        footer: `Ciphera Drop | ${new Date().toISOString()}`,
        mrkdwn_in: ["text", "fields"]
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error('Failed to send Slack alert:', await response.text());
    }
  } catch (error) {
    console.error('Error sending Slack alert:', error);
  }
}

