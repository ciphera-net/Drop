'use server'

import { sendNewUserAlert } from '@/lib/slack';

export async function notifyNewUserSignup(email: string) {
  try {
    await sendNewUserAlert(email);
  } catch (error) {
    // Log error but don't crash the UI for the user
    console.error('Failed to notify Slack about new user:', error);
  }
}

