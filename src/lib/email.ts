import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const NOTIFICATION_EMAIL = 'Drop <drop@operational.ciphera.net>';
const AUTH_EMAIL = 'Drop <drop@auth.ciphera.net>';

export async function sendOtpEmail(email: string, otp: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return await resend.emails.send({
    from: AUTH_EMAIL,
    to: [email],
    subject: 'Your Verification Code',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Your Verification Code</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .otp-box { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; }
            .otp-code { font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #f97316; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
            h2 { color: #111; margin-bottom: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="color: #f97316;">Verify Your Account</h2>
            <p>Please use the verification code below to complete your sign-in.</p>
            
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>

            <p style="text-align: center; font-size: 14px; color: #666;">
               This code will expire in 10 minutes.
            </p>

            <div class="footer">
              <p>If you didn't request this code, you can safely ignore this email.</p>
              <p>© ${new Date().getFullYear()} Ciphera Drop. End-to-end encrypted file sharing.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
}

export async function sendShareEmail(email: string, link: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  return await resend.emails.send({
    from: NOTIFICATION_EMAIL,
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
}

export async function sendDownloadNotification(email: string, fileId: string, ip?: string, userAgent?: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const time = new Date().toLocaleString('en-US', { timeZone: 'UTC', timeZoneName: 'short' });

  return await resend.emails.send({
    from: NOTIFICATION_EMAIL,
    to: [email],
    subject: 'Your file has been downloaded',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>File Download Notification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .info-box { background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 25px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
            h2 { color: #111; margin-bottom: 20px; }
            .label { color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
            .value { color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; }
            .file-id { background-color: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="color: #f97316;">File Downloaded</h2>
            <p>A secure file you shared via Drop has just been downloaded.</p>
            
            <div class="info-box">
              <div style="margin-bottom: 15px;">
                <div class="label">File ID</div>
                <div class="value">${fileId}</div>
              </div>
              <div style="margin-bottom: 15px;">
                <div class="label">Time</div>
                <div class="value">${time}</div>
              </div>
              ${ip ? `
              <div style="margin-bottom: 15px;">
                <div class="label">IP Address</div>
                <div class="value">${ip}</div>
              </div>` : ''}
              ${userAgent ? `
              <div>
                <div class="label">Device / User Agent</div>
                <div class="value" style="font-size: 13px;">${userAgent}</div>
              </div>` : ''}
            </div>

            <div class="footer">
              <p>You are receiving this email because you requested a notification for this file transfer.</p>
              <p>© ${new Date().getFullYear()} Ciphera Drop. End-to-end encrypted file sharing.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
}

export async function sendUploadNotification(email: string, requestName: string, fileName: string) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY");
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard` : '#';

  return await resend.emails.send({
    from: NOTIFICATION_EMAIL,
    to: [email],
    subject: `New File Uploaded: ${requestName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>New File Received</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .info-box { background-color: #fff7ed; border: 1px solid #fed7aa; padding: 20px; border-radius: 8px; margin: 25px 0; }
            .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
            h2 { color: #111; margin-bottom: 20px; }
            .label { color: #666; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; }
            .value { color: #111; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 14px; }
            .button { display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2 style="color: #f97316;">New File Received</h2>
            <p>A new file has been uploaded to your request <strong>"${requestName}"</strong>.</p>
            
            <div class="info-box">
              <div style="margin-bottom: 15px;">
                <div class="label">File Name</div>
                <div class="value">${fileName || 'Encrypted File'}</div>
              </div>
            </div>

            <p style="text-align: center; margin: 30px 0;">
               <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </p>
            <p style="text-align: center; font-size: 14px; color: #666;">
               Log in to your dashboard to decrypt and download it.
            </p>

            <div class="footer">
              <p>You are receiving this email because you enabled notifications for this file request.</p>
              <p>© ${new Date().getFullYear()} Ciphera Drop. End-to-end encrypted file sharing.</p>
            </div>
          </div>
        </body>
      </html>
    `
  });
}
