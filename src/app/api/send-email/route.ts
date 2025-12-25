import { NextResponse } from 'next/server';
import { sendShareEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Rate Limit Check
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { allowed } = await checkRateLimit(ip, 'send-email', 10, 3600); // 10 requests per hour

    if (!allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { email, link } = await request.json();

    if (!email || !link) {
      return NextResponse.json({ error: 'Email and link are required' }, { status: 400 });
    }

    const { data, error } = await sendShareEmail(email, link);

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error: any) {
    console.error("Email Route Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
