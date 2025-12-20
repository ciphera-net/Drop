import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, link } = await request.json();

    // Placeholder for Email Service (Resend, SendGrid, etc.)
    // Since we don't have an API key configured, we will log it.
    console.log(`[Email Service] Sending link ${link} to ${email}`);

    // Example implementation with Resend:
    // await resend.emails.send({
    //   from: 'Drop <noreply@ciphera.net>',
    //   to: email,
    //   subject: 'File shared with you via Drop',
    //   html: `<p>Someone shared a file with you: <a href="${link}">${link}</a></p>`
    // });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

