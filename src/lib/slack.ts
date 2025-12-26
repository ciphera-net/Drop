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
  fields?: SlackField[],
  webhookUrlOverride?: string
) {
  // Use override if provided, otherwise fall back to default env var
  const webhookUrl = webhookUrlOverride || process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('Slack webhook URL is not defined. Skipping Slack notification.');
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

export async function sendNewUserAlert(email: string) {
  const webhookUrl = process.env.SLACK_NEW_USER_WEBHOOK_URL;

  if (!webhookUrl) {
    console.warn('SLACK_NEW_USER_WEBHOOK_URL is not defined. Skipping New User notification.');
    return;
  }

  await sendSlackAlert(
    'New User Signup',
    `A new user just signed up to Ciphera Drop.`,
    '#36a64f',
    [{ title: 'Email', value: email, short: true }],
    webhookUrl
  );
}
