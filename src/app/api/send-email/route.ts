import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const { email, link } = await request.json();

    if (!email || !link) {
      return NextResponse.json({ error: 'Email and link are required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY environment variable");
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const { data, error } = await resend.emails.send({
      from: 'Drop <drop@operational.ciphera.net>', // UPDATE THIS once you verify your own domain in Resend
      to: [email],
      subject: 'A secure file has been shared with you',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>File Shared via Drop</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
              .footer { margin-top: 30px; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="container">
              <h2>File Shared via Drop</h2>
              <p>Someone has shared a secure, encrypted file with you.</p>
              <p>You can download it securely using the link below:</p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${link}" class="button">Download File</a>
              </p>
              <p style="font-size: 14px; color: #555;">
                Or copy and paste this link into your browser:<br>
                <a href="${link}" style="color: #f97316;">${link}</a>
              </p>
              <div class="footer">
                <p><strong>Security Notice:</strong> This link contains the decryption key fragment (after the #). Do not share this link publicly if you want to keep the file private.</p>
                <p>© ${new Date().getFullYear()} Ciphera Drop. End-to-end encrypted file sharing.</p>
              </div>
            </div>
          </body>
        </html>
      `
    });

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
