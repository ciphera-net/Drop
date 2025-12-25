import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendSlackAlert } from '@/lib/slack';

export async function POST(request: Request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    
    // Rate Limit Check
    // Allow 20 attempts per hour (generous for typos, tight for brute force)
    const { allowed } = await checkRateLimit(ip, 'resolve-magic-words', 20, 3600); 

    if (!allowed) {
      // 🚨 BRUTE FORCE ALERT
      await sendSlackAlert(
        'Security Alert: Brute Force Blocked',
        `Blocked IP ${ip} from resolving magic words after exceeding limit.`,
        '#ff0000',
        [
          { title: 'IP Address', value: ip, short: true },
          { title: 'Action', value: 'resolve-magic-words', short: true }
        ]
      );
      return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });
    }

    const { words } = await request.json();
    
    if (!words) {
      return NextResponse.json({ error: 'Words are required' }, { status: 400 });
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('uploads')
      .select('id')
      .eq('magic_words', words)
      .single();

    if (error || !data) {
      // Optional: Log failed attempts (probing)
      // await sendSlackAlert('Probing Alert', `IP ${ip} tried unknown words: ${words}`, '#ffcc00');
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
